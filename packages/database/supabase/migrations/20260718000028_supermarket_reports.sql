-- Supermarket profitability reports with immutable cost snapshots and branch consolidation.

WITH permission_definitions(name, description) AS (
  VALUES
    ('supermarket.reports.read', 'View supermarket sales and profitability reports'),
    ('supermarket.reports.export', 'Export supermarket management reports')
)
INSERT INTO public.permissions(module_id, name, description)
SELECT m.id, d.name, d.description
FROM permission_definitions d
JOIN public.modules m ON m.code = 'barcode_scanner'
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

CREATE TABLE IF NOT EXISTS public.supermarket_sale_cost_snapshots (
  sale_item_id UUID PRIMARY KEY REFERENCES public.sale_items(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE RESTRICT NOT NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
  quantity NUMERIC(14, 3) NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(14, 4) NOT NULL CHECK (unit_cost >= 0),
  total_cost NUMERIC(16, 4) NOT NULL CHECK (total_cost >= 0),
  captured_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_supermarket_cost_snapshots_report
  ON public.supermarket_sale_cost_snapshots(company_id, branch_id, sale_id, product_id);
CREATE INDEX IF NOT EXISTS idx_supermarket_sale_requests_report
  ON public.supermarket_sale_requests(company_id, branch_id, created_at, sale_id);

ALTER TABLE public.supermarket_sale_cost_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Supermarket sale costs by company" ON public.supermarket_sale_cost_snapshots;
CREATE POLICY "Supermarket sale costs by company" ON public.supermarket_sale_cost_snapshots FOR SELECT
  USING (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket');

CREATE OR REPLACE FUNCTION public.supermarket_capture_sale_costs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.supermarket_sale_cost_snapshots(
    sale_item_id, company_id, branch_id, sale_id, product_id,
    quantity, unit_cost, total_cost, captured_at
  )
  SELECT
    si.id, NEW.company_id, NEW.branch_id, NEW.sale_id, si.product_id,
    si.quantity, p.cost, ROUND(si.quantity * p.cost, 4), NEW.created_at
  FROM public.sale_items si
  JOIN public.products p ON p.id = si.product_id AND p.company_id = NEW.company_id
  WHERE si.company_id = NEW.company_id AND si.sale_id = NEW.sale_id
  ON CONFLICT (sale_item_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS supermarket_capture_sale_costs_trigger ON public.supermarket_sale_requests;
CREATE TRIGGER supermarket_capture_sale_costs_trigger
  AFTER INSERT ON public.supermarket_sale_requests
  FOR EACH ROW EXECUTE FUNCTION public.supermarket_capture_sale_costs();

-- Existing sales receive the best available baseline; all future sales are immutable snapshots.
INSERT INTO public.supermarket_sale_cost_snapshots(
  sale_item_id, company_id, branch_id, sale_id, product_id,
  quantity, unit_cost, total_cost, captured_at
)
SELECT
  si.id, r.company_id, r.branch_id, r.sale_id, si.product_id,
  si.quantity, p.cost, ROUND(si.quantity * p.cost, 4), r.created_at
FROM public.supermarket_sale_requests r
JOIN public.sale_items si ON si.sale_id = r.sale_id AND si.company_id = r.company_id
JOIN public.products p ON p.id = si.product_id AND p.company_id = r.company_id
ON CONFLICT (sale_item_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.supermarket_sales_report(
  p_company_id UUID,
  p_branch_id UUID,
  p_from TIMESTAMP WITH TIME ZONE,
  p_to TIMESTAMP WITH TIME ZONE
) RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_summary JSONB;
  v_daily JSONB;
  v_payments JSONB;
  v_categories JSONB;
  v_products JSONB;
  v_branches JSONB;
  v_previous_sales NUMERIC(16, 2) := 0;
  v_previous_profit NUMERIC(16, 2) := 0;
  v_period INTERVAL;
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_from >= p_to OR p_to - p_from > INTERVAL '366 days' THEN
    RAISE EXCEPTION 'INVALID_REPORT_PERIOD';
  END IF;
  IF p_branch_id IS NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.companies c
      JOIN public.business_types bt ON bt.id = c.business_type_id
      WHERE c.id = p_company_id AND c.status = 'active' AND bt.code = 'supermarket'
    ) THEN RAISE EXCEPTION 'INVALID_SUPERMARKET_COMPANY'; END IF;
  ELSE
    PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  END IF;
  v_period := p_to - p_from;

  WITH previous_sales AS (
    SELECT s.id, s.subtotal, s.total
    FROM public.supermarket_sale_requests r
    JOIN public.sales s ON s.id = r.sale_id AND s.company_id = r.company_id
    WHERE r.company_id = p_company_id
      AND (p_branch_id IS NULL OR r.branch_id = p_branch_id)
      AND r.created_at >= p_from - v_period AND r.created_at < p_from
  ), previous_costs AS (
    SELECT sc.sale_id, SUM(sc.total_cost) AS cost
    FROM public.supermarket_sale_cost_snapshots sc
    JOIN previous_sales ps ON ps.id = sc.sale_id
    WHERE sc.company_id = p_company_id
    GROUP BY sc.sale_id
  )
  SELECT COALESCE(SUM(ps.total), 0), COALESCE(SUM(ps.subtotal - COALESCE(pc.cost, 0)), 0)
  INTO v_previous_sales, v_previous_profit
  FROM previous_sales ps
  LEFT JOIN previous_costs pc ON pc.sale_id = ps.id;

  WITH scoped_sales AS (
    SELECT r.sale_id, r.branch_id, r.created_at, s.subtotal, s.discount, s.tax_amount, s.total
    FROM public.supermarket_sale_requests r
    JOIN public.sales s ON s.id = r.sale_id AND s.company_id = r.company_id
    WHERE r.company_id = p_company_id
      AND (p_branch_id IS NULL OR r.branch_id = p_branch_id)
      AND r.created_at >= p_from AND r.created_at < p_to
  ), sale_costs AS (
    SELECT sc.sale_id, SUM(sc.total_cost) AS cost, COUNT(*) AS costed_lines
    FROM public.supermarket_sale_cost_snapshots sc
    JOIN scoped_sales ss ON ss.sale_id = sc.sale_id
    WHERE sc.company_id = p_company_id
    GROUP BY sc.sale_id
  ), sales_summary AS (
    SELECT COALESCE(SUM(ss.total), 0) AS sales_total,
      COALESCE(SUM(ss.subtotal), 0) AS net_total,
      COALESCE(SUM(ss.tax_amount), 0) AS tax_total,
      COALESCE(SUM(ss.discount), 0) AS discount_total,
      COUNT(*) AS tickets,
      COALESCE(SUM(sc.cost), 0) AS cost_total,
      COALESCE(SUM(sc.costed_lines), 0) AS costed_lines
    FROM scoped_sales ss LEFT JOIN sale_costs sc ON sc.sale_id = ss.sale_id
  ), line_summary AS (
    SELECT COUNT(*) AS total_lines
    FROM public.sale_items si JOIN scoped_sales ss ON ss.sale_id = si.sale_id
    WHERE si.company_id = p_company_id
  ), return_summary AS (
    SELECT COUNT(*) AS returns_count, COALESCE(SUM(sr.quantity * sr.unit_price), 0) AS returns_value
    FROM public.supermarket_returns sr
    WHERE sr.company_id = p_company_id
      AND (p_branch_id IS NULL OR sr.branch_id = p_branch_id)
      AND sr.created_at >= p_from AND sr.created_at < p_to
  )
  SELECT jsonb_build_object(
    'salesTotal', ROUND(sales_total, 2), 'netTotal', ROUND(net_total, 2),
    'taxTotal', ROUND(tax_total, 2), 'discountTotal', ROUND(discount_total, 2),
    'costTotal', ROUND(cost_total, 2), 'grossProfit', ROUND(net_total - cost_total, 2),
    'marginPercent', CASE WHEN net_total > 0 THEN ROUND((net_total - cost_total) * 100 / net_total, 2) ELSE 0 END,
    'tickets', tickets, 'averageTicket', CASE WHEN tickets > 0 THEN ROUND(sales_total / tickets, 2) ELSE 0 END,
    'previousSalesTotal', ROUND(v_previous_sales, 2), 'previousGrossProfit', ROUND(v_previous_profit, 2),
    'returnsCount', returns_count, 'returnsValue', ROUND(returns_value, 2),
    'costedLines', costed_lines, 'totalLines', total_lines,
    'costCoveragePercent', CASE WHEN total_lines > 0 THEN ROUND(costed_lines * 100.0 / total_lines, 2) ELSE 100 END
  ) INTO v_summary
  FROM sales_summary, line_summary, return_summary;

  WITH sale_costs AS (
    SELECT sale_id, SUM(total_cost) AS cost
    FROM public.supermarket_sale_cost_snapshots WHERE company_id = p_company_id GROUP BY sale_id
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(day_row) ORDER BY day_row.day), '[]'::jsonb) INTO v_daily
  FROM (
    SELECT to_char(r.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD') AS day,
      ROUND(SUM(s.total), 2) AS sales, ROUND(SUM(COALESCE(sc.cost, 0)), 2) AS cost,
      ROUND(SUM(s.subtotal - COALESCE(sc.cost, 0)), 2) AS profit, COUNT(*) AS tickets
    FROM public.supermarket_sale_requests r
    JOIN public.sales s ON s.id = r.sale_id AND s.company_id = r.company_id
    LEFT JOIN sale_costs sc ON sc.sale_id = r.sale_id
    WHERE r.company_id = p_company_id AND (p_branch_id IS NULL OR r.branch_id = p_branch_id)
      AND r.created_at >= p_from AND r.created_at < p_to
    GROUP BY 1
  ) day_row;

  SELECT COALESCE(jsonb_agg(to_jsonb(payment_row) ORDER BY payment_row.amount DESC), '[]'::jsonb) INTO v_payments
  FROM (
    SELECT r.payment_method AS method, ROUND(SUM(r.total), 2) AS amount, COUNT(*) AS tickets
    FROM public.supermarket_sale_requests r
    WHERE r.company_id = p_company_id AND (p_branch_id IS NULL OR r.branch_id = p_branch_id)
      AND r.created_at >= p_from AND r.created_at < p_to
    GROUP BY r.payment_method
  ) payment_row;

  SELECT COALESCE(jsonb_agg(to_jsonb(category_row) ORDER BY category_row."netSales" DESC), '[]'::jsonb) INTO v_categories
  FROM (
    SELECT sp.category,
      ROUND(SUM(si.quantity), 3) AS quantity,
      ROUND(SUM(si.subtotal / (1 + si.tax_rate / 100)), 2) AS "netSales",
      ROUND(SUM(COALESCE(sc.total_cost, 0)), 2) AS cost,
      ROUND(SUM(si.subtotal / (1 + si.tax_rate / 100) - COALESCE(sc.total_cost, 0)), 2) AS profit,
      CASE WHEN SUM(si.subtotal) > 0 THEN ROUND(
        SUM(si.subtotal / (1 + si.tax_rate / 100) - COALESCE(sc.total_cost, 0)) * 100
        / SUM(si.subtotal / (1 + si.tax_rate / 100)), 2) ELSE 0 END AS "marginPercent"
    FROM public.supermarket_sale_requests r
    JOIN public.sale_items si ON si.sale_id = r.sale_id AND si.company_id = r.company_id
    JOIN public.supermarket_products sp ON sp.product_id = si.product_id AND sp.company_id = r.company_id
    LEFT JOIN public.supermarket_sale_cost_snapshots sc ON sc.sale_item_id = si.id
    WHERE r.company_id = p_company_id AND (p_branch_id IS NULL OR r.branch_id = p_branch_id)
      AND r.created_at >= p_from AND r.created_at < p_to
    GROUP BY sp.category
  ) category_row;

  SELECT COALESCE(jsonb_agg(to_jsonb(product_row) ORDER BY product_row."netSales" DESC), '[]'::jsonb) INTO v_products
  FROM (
    SELECT si.product_id AS "productId", p.name, sp.category,
      ROUND(SUM(si.quantity), 3) AS quantity,
      ROUND(SUM(si.subtotal / (1 + si.tax_rate / 100)), 2) AS "netSales",
      ROUND(SUM(COALESCE(sc.total_cost, 0)), 2) AS cost,
      ROUND(SUM(si.subtotal / (1 + si.tax_rate / 100) - COALESCE(sc.total_cost, 0)), 2) AS profit,
      CASE WHEN SUM(si.subtotal) > 0 THEN ROUND(
        SUM(si.subtotal / (1 + si.tax_rate / 100) - COALESCE(sc.total_cost, 0)) * 100
        / SUM(si.subtotal / (1 + si.tax_rate / 100)), 2) ELSE 0 END AS "marginPercent"
    FROM public.supermarket_sale_requests r
    JOIN public.sale_items si ON si.sale_id = r.sale_id AND si.company_id = r.company_id
    JOIN public.products p ON p.id = si.product_id AND p.company_id = r.company_id
    JOIN public.supermarket_products sp ON sp.product_id = si.product_id AND sp.company_id = r.company_id
    LEFT JOIN public.supermarket_sale_cost_snapshots sc ON sc.sale_item_id = si.id
    WHERE r.company_id = p_company_id AND (p_branch_id IS NULL OR r.branch_id = p_branch_id)
      AND r.created_at >= p_from AND r.created_at < p_to
    GROUP BY si.product_id, p.name, sp.category
    ORDER BY "netSales" DESC LIMIT 100
  ) product_row;

  WITH sale_costs AS (
    SELECT sale_id, SUM(total_cost) AS cost
    FROM public.supermarket_sale_cost_snapshots WHERE company_id = p_company_id GROUP BY sale_id
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(branch_row) ORDER BY branch_row.sales DESC), '[]'::jsonb) INTO v_branches
  FROM (
    SELECT r.branch_id AS "branchId", b.name, ROUND(SUM(s.total), 2) AS sales,
      ROUND(SUM(COALESCE(sc.cost, 0)), 2) AS cost,
      ROUND(SUM(s.subtotal - COALESCE(sc.cost, 0)), 2) AS profit,
      CASE WHEN SUM(s.subtotal) > 0 THEN ROUND(SUM(s.subtotal - COALESCE(sc.cost, 0)) * 100 / SUM(s.subtotal), 2) ELSE 0 END AS "marginPercent",
      COUNT(*) AS tickets
    FROM public.supermarket_sale_requests r
    JOIN public.sales s ON s.id = r.sale_id AND s.company_id = r.company_id
    JOIN public.branches b ON b.id = r.branch_id AND b.company_id = r.company_id
    LEFT JOIN sale_costs sc ON sc.sale_id = r.sale_id
    WHERE r.company_id = p_company_id AND (p_branch_id IS NULL OR r.branch_id = p_branch_id)
      AND r.created_at >= p_from AND r.created_at < p_to
    GROUP BY r.branch_id, b.name
  ) branch_row;

  RETURN jsonb_build_object(
    'from', p_from, 'to', p_to, 'branchId', p_branch_id,
    'summary', v_summary, 'daily', v_daily, 'payments', v_payments,
    'categories', v_categories, 'products', v_products, 'branches', v_branches
  );
END;
$$;

REVOKE ALL ON FUNCTION public.supermarket_capture_sale_costs() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.supermarket_sales_report(UUID, UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.supermarket_sales_report(UUID, UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE)
  TO service_role;

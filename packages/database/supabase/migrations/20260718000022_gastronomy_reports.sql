-- Scalable gastronomy management reports built from settled sales.

WITH permission_definitions(name, description) AS (
  VALUES
    ('gastronomy.reports.read', 'View gastronomy sales and payment reports'),
    ('gastronomy.reports.export', 'Export gastronomy management reports')
)
INSERT INTO public.permissions(module_id, name, description)
SELECT m.id, d.name, d.description
FROM permission_definitions d
JOIN public.modules m ON m.code = 'gastronomy_tables'
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

CREATE INDEX IF NOT EXISTS idx_gastronomy_settlements_report_period
  ON public.gastronomy_settlements(company_id, branch_id, created_at, sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_report_sale
  ON public.sale_items(company_id, sale_id, product_id);

CREATE OR REPLACE FUNCTION public.gastronomy_sales_report(
  p_company_id UUID,
  p_branch_id UUID,
  p_from TIMESTAMP WITH TIME ZONE,
  p_to TIMESTAMP WITH TIME ZONE
) RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_summary JSONB;
  v_daily JSONB;
  v_payments JSONB;
  v_products JSONB;
  v_fiscal JSONB;
  v_previous_sales NUMERIC(16, 2) := 0;
  v_period INTERVAL;
BEGIN
  IF p_from >= p_to OR p_to - p_from > INTERVAL '366 days' THEN
    RAISE EXCEPTION 'INVALID_REPORT_PERIOD';
  END IF;
  v_period := p_to - p_from;

  SELECT COALESCE(sum(sale_total), 0)
  INTO v_previous_sales
  FROM public.gastronomy_settlements
  WHERE company_id = p_company_id AND branch_id = p_branch_id
    AND created_at >= p_from - v_period AND created_at < p_from;

  SELECT jsonb_build_object(
    'salesTotal', COALESCE(sum(sale_total), 0),
    'netTotal', COALESCE(sum(subtotal), 0),
    'taxTotal', COALESCE(sum(tax_amount), 0),
    'tipsTotal', COALESCE(sum(tip_amount), 0),
    'chargedTotal', COALESCE(sum(charged_total), 0),
    'settlementsCount', count(*),
    'averageTicket', CASE WHEN count(*) > 0 THEN round(sum(sale_total) / count(*), 2) ELSE 0 END,
    'previousSalesTotal', v_previous_sales
  ) INTO v_summary
  FROM public.gastronomy_settlements
  WHERE company_id = p_company_id AND branch_id = p_branch_id
    AND created_at >= p_from AND created_at < p_to;

  SELECT COALESCE(jsonb_agg(to_jsonb(day_row) ORDER BY day_row.day), '[]'::jsonb)
  INTO v_daily
  FROM (
    SELECT to_char(created_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD') AS day,
      round(sum(sale_total), 2) AS sales,
      round(sum(tip_amount), 2) AS tips,
      count(*) AS settlements
    FROM public.gastronomy_settlements
    WHERE company_id = p_company_id AND branch_id = p_branch_id
      AND created_at >= p_from AND created_at < p_to
    GROUP BY 1
  ) day_row;

  SELECT COALESCE(jsonb_agg(to_jsonb(payment_row) ORDER BY payment_row.amount DESC), '[]'::jsonb)
  INTO v_payments
  FROM (
    SELECT sp.payment_method AS method,
      round(sum(sp.amount), 2) AS amount,
      count(*) AS payments
    FROM public.gastronomy_settlement_payments sp
    JOIN public.gastronomy_settlements s
      ON s.id = sp.settlement_id AND s.company_id = p_company_id
    WHERE sp.company_id = p_company_id AND s.branch_id = p_branch_id
      AND s.created_at >= p_from AND s.created_at < p_to
    GROUP BY sp.payment_method
  ) payment_row;

  SELECT COALESCE(jsonb_agg(to_jsonb(product_row) ORDER BY product_row.total DESC), '[]'::jsonb)
  INTO v_products
  FROM (
    SELECT si.product_id AS "productId", p.name,
      round(sum(si.quantity), 3) AS quantity,
      round(sum(si.subtotal), 2) AS total
    FROM public.gastronomy_settlements s
    JOIN public.sale_items si
      ON si.sale_id = s.sale_id AND si.company_id = p_company_id
    JOIN public.products p
      ON p.id = si.product_id AND p.company_id = p_company_id
    WHERE s.company_id = p_company_id AND s.branch_id = p_branch_id
      AND s.created_at >= p_from AND s.created_at < p_to
    GROUP BY si.product_id, p.name
    ORDER BY total DESC
    LIMIT 10
  ) product_row;

  SELECT COALESCE(jsonb_agg(to_jsonb(fiscal_row) ORDER BY fiscal_row.status), '[]'::jsonb)
  INTO v_fiscal
  FROM (
    SELECT fiscal_status AS status, count(*) AS count,
      round(sum(sale_total), 2) AS total
    FROM public.gastronomy_settlements
    WHERE company_id = p_company_id AND branch_id = p_branch_id
      AND created_at >= p_from AND created_at < p_to
    GROUP BY fiscal_status
  ) fiscal_row;

  RETURN jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'summary', v_summary,
    'daily', v_daily,
    'payments', v_payments,
    'topProducts', v_products,
    'fiscal', v_fiscal
  );
END;
$$;

REVOKE ALL ON FUNCTION public.gastronomy_sales_report(UUID, UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gastronomy_sales_report(UUID, UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE)
  TO service_role;

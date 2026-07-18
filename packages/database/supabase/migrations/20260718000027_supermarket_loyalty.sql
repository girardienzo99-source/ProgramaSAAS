-- Supermarket loyalty: customers, campaigns, rewards and auditable point movements.

WITH permission_definitions(name, description) AS (
  VALUES
    ('supermarket.loyalty.read', 'View supermarket loyalty customers and movements'),
    ('supermarket.loyalty.customers.write', 'Create and update supermarket loyalty customers'),
    ('supermarket.loyalty.campaigns.manage', 'Manage supermarket loyalty campaigns'),
    ('supermarket.loyalty.rewards.manage', 'Manage supermarket loyalty rewards'),
    ('supermarket.loyalty.points.earn', 'Credit points for supermarket purchases'),
    ('supermarket.loyalty.points.redeem', 'Redeem supermarket loyalty rewards'),
    ('supermarket.loyalty.points.adjust', 'Adjust supermarket loyalty balances')
)
INSERT INTO public.permissions(module_id, name, description)
SELECT m.id, d.name, d.description
FROM permission_definitions d
JOIN public.modules m ON m.code = 'loyalty'
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

CREATE TABLE IF NOT EXISTS public.supermarket_loyalty_customers (
  client_id UUID PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  phone_normalized VARCHAR(30) NOT NULL,
  document_number VARCHAR(30),
  birth_date DATE,
  points_balance INTEGER DEFAULT 0 NOT NULL CHECK (points_balance >= 0),
  lifetime_points INTEGER DEFAULT 0 NOT NULL CHECK (lifetime_points >= 0),
  tier VARCHAR(20) DEFAULT 'bronze' NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold')),
  marketing_consent BOOLEAN DEFAULT false NOT NULL,
  active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(company_id, phone_normalized)
);

CREATE TABLE IF NOT EXISTS public.supermarket_loyalty_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(120) NOT NULL,
  benefit_type VARCHAR(30) NOT NULL CHECK (benefit_type IN ('points_multiplier', 'fixed_points', 'percent_discount')),
  benefit_value NUMERIC(10, 2) NOT NULL CHECK (benefit_value > 0),
  minimum_purchase NUMERIC(14, 2) DEFAULT 0 NOT NULL CHECK (minimum_purchase >= 0),
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  active BOOLEAN DEFAULT true NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CHECK (ends_on >= starts_on)
);

CREATE TABLE IF NOT EXISTS public.supermarket_loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(240),
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  stock_limit INTEGER CHECK (stock_limit IS NULL OR stock_limit >= 0),
  redeemed_count INTEGER DEFAULT 0 NOT NULL CHECK (redeemed_count >= 0),
  image_url TEXT,
  active BOOLEAN DEFAULT true NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CHECK (stock_limit IS NULL OR redeemed_count <= stock_limit)
);

CREATE TABLE IF NOT EXISTS public.supermarket_loyalty_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE RESTRICT NOT NULL,
  customer_id UUID REFERENCES public.supermarket_loyalty_customers(client_id) ON DELETE RESTRICT NOT NULL,
  user_id UUID NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('earn', 'redeem', 'adjust')),
  points_delta INTEGER NOT NULL CHECK (points_delta <> 0),
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  purchase_amount NUMERIC(14, 2),
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.supermarket_loyalty_campaigns(id) ON DELETE SET NULL,
  reward_id UUID REFERENCES public.supermarket_loyalty_rewards(id) ON DELETE SET NULL,
  reference VARCHAR(180) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(company_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_supermarket_loyalty_customers_company
  ON public.supermarket_loyalty_customers(company_id, active, tier, client_id);
CREATE INDEX IF NOT EXISTS idx_supermarket_loyalty_campaigns_active
  ON public.supermarket_loyalty_campaigns(company_id, active, starts_on, ends_on);
CREATE INDEX IF NOT EXISTS idx_supermarket_loyalty_rewards_active
  ON public.supermarket_loyalty_rewards(company_id, active, points_cost);
CREATE INDEX IF NOT EXISTS idx_supermarket_loyalty_movements_customer
  ON public.supermarket_loyalty_movements(company_id, customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supermarket_loyalty_movements_branch
  ON public.supermarket_loyalty_movements(company_id, branch_id, created_at DESC);

ALTER TABLE public.supermarket_loyalty_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supermarket_loyalty_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supermarket_loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supermarket_loyalty_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supermarket loyalty customers by company" ON public.supermarket_loyalty_customers FOR ALL
  USING (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket')
  WITH CHECK (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket');
CREATE POLICY "Supermarket loyalty campaigns by company" ON public.supermarket_loyalty_campaigns FOR ALL
  USING (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket')
  WITH CHECK (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket');
CREATE POLICY "Supermarket loyalty rewards by company" ON public.supermarket_loyalty_rewards FOR ALL
  USING (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket')
  WITH CHECK (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket');
CREATE POLICY "Supermarket loyalty movements by company" ON public.supermarket_loyalty_movements FOR ALL
  USING (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket')
  WITH CHECK (company_id = public.jwt_company_id() AND public.jwt_business_type() = 'supermarket');

CREATE OR REPLACE FUNCTION public.supermarket_loyalty_assert_company(p_company_id UUID)
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.companies c
    JOIN public.business_types bt ON bt.id = c.business_type_id
    WHERE c.id = p_company_id AND c.status = 'active' AND bt.code = 'supermarket'
  ) THEN RAISE EXCEPTION 'INVALID_SUPERMARKET_COMPANY'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_list_loyalty_customers(p_company_id UUID)
RETURNS TABLE(
  id UUID, name TEXT, phone TEXT, email TEXT, document_number TEXT, birth_date DATE,
  points_balance INTEGER, lifetime_points INTEGER, tier TEXT,
  marketing_consent BOOLEAN, active BOOLEAN, last_movement_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM public.supermarket_loyalty_assert_company(p_company_id);
  RETURN QUERY
  SELECT c.id, c.name::TEXT, COALESCE(c.phone, '')::TEXT, COALESCE(c.email, '')::TEXT,
    COALESCE(lc.document_number, '')::TEXT, lc.birth_date, lc.points_balance,
    lc.lifetime_points, lc.tier::TEXT, lc.marketing_consent, lc.active, movement.created_at
  FROM public.supermarket_loyalty_customers lc
  JOIN public.clients c ON c.id = lc.client_id AND c.company_id = lc.company_id
  LEFT JOIN LATERAL (
    SELECT m.created_at FROM public.supermarket_loyalty_movements m
    WHERE m.company_id = lc.company_id AND m.customer_id = lc.client_id
    ORDER BY m.created_at DESC LIMIT 1
  ) movement ON true
  WHERE lc.company_id = p_company_id
  ORDER BY lc.active DESC, lc.points_balance DESC, c.name;
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_save_loyalty_customer(
  p_company_id UUID, p_user_id UUID, p_customer_id UUID, p_name TEXT, p_phone TEXT,
  p_email TEXT, p_document_number TEXT, p_birth_date DATE,
  p_marketing_consent BOOLEAN, p_active BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_customer_id UUID := p_customer_id;
  v_phone_normalized TEXT := regexp_replace(COALESCE(p_phone, ''), '[^0-9+]', '', 'g');
BEGIN
  PERFORM public.supermarket_loyalty_assert_company(p_company_id);
  IF trim(COALESCE(p_name, '')) = '' OR length(trim(p_name)) > 255
    OR length(v_phone_normalized) < 6 OR length(v_phone_normalized) > 30
    OR length(COALESCE(p_email, '')) > 100 OR length(COALESCE(p_document_number, '')) > 30 THEN
    RAISE EXCEPTION 'INVALID_LOYALTY_CUSTOMER';
  END IF;
  IF v_customer_id IS NULL THEN
    INSERT INTO public.clients(company_id, name, phone, email)
    VALUES (p_company_id, trim(p_name), trim(p_phone), NULLIF(lower(trim(p_email)), ''))
    RETURNING id INTO v_customer_id;
    INSERT INTO public.supermarket_loyalty_customers(
      client_id, company_id, phone_normalized, document_number, birth_date, marketing_consent, active
    ) VALUES (
      v_customer_id, p_company_id, v_phone_normalized, NULLIF(trim(p_document_number), ''),
      p_birth_date, p_marketing_consent, p_active
    );
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM public.supermarket_loyalty_customers
      WHERE client_id = v_customer_id AND company_id = p_company_id
    ) THEN RAISE EXCEPTION 'LOYALTY_CUSTOMER_NOT_FOUND'; END IF;
    UPDATE public.clients SET name = trim(p_name), phone = trim(p_phone),
      email = NULLIF(lower(trim(p_email)), '')
    WHERE id = v_customer_id AND company_id = p_company_id;
    UPDATE public.supermarket_loyalty_customers SET
      phone_normalized = v_phone_normalized, document_number = NULLIF(trim(p_document_number), ''),
      birth_date = p_birth_date, marketing_consent = p_marketing_consent,
      active = p_active, updated_at = timezone('utc'::text, now())
    WHERE client_id = v_customer_id AND company_id = p_company_id;
  END IF;
  RETURN v_customer_id;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'LOYALTY_PHONE_EXISTS';
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_list_loyalty_campaigns(p_company_id UUID)
RETURNS TABLE(
  id UUID, name TEXT, benefit_type TEXT, benefit_value NUMERIC, minimum_purchase NUMERIC,
  starts_on DATE, ends_on DATE, active BOOLEAN, is_current BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM public.supermarket_loyalty_assert_company(p_company_id);
  RETURN QUERY
  SELECT c.id, c.name::TEXT, c.benefit_type::TEXT, c.benefit_value, c.minimum_purchase,
    c.starts_on, c.ends_on, c.active, c.active AND CURRENT_DATE BETWEEN c.starts_on AND c.ends_on
  FROM public.supermarket_loyalty_campaigns c
  WHERE c.company_id = p_company_id
  ORDER BY (c.active AND CURRENT_DATE BETWEEN c.starts_on AND c.ends_on) DESC, c.starts_on DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_save_loyalty_campaign(
  p_company_id UUID, p_user_id UUID, p_campaign_id UUID, p_name TEXT,
  p_benefit_type TEXT, p_benefit_value NUMERIC, p_minimum_purchase NUMERIC,
  p_starts_on DATE, p_ends_on DATE, p_active BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE v_id UUID := p_campaign_id;
BEGIN
  PERFORM public.supermarket_loyalty_assert_company(p_company_id);
  IF trim(COALESCE(p_name, '')) = '' OR length(trim(p_name)) > 120
    OR p_benefit_type NOT IN ('points_multiplier', 'fixed_points', 'percent_discount')
    OR p_benefit_value <= 0 OR p_minimum_purchase < 0 OR p_starts_on IS NULL
    OR p_ends_on IS NULL OR p_ends_on < p_starts_on
    OR (p_benefit_type = 'points_multiplier' AND p_benefit_value < 1)
    OR (p_benefit_type = 'percent_discount' AND p_benefit_value > 100) THEN
    RAISE EXCEPTION 'INVALID_LOYALTY_CAMPAIGN';
  END IF;
  IF v_id IS NULL THEN
    INSERT INTO public.supermarket_loyalty_campaigns(
      company_id, name, benefit_type, benefit_value, minimum_purchase,
      starts_on, ends_on, active, created_by
    ) VALUES (
      p_company_id, trim(p_name), p_benefit_type, p_benefit_value,
      p_minimum_purchase, p_starts_on, p_ends_on, p_active, p_user_id
    ) RETURNING id INTO v_id;
  ELSE
    UPDATE public.supermarket_loyalty_campaigns SET
      name = trim(p_name), benefit_type = p_benefit_type, benefit_value = p_benefit_value,
      minimum_purchase = p_minimum_purchase, starts_on = p_starts_on,
      ends_on = p_ends_on, active = p_active, updated_at = timezone('utc'::text, now())
    WHERE id = v_id AND company_id = p_company_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'LOYALTY_CAMPAIGN_NOT_FOUND'; END IF;
  END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_list_loyalty_rewards(p_company_id UUID)
RETURNS TABLE(
  id UUID, name TEXT, description TEXT, points_cost INTEGER, stock_limit INTEGER,
  redeemed_count INTEGER, available_count INTEGER, image_url TEXT, active BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM public.supermarket_loyalty_assert_company(p_company_id);
  RETURN QUERY
  SELECT r.id, r.name::TEXT, COALESCE(r.description, '')::TEXT, r.points_cost,
    r.stock_limit, r.redeemed_count,
    CASE WHEN r.stock_limit IS NULL THEN NULL ELSE r.stock_limit - r.redeemed_count END,
    r.image_url, r.active
  FROM public.supermarket_loyalty_rewards r
  WHERE r.company_id = p_company_id
  ORDER BY r.active DESC, r.points_cost, r.name;
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_save_loyalty_reward(
  p_company_id UUID, p_user_id UUID, p_reward_id UUID, p_name TEXT,
  p_description TEXT, p_points_cost INTEGER, p_stock_limit INTEGER,
  p_image_url TEXT, p_active BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE v_id UUID := p_reward_id;
BEGIN
  PERFORM public.supermarket_loyalty_assert_company(p_company_id);
  IF trim(COALESCE(p_name, '')) = '' OR length(trim(p_name)) > 120
    OR length(COALESCE(p_description, '')) > 240 OR p_points_cost <= 0
    OR (p_stock_limit IS NOT NULL AND p_stock_limit < 0) THEN
    RAISE EXCEPTION 'INVALID_LOYALTY_REWARD';
  END IF;
  IF v_id IS NULL THEN
    INSERT INTO public.supermarket_loyalty_rewards(
      company_id, name, description, points_cost, stock_limit, image_url, active, created_by
    ) VALUES (
      p_company_id, trim(p_name), NULLIF(trim(p_description), ''), p_points_cost,
      p_stock_limit, NULLIF(trim(p_image_url), ''), p_active, p_user_id
    ) RETURNING id INTO v_id;
  ELSE
    UPDATE public.supermarket_loyalty_rewards SET
      name = trim(p_name), description = NULLIF(trim(p_description), ''),
      points_cost = p_points_cost, stock_limit = p_stock_limit,
      image_url = NULLIF(trim(p_image_url), ''), active = p_active,
      updated_at = timezone('utc'::text, now())
    WHERE id = v_id AND company_id = p_company_id
      AND (p_stock_limit IS NULL OR redeemed_count <= p_stock_limit);
    IF NOT FOUND THEN RAISE EXCEPTION 'LOYALTY_REWARD_NOT_FOUND_OR_INVALID_STOCK'; END IF;
  END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_list_loyalty_movements(
  p_company_id UUID, p_branch_id UUID, p_customer_id UUID
)
RETURNS TABLE(
  id UUID, customer_id UUID, customer_name TEXT, movement_type TEXT, points_delta INTEGER,
  balance_after INTEGER, purchase_amount NUMERIC, campaign_name TEXT,
  reward_name TEXT, reference TEXT, created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  RETURN QUERY
  SELECT m.id, m.customer_id, c.name::TEXT, m.movement_type::TEXT, m.points_delta,
    m.balance_after, m.purchase_amount, COALESCE(campaign.name, '')::TEXT,
    COALESCE(reward.name, '')::TEXT, m.reference::TEXT, m.created_at
  FROM public.supermarket_loyalty_movements m
  JOIN public.clients c ON c.id = m.customer_id AND c.company_id = m.company_id
  LEFT JOIN public.supermarket_loyalty_campaigns campaign ON campaign.id = m.campaign_id
  LEFT JOIN public.supermarket_loyalty_rewards reward ON reward.id = m.reward_id
  WHERE m.company_id = p_company_id AND m.branch_id = p_branch_id
    AND (p_customer_id IS NULL OR m.customer_id = p_customer_id)
  ORDER BY m.created_at DESC LIMIT 300;
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_credit_loyalty_purchase(
  p_company_id UUID, p_branch_id UUID, p_user_id UUID, p_idempotency_key TEXT,
  p_customer_id UUID, p_purchase_amount NUMERIC, p_sale_id UUID, p_campaign_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_existing public.supermarket_loyalty_movements%ROWTYPE;
  v_customer public.supermarket_loyalty_customers%ROWTYPE;
  v_campaign public.supermarket_loyalty_campaigns%ROWTYPE;
  v_points INTEGER;
  v_balance INTEGER;
  v_lifetime INTEGER;
  v_tier TEXT;
  v_movement_id UUID;
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) < 8 OR length(p_idempotency_key) > 128
    OR p_purchase_amount <= 0 THEN RAISE EXCEPTION 'INVALID_LOYALTY_PURCHASE'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_company_id::TEXT || ':' || p_idempotency_key));
  SELECT * INTO v_existing FROM public.supermarket_loyalty_movements
  WHERE company_id = p_company_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN RETURN jsonb_build_object(
    'movementId', v_existing.id, 'points', v_existing.points_delta,
    'balance', v_existing.balance_after, 'duplicate', true
  ); END IF;
  SELECT * INTO v_customer FROM public.supermarket_loyalty_customers
  WHERE client_id = p_customer_id AND company_id = p_company_id AND active FOR UPDATE;
  IF v_customer.client_id IS NULL THEN RAISE EXCEPTION 'LOYALTY_CUSTOMER_NOT_FOUND'; END IF;
  IF p_sale_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sales s WHERE s.id = p_sale_id AND s.company_id = p_company_id AND s.branch_id = p_branch_id
  ) THEN RAISE EXCEPTION 'SALE_NOT_FOUND'; END IF;
  v_points := GREATEST(1, FLOOR(p_purchase_amount / 100)::INTEGER);
  IF p_campaign_id IS NOT NULL THEN
    SELECT * INTO v_campaign FROM public.supermarket_loyalty_campaigns
    WHERE id = p_campaign_id AND company_id = p_company_id AND active
      AND CURRENT_DATE BETWEEN starts_on AND ends_on AND p_purchase_amount >= minimum_purchase;
    IF v_campaign.id IS NULL THEN RAISE EXCEPTION 'LOYALTY_CAMPAIGN_NOT_APPLICABLE'; END IF;
    v_points := CASE v_campaign.benefit_type
      WHEN 'points_multiplier' THEN FLOOR(v_points * v_campaign.benefit_value)::INTEGER
      WHEN 'fixed_points' THEN v_points + FLOOR(v_campaign.benefit_value)::INTEGER
      ELSE v_points END;
  END IF;
  v_balance := v_customer.points_balance + v_points;
  v_lifetime := v_customer.lifetime_points + v_points;
  v_tier := CASE WHEN v_lifetime >= 1500 THEN 'gold' WHEN v_lifetime >= 500 THEN 'silver' ELSE 'bronze' END;
  UPDATE public.supermarket_loyalty_customers SET
    points_balance = v_balance, lifetime_points = v_lifetime, tier = v_tier,
    updated_at = timezone('utc'::text, now())
  WHERE client_id = v_customer.client_id;
  INSERT INTO public.supermarket_loyalty_movements(
    company_id, branch_id, customer_id, user_id, idempotency_key, movement_type,
    points_delta, balance_after, purchase_amount, sale_id, campaign_id, reference
  ) VALUES (
    p_company_id, p_branch_id, p_customer_id, p_user_id, p_idempotency_key, 'earn',
    v_points, v_balance, p_purchase_amount, p_sale_id, p_campaign_id,
    'Puntos por compra de $' || ROUND(p_purchase_amount, 2)::TEXT
  ) RETURNING id INTO v_movement_id;
  RETURN jsonb_build_object('movementId', v_movement_id, 'points', v_points,
    'balance', v_balance, 'tier', v_tier, 'duplicate', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_redeem_loyalty_reward(
  p_company_id UUID, p_branch_id UUID, p_user_id UUID, p_idempotency_key TEXT,
  p_customer_id UUID, p_reward_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_existing public.supermarket_loyalty_movements%ROWTYPE;
  v_customer public.supermarket_loyalty_customers%ROWTYPE;
  v_reward public.supermarket_loyalty_rewards%ROWTYPE;
  v_balance INTEGER;
  v_movement_id UUID;
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) < 8 OR length(p_idempotency_key) > 128
    THEN RAISE EXCEPTION 'INVALID_LOYALTY_REDEMPTION'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_company_id::TEXT || ':' || p_idempotency_key));
  SELECT * INTO v_existing FROM public.supermarket_loyalty_movements
  WHERE company_id = p_company_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN RETURN jsonb_build_object(
    'movementId', v_existing.id, 'points', ABS(v_existing.points_delta),
    'balance', v_existing.balance_after, 'duplicate', true
  ); END IF;
  SELECT * INTO v_customer FROM public.supermarket_loyalty_customers
  WHERE client_id = p_customer_id AND company_id = p_company_id AND active FOR UPDATE;
  SELECT * INTO v_reward FROM public.supermarket_loyalty_rewards
  WHERE id = p_reward_id AND company_id = p_company_id AND active FOR UPDATE;
  IF v_customer.client_id IS NULL THEN RAISE EXCEPTION 'LOYALTY_CUSTOMER_NOT_FOUND'; END IF;
  IF v_reward.id IS NULL THEN RAISE EXCEPTION 'LOYALTY_REWARD_NOT_FOUND'; END IF;
  IF v_customer.points_balance < v_reward.points_cost THEN RAISE EXCEPTION 'INSUFFICIENT_LOYALTY_POINTS'; END IF;
  IF v_reward.stock_limit IS NOT NULL AND v_reward.redeemed_count >= v_reward.stock_limit
    THEN RAISE EXCEPTION 'LOYALTY_REWARD_OUT_OF_STOCK'; END IF;
  v_balance := v_customer.points_balance - v_reward.points_cost;
  UPDATE public.supermarket_loyalty_customers SET points_balance = v_balance,
    updated_at = timezone('utc'::text, now()) WHERE client_id = p_customer_id;
  UPDATE public.supermarket_loyalty_rewards SET redeemed_count = redeemed_count + 1,
    updated_at = timezone('utc'::text, now()) WHERE id = p_reward_id;
  INSERT INTO public.supermarket_loyalty_movements(
    company_id, branch_id, customer_id, user_id, idempotency_key, movement_type,
    points_delta, balance_after, reward_id, reference
  ) VALUES (
    p_company_id, p_branch_id, p_customer_id, p_user_id, p_idempotency_key, 'redeem',
    -v_reward.points_cost, v_balance, p_reward_id, 'Canje: ' || v_reward.name
  ) RETURNING id INTO v_movement_id;
  RETURN jsonb_build_object('movementId', v_movement_id, 'points', v_reward.points_cost,
    'balance', v_balance, 'rewardName', v_reward.name, 'duplicate', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_adjust_loyalty_points(
  p_company_id UUID, p_branch_id UUID, p_user_id UUID, p_idempotency_key TEXT,
  p_customer_id UUID, p_points_delta INTEGER, p_reference TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_existing public.supermarket_loyalty_movements%ROWTYPE;
  v_customer public.supermarket_loyalty_customers%ROWTYPE;
  v_balance INTEGER;
  v_movement_id UUID;
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) < 8 OR length(p_idempotency_key) > 128
    OR p_points_delta = 0 OR trim(COALESCE(p_reference, '')) = '' OR length(trim(p_reference)) > 180
    THEN RAISE EXCEPTION 'INVALID_LOYALTY_ADJUSTMENT'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_company_id::TEXT || ':' || p_idempotency_key));
  SELECT * INTO v_existing FROM public.supermarket_loyalty_movements
  WHERE company_id = p_company_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN RETURN jsonb_build_object(
    'movementId', v_existing.id, 'points', v_existing.points_delta,
    'balance', v_existing.balance_after, 'duplicate', true
  ); END IF;
  SELECT * INTO v_customer FROM public.supermarket_loyalty_customers
  WHERE client_id = p_customer_id AND company_id = p_company_id FOR UPDATE;
  IF v_customer.client_id IS NULL THEN RAISE EXCEPTION 'LOYALTY_CUSTOMER_NOT_FOUND'; END IF;
  v_balance := v_customer.points_balance + p_points_delta;
  IF v_balance < 0 THEN RAISE EXCEPTION 'INSUFFICIENT_LOYALTY_POINTS'; END IF;
  UPDATE public.supermarket_loyalty_customers SET points_balance = v_balance,
    updated_at = timezone('utc'::text, now()) WHERE client_id = p_customer_id;
  INSERT INTO public.supermarket_loyalty_movements(
    company_id, branch_id, customer_id, user_id, idempotency_key, movement_type,
    points_delta, balance_after, reference
  ) VALUES (
    p_company_id, p_branch_id, p_customer_id, p_user_id, p_idempotency_key,
    'adjust', p_points_delta, v_balance, trim(p_reference)
  ) RETURNING id INTO v_movement_id;
  RETURN jsonb_build_object('movementId', v_movement_id, 'points', p_points_delta,
    'balance', v_balance, 'duplicate', false);
END;
$$;

REVOKE ALL ON FUNCTION public.supermarket_loyalty_assert_company(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.supermarket_list_loyalty_customers(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.supermarket_save_loyalty_customer(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, DATE, BOOLEAN, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.supermarket_list_loyalty_campaigns(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.supermarket_save_loyalty_campaign(UUID, UUID, UUID, TEXT, TEXT, NUMERIC, NUMERIC, DATE, DATE, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.supermarket_list_loyalty_rewards(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.supermarket_save_loyalty_reward(UUID, UUID, UUID, TEXT, TEXT, INTEGER, INTEGER, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.supermarket_list_loyalty_movements(UUID, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.supermarket_credit_loyalty_purchase(UUID, UUID, UUID, TEXT, UUID, NUMERIC, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.supermarket_redeem_loyalty_reward(UUID, UUID, UUID, TEXT, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.supermarket_adjust_loyalty_points(UUID, UUID, UUID, TEXT, UUID, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.supermarket_loyalty_assert_company(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_list_loyalty_customers(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_save_loyalty_customer(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, DATE, BOOLEAN, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_list_loyalty_campaigns(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_save_loyalty_campaign(UUID, UUID, UUID, TEXT, TEXT, NUMERIC, NUMERIC, DATE, DATE, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_list_loyalty_rewards(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_save_loyalty_reward(UUID, UUID, UUID, TEXT, TEXT, INTEGER, INTEGER, TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_list_loyalty_movements(UUID, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_credit_loyalty_purchase(UUID, UUID, UUID, TEXT, UUID, NUMERIC, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_redeem_loyalty_reward(UUID, UUID, UUID, TEXT, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_adjust_loyalty_points(UUID, UUID, UUID, TEXT, UUID, INTEGER, TEXT) TO service_role;

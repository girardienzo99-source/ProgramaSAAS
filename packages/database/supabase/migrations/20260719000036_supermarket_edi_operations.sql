-- Operational EDI queue controls for supermarket supplier workflows.

WITH permission_definitions(name, description) AS (
  VALUES
    ('supermarket.edi.manage', 'Retry and operate supermarket EDI messages')
)
INSERT INTO public.permissions(module_id, name, description)
SELECT m.id, d.name, d.description
FROM permission_definitions d
JOIN public.modules m ON m.code = 'barcode_scanner'
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

ALTER TABLE public.supermarket_edi_outbox
  DROP CONSTRAINT IF EXISTS supermarket_edi_outbox_status_check;
ALTER TABLE public.supermarket_edi_outbox
  ADD CONSTRAINT supermarket_edi_outbox_status_check
  CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'dead_letter'));

ALTER TABLE public.supermarket_edi_outbox
  ADD COLUMN IF NOT EXISTS destination_endpoint TEXT,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS locked_by TEXT,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS delivered_reference TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

UPDATE public.supermarket_edi_outbox
SET next_retry_at = COALESCE(next_retry_at, available_at)
WHERE next_retry_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_supermarket_edi_company_status
  ON public.supermarket_edi_outbox(company_id, branch_id, status, next_retry_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supermarket_edi_source_claim
  ON public.supermarket_edi_outbox(company_id, claim_id, created_at DESC)
  WHERE claim_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.supermarket_list_edi_outbox(
  p_company_id UUID, p_branch_id UUID, p_status TEXT DEFAULT NULL
) RETURNS TABLE(
  id UUID, event_type TEXT, standard TEXT, status TEXT, retry_count INTEGER,
  last_error TEXT, available_at TIMESTAMP WITH TIME ZONE, next_retry_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE, locked_at TIMESTAMP WITH TIME ZONE,
  destination_endpoint TEXT, delivered_reference TEXT, source_type TEXT, source_label TEXT,
  payload JSONB, created_at TIMESTAMP WITH TIME ZONE, updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  IF p_status IS NOT NULL AND p_status NOT IN ('pending', 'processing', 'sent', 'failed', 'dead_letter') THEN
    RAISE EXCEPTION 'INVALID_EDI_STATUS';
  END IF;

  RETURN QUERY
  SELECT e.id, e.event_type::TEXT, e.standard::TEXT, e.status::TEXT, e.retry_count,
    COALESCE(e.last_error, '')::TEXT, e.available_at, COALESCE(e.next_retry_at, e.available_at),
    e.sent_at, e.locked_at, COALESCE(e.destination_endpoint, '')::TEXT,
    COALESCE(e.delivered_reference, '')::TEXT,
    CASE WHEN e.shipment_id IS NOT NULL THEN 'shipment'
      WHEN e.receipt_id IS NOT NULL THEN 'receipt'
      WHEN e.claim_id IS NOT NULL THEN 'claim'
      ELSE 'unknown' END::TEXT,
    CASE WHEN e.shipment_id IS NOT NULL THEN 'ASN ' || sh.dispatch_number
      WHEN e.receipt_id IS NOT NULL THEN 'REC ' || r.receipt_number::TEXT
      WHEN e.claim_id IS NOT NULL THEN 'Reclamo #' || c.claim_number::TEXT
      ELSE e.idempotency_key END::TEXT,
    e.payload, e.created_at, e.updated_at
  FROM public.supermarket_edi_outbox e
  LEFT JOIN public.supermarket_supplier_shipments sh ON sh.id = e.shipment_id AND sh.company_id = e.company_id
  LEFT JOIN public.supermarket_purchase_receipts r ON r.id = e.receipt_id AND r.company_id = e.company_id
  LEFT JOIN public.supermarket_supplier_claims c ON c.id = e.claim_id AND c.company_id = e.company_id
  WHERE e.company_id = p_company_id AND e.branch_id = p_branch_id
    AND (p_status IS NULL OR e.status = p_status)
  ORDER BY CASE e.status WHEN 'failed' THEN 0 WHEN 'dead_letter' THEN 1 WHEN 'pending' THEN 2 WHEN 'processing' THEN 3 ELSE 4 END,
    COALESCE(e.next_retry_at, e.available_at), e.created_at DESC
  LIMIT 1000;
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_retry_edi_message(
  p_company_id UUID, p_branch_id UUID, p_user_id UUID, p_message_id UUID, p_reason TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
DECLARE v_message public.supermarket_edi_outbox%ROWTYPE;
BEGIN
  PERFORM public.supermarket_assert_scope(p_company_id, p_branch_id);
  SELECT * INTO v_message FROM public.supermarket_edi_outbox
  WHERE id = p_message_id AND company_id = p_company_id AND branch_id = p_branch_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'EDI_MESSAGE_NOT_FOUND'; END IF;
  IF v_message.status = 'sent' THEN RAISE EXCEPTION 'EDI_MESSAGE_ALREADY_SENT'; END IF;

  UPDATE public.supermarket_edi_outbox
  SET status = 'pending',
    available_at = timezone('utc'::text, now()),
    next_retry_at = timezone('utc'::text, now()),
    locked_at = NULL,
    locked_by = NULL,
    last_error = CASE WHEN NULLIF(trim(p_reason), '') IS NULL THEN last_error ELSE left(trim(p_reason), 1000) END,
    updated_at = timezone('utc'::text, now())
  WHERE id = v_message.id;

  RETURN jsonb_build_object('messageId', v_message.id, 'status', 'pending', 'retryCount', v_message.retry_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.supermarket_record_edi_delivery(
  p_message_id UUID, p_worker_id TEXT, p_success BOOLEAN, p_reference TEXT, p_error TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
DECLARE v_message public.supermarket_edi_outbox%ROWTYPE; v_retry INTEGER; v_status TEXT;
BEGIN
  SELECT * INTO v_message FROM public.supermarket_edi_outbox WHERE id = p_message_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'EDI_MESSAGE_NOT_FOUND'; END IF;

  IF p_success THEN
    UPDATE public.supermarket_edi_outbox
    SET status = 'sent', sent_at = timezone('utc'::text, now()),
      delivered_reference = NULLIF(trim(COALESCE(p_reference, '')), ''),
      locked_at = NULL, locked_by = NULL, last_error = NULL,
      updated_at = timezone('utc'::text, now())
    WHERE id = v_message.id;
    RETURN jsonb_build_object('messageId', v_message.id, 'status', 'sent');
  END IF;

  v_retry := LEAST(v_message.retry_count + 1, 100);
  v_status := CASE WHEN v_retry >= 8 THEN 'dead_letter' ELSE 'failed' END;
  UPDATE public.supermarket_edi_outbox
  SET status = v_status, retry_count = v_retry,
    last_error = left(COALESCE(NULLIF(trim(p_error), ''), 'Delivery failed'), 2000),
    next_retry_at = timezone('utc'::text, now()) + make_interval(mins => LEAST(1440, (2 ^ LEAST(v_retry, 8))::INTEGER)),
    available_at = timezone('utc'::text, now()) + make_interval(mins => LEAST(1440, (2 ^ LEAST(v_retry, 8))::INTEGER)),
    locked_at = NULL, locked_by = NULL, updated_at = timezone('utc'::text, now())
  WHERE id = v_message.id;
  RETURN jsonb_build_object('messageId', v_message.id, 'status', v_status, 'retryCount', v_retry);
END;
$$;

REVOKE ALL ON FUNCTION public.supermarket_list_edi_outbox(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.supermarket_retry_edi_message(UUID, UUID, UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.supermarket_record_edi_delivery(UUID, TEXT, BOOLEAN, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.supermarket_list_edi_outbox(UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_retry_edi_message(UUID, UUID, UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.supermarket_record_edi_delivery(UUID, TEXT, BOOLEAN, TEXT, TEXT) TO service_role;

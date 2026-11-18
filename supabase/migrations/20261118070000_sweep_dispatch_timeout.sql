-- The hourly sweep calls Razorpay once per live subscription, so it takes longer than pg_net's default
-- 5-second timeout. Every run was timing out on the database side. Give the call two minutes.
-- Same function as before (see 20260811061229_*.sql); only `timeout_milliseconds` is new.
CREATE OR REPLACE FUNCTION public.subscription_sweep_dispatch()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  base_url text;
BEGIN
  SELECT decrypted_secret INTO base_url FROM vault.decrypted_secrets WHERE name = 'app_base_url';
  IF base_url IS NULL THEN
    RETURN;
  END IF;
  PERFORM net.http_post(
    url := base_url || '/api/public/cron/subscription-sweep',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
END;
$$;

REVOKE ALL ON FUNCTION public.subscription_sweep_dispatch() FROM PUBLIC, anon, authenticated;

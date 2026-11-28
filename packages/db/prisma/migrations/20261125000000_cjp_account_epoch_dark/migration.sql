-- Dark account epoch. Existing sessions and authority paths do not consume it.
BEGIN;

ALTER TABLE public.users
  ADD COLUMN account_epoch integer NOT NULL DEFAULT 1
  CONSTRAINT users_account_epoch_positive CHECK (account_epoch >= 1);

CREATE FUNCTION public.cjp_users_account_epoch_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.account_epoch IS DISTINCT FROM 1 THEN
      RAISE EXCEPTION 'Account epoch must initialize to 1'
        USING ERRCODE = '23514', CONSTRAINT = 'users_account_epoch_guard';
    END IF;
    RETURN NEW;
  END IF;

  -- An explicit assignment of the old value is indistinguishable from a no-op.
  IF NEW.account_epoch IS DISTINCT FROM OLD.account_epoch THEN
    RAISE EXCEPTION 'Direct account epoch mutation is prohibited'
      USING ERRCODE = '23514', CONSTRAINT = 'users_account_epoch_guard';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role OR NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.account_epoch = 2147483647 THEN
      RAISE EXCEPTION 'Account epoch exhausted'
        USING ERRCODE = '23514', CONSTRAINT = 'users_account_epoch_overflow';
    END IF;
    NEW.account_epoch := OLD.account_epoch + 1;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.cjp_users_account_epoch_guard() FROM PUBLIC;

-- Fail closed if a custom default ACL grants authority on the new function.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc AS p
    CROSS JOIN LATERAL pg_catalog.aclexplode(
      COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))
    ) AS acl
    WHERE p.oid = 'public.cjp_users_account_epoch_guard()'::pg_catalog.regprocedure
      AND acl.grantee <> p.proowner
  ) THEN
    RAISE EXCEPTION 'Unexpected account epoch function privileges'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE TRIGGER cjp_users_account_epoch_write_guard
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.cjp_users_account_epoch_guard();

COMMIT;

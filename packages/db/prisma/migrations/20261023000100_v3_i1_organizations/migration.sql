BEGIN;
CREATE TYPE public.organization_kind AS ENUM ('CLINIC','LABORATORY','PHARMACY');
CREATE TYPE public.organization_status AS ENUM ('ACTIVE','SUSPENDED');
CREATE TYPE public.organization_membership_status AS ENUM ('ACTIVE','ENDED');
CREATE TABLE public.organizations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 kind public.organization_kind NOT NULL,
 name varchar(160) NOT NULL,
 status public.organization_status NOT NULL DEFAULT 'ACTIVE',
 status_version integer NOT NULL DEFAULT 0,
 created_by_user_id uuid NOT NULL,
 admin_role public.user_role NOT NULL DEFAULT 'ADMIN',
 operation_key uuid NOT NULL,
 created_at timestamptz(3) NOT NULL DEFAULT now(),
 status_changed_by_user_id uuid NOT NULL,
 status_changed_at timestamptz(3) NOT NULL DEFAULT now(),
 CONSTRAINT organizations_id_kind_key UNIQUE(id,kind),
 CONSTRAINT organizations_operation_key UNIQUE(created_by_user_id,operation_key),
 CONSTRAINT organizations_creator_fkey FOREIGN KEY(created_by_user_id,admin_role) REFERENCES public.users(id,role) ON UPDATE RESTRICT ON DELETE RESTRICT,
 CONSTRAINT organizations_status_actor_fkey FOREIGN KEY(status_changed_by_user_id,admin_role) REFERENCES public.users(id,role) ON UPDATE RESTRICT ON DELETE RESTRICT,
 CONSTRAINT organizations_admin_role_check CHECK(admin_role='ADMIN'),
 CONSTRAINT organizations_name_check CHECK(length(btrim(name)) BETWEEN 1 AND 160 AND name=btrim(name) AND name !~ '[[:cntrl:]]'),
 CONSTRAINT organizations_lifecycle_check CHECK(status_version>=0 AND isfinite(created_at) AND isfinite(status_changed_at) AND status_changed_at>=created_at)
);
CREATE TABLE public.organization_memberships (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL,
 organization_kind public.organization_kind NOT NULL,
 user_id uuid NOT NULL,
 user_role public.user_role NOT NULL,
 status public.organization_membership_status NOT NULL DEFAULT 'ACTIVE',
 granted_by_user_id uuid NOT NULL,
 admin_role public.user_role NOT NULL DEFAULT 'ADMIN',
 operation_key uuid NOT NULL,
 granted_at timestamptz(3) NOT NULL DEFAULT now(),
 ended_by_user_id uuid,
 ended_at timestamptz(3),
 CONSTRAINT memberships_operation_key UNIQUE(granted_by_user_id,operation_key),
 CONSTRAINT memberships_organization_kind_fkey FOREIGN KEY(organization_id,organization_kind) REFERENCES public.organizations(id,kind) ON UPDATE RESTRICT ON DELETE RESTRICT,
 CONSTRAINT memberships_user_role_fkey FOREIGN KEY(user_id,user_role) REFERENCES public.users(id,role) ON UPDATE RESTRICT ON DELETE RESTRICT,
 CONSTRAINT memberships_grant_actor_fkey FOREIGN KEY(granted_by_user_id,admin_role) REFERENCES public.users(id,role) ON UPDATE RESTRICT ON DELETE RESTRICT,
 CONSTRAINT memberships_end_actor_fkey FOREIGN KEY(ended_by_user_id,admin_role) REFERENCES public.users(id,role) ON UPDATE RESTRICT ON DELETE RESTRICT,
 CONSTRAINT memberships_admin_role_check CHECK(admin_role='ADMIN'),
 CONSTRAINT memberships_compatibility_check CHECK(
  (user_role='CLINICIAN' AND organization_kind='CLINIC') OR
  (user_role='LAB_STAFF' AND organization_kind='LABORATORY') OR
  (user_role='PHARMACY_STAFF' AND organization_kind='PHARMACY')),
 CONSTRAINT memberships_actor_check CHECK(user_id<>granted_by_user_id AND user_id IS DISTINCT FROM ended_by_user_id),
 CONSTRAINT memberships_lifecycle_check CHECK(isfinite(granted_at) AND (
  (status='ACTIVE' AND ended_at IS NULL AND ended_by_user_id IS NULL) OR
  (status='ENDED' AND ended_at IS NOT NULL AND ended_by_user_id IS NOT NULL AND isfinite(ended_at) AND ended_at>=granted_at)))
);
CREATE UNIQUE INDEX memberships_active_pair_key ON public.organization_memberships(user_id,organization_id) WHERE status='ACTIVE';
CREATE INDEX memberships_user_history_idx ON public.organization_memberships(user_id,organization_id,granted_at);

CREATE FUNCTION public.i1_guard_organization() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.status<>'ACTIVE' OR NEW.status_version<>0 OR NEW.status_changed_by_user_id<>NEW.created_by_user_id OR NEW.status_changed_at<>NEW.created_at THEN
   RAISE EXCEPTION 'Invalid initial organization lifecycle' USING ERRCODE='23514',CONSTRAINT='organizations_history_guard';
  END IF;
 ELSE
  IF NEW IS NOT DISTINCT FROM OLD THEN RETURN NEW; END IF;
  IF (NEW.id,NEW.kind,NEW.name,NEW.created_by_user_id,NEW.admin_role,NEW.operation_key,NEW.created_at) IS DISTINCT FROM
     (OLD.id,OLD.kind,OLD.name,OLD.created_by_user_id,OLD.admin_role,OLD.operation_key,OLD.created_at)
     OR NEW.status=OLD.status OR NEW.status_version<>OLD.status_version+1 OR NEW.status_changed_at<OLD.status_changed_at THEN
   RAISE EXCEPTION 'Organization history cannot be rewritten' USING ERRCODE='23514',CONSTRAINT='organizations_history_guard';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION public.i1_guard_membership() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.status<>'ACTIVE' OR NEW.ended_at IS NOT NULL OR NEW.ended_by_user_id IS NOT NULL THEN
   RAISE EXCEPTION 'Membership must begin active' USING ERRCODE='23514',CONSTRAINT='memberships_history_guard';
  END IF;
 ELSE
  IF NEW IS NOT DISTINCT FROM OLD THEN RETURN NEW; END IF;
  IF OLD.status='ENDED' OR NEW.status<>'ENDED' OR
   (NEW.id,NEW.organization_id,NEW.organization_kind,NEW.user_id,NEW.user_role,NEW.granted_by_user_id,NEW.admin_role,NEW.operation_key,NEW.granted_at) IS DISTINCT FROM
   (OLD.id,OLD.organization_id,OLD.organization_kind,OLD.user_id,OLD.user_role,OLD.granted_by_user_id,OLD.admin_role,OLD.operation_key,OLD.granted_at) THEN
   RAISE EXCEPTION 'Membership history cannot be rewritten' USING ERRCODE='23514',CONSTRAINT='memberships_history_guard';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION public.i1_reject_removal() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN RAISE EXCEPTION 'Organization history cannot be removed' USING ERRCODE='23514',CONSTRAINT='i1_history_removal_guard'; END $$;
CREATE TRIGGER organizations_write_guard BEFORE INSERT OR UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.i1_guard_organization();
CREATE TRIGGER organizations_removal_guard BEFORE DELETE OR TRUNCATE ON public.organizations FOR EACH STATEMENT EXECUTE FUNCTION public.i1_reject_removal();
CREATE TRIGGER memberships_write_guard BEFORE INSERT OR UPDATE ON public.organization_memberships FOR EACH ROW EXECUTE FUNCTION public.i1_guard_membership();
CREATE TRIGGER memberships_removal_guard BEFORE DELETE OR TRUNCATE ON public.organization_memberships FOR EACH STATEMENT EXECUTE FUNCTION public.i1_reject_removal();
COMMIT;

-- Slice 2 only. No source rewrite, fulfillment backfill or laboratory objects.
CREATE TABLE public.pharmacy_routes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), root_id uuid NOT NULL, patient_id uuid NOT NULL,
 pharmacy_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 author_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 assignment_id uuid NOT NULL REFERENCES public.clinician_patient_assignments(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 predecessor_id uuid UNIQUE, created_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(root_id,patient_id) REFERENCES public.prescriptions(id,patient_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 UNIQUE(id,root_id,patient_id), UNIQUE(id,root_id,patient_id,pharmacy_id),
 FOREIGN KEY(predecessor_id,root_id,patient_id) REFERENCES public.pharmacy_routes(id,root_id,patient_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CHECK(predecessor_id IS DISTINCT FROM id)
);
CREATE TABLE public.pharmacy_route_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), route_id uuid NOT NULL, root_id uuid NOT NULL, patient_id uuid NOT NULL,
 item_id uuid NOT NULL, sequence integer NOT NULL CHECK(sequence>0), predecessor_id uuid UNIQUE,
 FOREIGN KEY(route_id,root_id,patient_id) REFERENCES public.pharmacy_routes(id,root_id,patient_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 FOREIGN KEY(item_id,root_id) REFERENCES public.prescription_items(id,root_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 UNIQUE(route_id,item_id), UNIQUE(item_id,sequence), UNIQUE(id,item_id,root_id), UNIQUE(route_id,item_id,root_id,patient_id),
 FOREIGN KEY(predecessor_id,item_id,root_id) REFERENCES public.pharmacy_route_items(id,item_id,root_id) ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE TABLE public.pharmacy_route_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), route_id uuid NOT NULL REFERENCES public.pharmacy_routes(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 version integer NOT NULL CHECK(version>0), command varchar(12) NOT NULL CHECK(command IN ('ROUTE','WITHDRAW','REROUTE','ACCEPT')),
 state varchar(12) NOT NULL CHECK(state IN ('PENDING','ACCEPTED','WITHDRAWN')),
 actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 assignment_id uuid REFERENCES public.clinician_patient_assignments(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 membership_id uuid REFERENCES public.organization_memberships(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 reason text CHECK(length(btrim(reason))>0 AND public.i2_document_text(reason,1000)),
 operation_id uuid NOT NULL, recorded_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(route_id,version), UNIQUE(operation_id,route_id), UNIQUE(id,route_id),
 CHECK((command='ACCEPT')=(membership_id IS NOT NULL)), CHECK((command='ACCEPT')=(assignment_id IS NULL)),
 CHECK((command IN ('WITHDRAW','REROUTE'))=(reason IS NOT NULL)),
 CHECK((version=1 AND state='PENDING' AND command IN ('ROUTE','REROUTE')) OR (version=2 AND ((state='ACCEPTED' AND command='ACCEPT') OR (state='WITHDRAWN' AND command IN ('WITHDRAW','REROUTE')))))
);
CREATE TABLE public.pharmacy_dispenses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), route_id uuid NOT NULL, item_id uuid NOT NULL UNIQUE,
 root_id uuid NOT NULL, patient_id uuid NOT NULL, pharmacy_id uuid NOT NULL,
 medication_id uuid NOT NULL REFERENCES public.medications(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 medication_display text NOT NULL, quantity numeric(12,3) NOT NULL, unit text NOT NULL,
 actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 membership_id uuid NOT NULL REFERENCES public.organization_memberships(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 operation_id uuid NOT NULL UNIQUE, recorded_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(route_id,item_id,root_id,patient_id) REFERENCES public.pharmacy_route_items(route_id,item_id,root_id,patient_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 FOREIGN KEY(route_id,root_id,patient_id,pharmacy_id) REFERENCES public.pharmacy_routes(id,root_id,patient_id,pharmacy_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 UNIQUE(id,route_id,item_id,pharmacy_id)
);
CREATE TABLE public.pharmacy_dispense_corrections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), dispense_id uuid NOT NULL, route_id uuid NOT NULL, item_id uuid NOT NULL, pharmacy_id uuid NOT NULL,
 version integer NOT NULL CHECK(version>0), predecessor_id uuid UNIQUE,
 kind varchar(12) NOT NULL CHECK(kind IN ('CORRECTION','REVERSAL')),
 actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 membership_id uuid NOT NULL REFERENCES public.organization_memberships(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 reason text NOT NULL CHECK(length(btrim(reason))>0 AND public.i2_document_text(reason,1000)),
 operation_id uuid NOT NULL UNIQUE, recorded_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(dispense_id,route_id,item_id,pharmacy_id) REFERENCES public.pharmacy_dispenses(id,route_id,item_id,pharmacy_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 UNIQUE(dispense_id,version), UNIQUE(id,dispense_id),
 FOREIGN KEY(predecessor_id,dispense_id) REFERENCES public.pharmacy_dispense_corrections(id,dispense_id) ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE TABLE public.pharmacy_operations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 command varchar(12) NOT NULL CHECK(command IN ('ROUTE','WITHDRAW','REROUTE','ACCEPT','DISPENSE','CORRECT','REVERSE')),
 operation_key uuid NOT NULL CHECK(operation_key::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'), fingerprint varchar(64) NOT NULL CHECK(fingerprint ~ '^[0-9a-f]{64}$'),
 target_route_id uuid NOT NULL REFERENCES public.pharmacy_routes(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 result_route_id uuid NOT NULL REFERENCES public.pharmacy_routes(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 result_route_version_id uuid, result_dispense_id uuid REFERENCES public.pharmacy_dispenses(id) ON DELETE RESTRICT ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED,
 result_correction_id uuid REFERENCES public.pharmacy_dispense_corrections(id) ON DELETE RESTRICT ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED,
 audit_id uuid NOT NULL UNIQUE REFERENCES public.audit_logs(id) ON DELETE RESTRICT ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED,
 recorded_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(actor_user_id,command,operation_key), UNIQUE(id,actor_user_id),
 FOREIGN KEY(result_route_version_id,result_route_id) REFERENCES public.pharmacy_route_versions(id,route_id) ON DELETE RESTRICT ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED,
 CHECK((command IN ('ROUTE','WITHDRAW','REROUTE','ACCEPT'))=(result_route_version_id IS NOT NULL)),
 CHECK((command IN ('DISPENSE','CORRECT','REVERSE'))=(result_dispense_id IS NOT NULL)),
 CHECK((command IN ('CORRECT','REVERSE'))=(result_correction_id IS NOT NULL)), CHECK(command='REROUTE' OR target_route_id=result_route_id)
);
ALTER TABLE public.pharmacy_route_versions ADD FOREIGN KEY(operation_id,actor_user_id) REFERENCES public.pharmacy_operations(id,actor_user_id) ON DELETE RESTRICT ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public.pharmacy_dispenses ADD FOREIGN KEY(operation_id,actor_user_id) REFERENCES public.pharmacy_operations(id,actor_user_id) ON DELETE RESTRICT ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public.pharmacy_dispense_corrections ADD FOREIGN KEY(operation_id,actor_user_id) REFERENCES public.pharmacy_operations(id,actor_user_id) ON DELETE RESTRICT ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED;
CREATE INDEX pharmacy_route_destination ON public.pharmacy_routes(pharmacy_id,created_at DESC,id);
CREATE INDEX pharmacy_route_source ON public.pharmacy_routes(root_id,created_at DESC,id);
CREATE FUNCTION public.i3_pharmacy_source(root uuid, dispensing boolean DEFAULT false) RETURNS boolean LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM public.prescriptions r JOIN LATERAL (SELECT * FROM public.prescription_versions WHERE root_id=r.id ORDER BY version DESC LIMIT 1) v ON true WHERE r.id=root AND v.state='SIGNED' AND v.valid_until>clock_timestamp() AND (NOT dispensing OR v.valid_from<=clock_timestamp()) AND NOT EXISTS(SELECT 1 FROM public.prescription_privacy_restrictions p WHERE p.lineage_id=r.lineage_id))
$$;
CREATE FUNCTION public.i3_pharmacy_member(member uuid, actor uuid, org uuid) RETURNS boolean LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM public.organization_memberships m JOIN public.organizations o ON o.id=m.organization_id JOIN public.users u ON u.id=m.user_id WHERE m.id=member AND m.user_id=actor AND m.organization_id=org AND m.user_role='PHARMACY_STAFF' AND m.organization_kind='PHARMACY' AND m.status='ACTIVE' AND m.ended_at IS NULL AND o.kind='PHARMACY' AND o.status='ACTIVE' AND u.role='PHARMACY_STAFF' AND u.status='ACTIVE')
$$;
CREATE FUNCTION public.i3_pharmacy_insert() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE route public.pharmacy_routes; prev public.pharmacy_route_versions; binding public.pharmacy_route_items; fact public.pharmacy_dispenses; correction public.pharmacy_dispense_corrections; item public.prescription_items;
BEGIN
 IF TG_TABLE_NAME='pharmacy_routes' THEN
  PERFORM id FROM public.prescriptions WHERE id=NEW.root_id FOR UPDATE;
  IF NOT public.i3_pharmacy_source(NEW.root_id) OR NOT EXISTS(SELECT 1 FROM public.prescriptions p JOIN public.clinician_patient_assignments g ON g.id=NEW.assignment_id AND g.patient_id=p.patient_id AND g.clinician_id=p.author_clinician_id WHERE p.id=NEW.root_id AND p.patient_id=NEW.patient_id AND p.author_user_id=NEW.author_user_id) OR NOT EXISTS(SELECT 1 FROM public.organizations WHERE id=NEW.pharmacy_id AND kind='PHARMACY' AND status='ACTIVE') THEN RAISE EXCEPTION 'Invalid pharmacy route' USING ERRCODE='23514'; END IF;
  IF NEW.predecessor_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.pharmacy_routes p WHERE p.id=NEW.predecessor_id AND p.root_id=NEW.root_id AND p.patient_id=NEW.patient_id AND p.pharmacy_id<>NEW.pharmacy_id) THEN RAISE EXCEPTION 'Invalid reroute' USING ERRCODE='23514'; END IF;
  NEW.created_at:=clock_timestamp();
 ELSIF TG_TABLE_NAME='pharmacy_route_items' THEN
  SELECT * INTO item FROM public.prescription_items WHERE id=NEW.item_id FOR UPDATE;
  IF item.root_id IS DISTINCT FROM NEW.root_id OR NOT EXISTS(SELECT 1 FROM public.prescription_version_items vi JOIN public.prescription_versions v ON v.id=vi.version_id WHERE vi.item_id=NEW.item_id AND v.root_id=NEW.root_id AND v.state='SIGNED') OR EXISTS(SELECT 1 FROM public.pharmacy_dispenses WHERE item_id=NEW.item_id) THEN RAISE EXCEPTION 'Invalid routed item' USING ERRCODE='23514'; END IF;
  SELECT * INTO binding FROM public.pharmacy_route_items WHERE item_id=NEW.item_id ORDER BY sequence DESC LIMIT 1;
  IF NEW.sequence<>coalesce(binding.sequence,0)+1 OR NEW.predecessor_id IS DISTINCT FROM binding.id OR (binding.id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.pharmacy_route_versions v WHERE v.route_id=binding.route_id AND v.state='WITHDRAWN')) THEN RAISE EXCEPTION 'Item already routed' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME='pharmacy_route_versions' THEN
  SELECT * INTO route FROM public.pharmacy_routes WHERE id=NEW.route_id FOR UPDATE;
  SELECT * INTO prev FROM public.pharmacy_route_versions WHERE route_id=NEW.route_id ORDER BY version DESC LIMIT 1;
  IF NEW.version<>coalesce(prev.version,0)+1 OR prev.id IS NOT NULL AND prev.state<>'PENDING' THEN RAISE EXCEPTION 'Invalid route transition' USING ERRCODE='23514'; END IF;
  IF NEW.command='ACCEPT' THEN
   IF NOT public.i3_pharmacy_source(route.root_id) OR NOT public.i3_pharmacy_member(NEW.membership_id,NEW.actor_user_id,route.pharmacy_id) THEN RAISE EXCEPTION 'Invalid acceptance authority' USING ERRCODE='23514'; END IF;
  ELSIF NEW.actor_user_id<>route.author_user_id OR NOT EXISTS(SELECT 1 FROM public.clinician_patient_assignments g JOIN public.prescriptions r ON r.id=route.root_id AND r.patient_id=g.patient_id AND r.author_clinician_id=g.clinician_id WHERE g.id=NEW.assignment_id) THEN RAISE EXCEPTION 'Invalid route author' USING ERRCODE='23514'; END IF;
  NEW.recorded_at:=clock_timestamp();
 ELSIF TG_TABLE_NAME='pharmacy_dispenses' THEN
  SELECT * INTO route FROM public.pharmacy_routes WHERE id=NEW.route_id FOR UPDATE;
  SELECT * INTO item FROM public.prescription_items WHERE id=NEW.item_id FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM public.pharmacy_route_versions WHERE route_id=NEW.route_id AND state='ACCEPTED') OR NOT public.i3_pharmacy_source(route.root_id,true) OR NOT public.i3_pharmacy_member(NEW.membership_id,NEW.actor_user_id,route.pharmacy_id) THEN RAISE EXCEPTION 'Invalid dispense authority' USING ERRCODE='23514'; END IF;
  NEW.medication_id:=item.medication_id;NEW.medication_display:=item.medication_display;NEW.quantity:=item.quantity;NEW.unit:=item.unit;NEW.recorded_at:=clock_timestamp();
 ELSIF TG_TABLE_NAME='pharmacy_dispense_corrections' THEN
  SELECT * INTO fact FROM public.pharmacy_dispenses WHERE id=NEW.dispense_id FOR UPDATE;
  SELECT * INTO correction FROM public.pharmacy_dispense_corrections WHERE dispense_id=NEW.dispense_id ORDER BY version DESC LIMIT 1;
  IF NEW.version<>coalesce(correction.version,0)+1 OR NEW.predecessor_id IS DISTINCT FROM correction.id OR correction.kind='REVERSAL' OR NOT public.i3_pharmacy_member(NEW.membership_id,NEW.actor_user_id,fact.pharmacy_id) OR EXISTS(SELECT 1 FROM public.prescriptions r JOIN public.prescription_privacy_restrictions p ON p.lineage_id=r.lineage_id WHERE r.id=fact.root_id) THEN RAISE EXCEPTION 'Invalid dispense correction' USING ERRCODE='23514'; END IF;
  NEW.recorded_at:=clock_timestamp();
 END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION public.i3_pharmacy_complete() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE op public.pharmacy_operations; route public.pharmacy_routes;
BEGIN
 IF TG_TABLE_NAME='pharmacy_routes' THEN
  IF NOT public.i3_pharmacy_source(NEW.root_id) OR NOT EXISTS(SELECT 1 FROM public.pharmacy_route_versions WHERE route_id=NEW.id AND version=1 AND state='PENDING') OR (SELECT count(*) FROM public.pharmacy_route_items WHERE route_id=NEW.id) NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'Incomplete route' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME='pharmacy_route_items' THEN
  IF NOT EXISTS(SELECT 1 FROM public.pharmacy_routes r WHERE r.id=NEW.route_id AND r.xmin=((pg_current_xact_id()::text::numeric % 4294967296)::text)::xid) THEN RAISE EXCEPTION 'Immutable route items' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME='pharmacy_route_versions' THEN
  IF NEW.command='ACCEPT' AND NOT EXISTS(SELECT 1 FROM public.pharmacy_routes r WHERE r.id=NEW.route_id AND public.i3_pharmacy_source(r.root_id)) THEN RAISE EXCEPTION 'Expired acceptance' USING ERRCODE='23514'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.pharmacy_operations o WHERE o.id=NEW.operation_id AND o.command=NEW.command AND o.actor_user_id=NEW.actor_user_id AND NEW.route_id IN (o.target_route_id,o.result_route_id)) THEN RAISE EXCEPTION 'Missing route operation' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME='pharmacy_dispenses' THEN
  IF NOT public.i3_pharmacy_source(NEW.root_id,true) OR NOT EXISTS(SELECT 1 FROM public.pharmacy_operations WHERE id=NEW.operation_id AND command='DISPENSE' AND result_dispense_id=NEW.id AND actor_user_id=NEW.actor_user_id AND result_route_id=NEW.route_id) THEN RAISE EXCEPTION 'Missing eligible dispense operation' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME='pharmacy_dispense_corrections' THEN
  IF NOT EXISTS(SELECT 1 FROM public.pharmacy_operations WHERE id=NEW.operation_id AND command=CASE WHEN NEW.kind='CORRECTION' THEN 'CORRECT' ELSE 'REVERSE' END AND result_correction_id=NEW.id AND actor_user_id=NEW.actor_user_id AND result_dispense_id=NEW.dispense_id AND result_route_id=NEW.route_id) THEN RAISE EXCEPTION 'Missing correction operation' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME='pharmacy_operations' THEN
  op:=NEW;SELECT * INTO route FROM public.pharmacy_routes WHERE id=op.target_route_id;
  IF NOT EXISTS(SELECT 1 FROM public.audit_logs WHERE id=op.audit_id AND actor_user_id=op.actor_user_id AND entity_type='pharmacy_route' AND entity_id=op.target_route_id AND action_type='PHARMACY_'||op.command AND safe_metadata='{}'::jsonb) THEN RAISE EXCEPTION 'Missing pharmacy audit' USING ERRCODE='23514'; END IF;
  IF op.result_route_version_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.pharmacy_route_versions WHERE id=op.result_route_version_id AND route_id=op.result_route_id AND operation_id=op.id AND command=op.command AND actor_user_id=op.actor_user_id) THEN RAISE EXCEPTION 'Missing route result' USING ERRCODE='23514'; END IF;
  IF op.command='DISPENSE' AND NOT EXISTS(SELECT 1 FROM public.pharmacy_dispenses d WHERE d.id=op.result_dispense_id AND d.route_id=op.result_route_id AND d.operation_id=op.id AND d.actor_user_id=op.actor_user_id) THEN RAISE EXCEPTION 'Missing dispense result' USING ERRCODE='23514'; END IF;
  IF op.command IN ('CORRECT','REVERSE') AND NOT EXISTS(SELECT 1 FROM public.pharmacy_dispense_corrections c WHERE c.id=op.result_correction_id AND c.dispense_id=op.result_dispense_id AND c.route_id=op.result_route_id AND c.operation_id=op.id AND c.actor_user_id=op.actor_user_id) THEN RAISE EXCEPTION 'Missing correction result' USING ERRCODE='23514'; END IF;
  IF op.command='REROUTE' AND NOT EXISTS(SELECT 1 FROM public.pharmacy_routes n JOIN public.pharmacy_route_versions ov ON ov.route_id=route.id AND ov.operation_id=op.id AND ov.state='WITHDRAWN' JOIN public.pharmacy_route_versions nv ON nv.id=op.result_route_version_id AND nv.route_id=n.id AND nv.reason=ov.reason WHERE n.id=op.result_route_id AND n.predecessor_id=route.id AND n.root_id=route.root_id AND n.patient_id=route.patient_id AND n.pharmacy_id<>route.pharmacy_id) THEN RAISE EXCEPTION 'Incomplete atomic reroute' USING ERRCODE='23514'; END IF;
  IF op.command='REROUTE' AND (SELECT array_agg(item_id ORDER BY item_id) FROM public.pharmacy_route_items WHERE route_id=op.target_route_id) IS DISTINCT FROM (SELECT array_agg(item_id ORDER BY item_id) FROM public.pharmacy_route_items WHERE route_id=op.result_route_id) THEN RAISE EXCEPTION 'Changed rerouted items' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NULL;
END $$;
DO $$ DECLARE t text;BEGIN
 FOREACH t IN ARRAY ARRAY['pharmacy_routes','pharmacy_route_items','pharmacy_route_versions','pharmacy_dispenses','pharmacy_dispense_corrections'] LOOP
  EXECUTE format('CREATE TRIGGER pharmacy_insert BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.i3_pharmacy_insert()',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['pharmacy_routes','pharmacy_route_items','pharmacy_route_versions','pharmacy_dispenses','pharmacy_dispense_corrections','pharmacy_operations'] LOOP
  EXECUTE format('CREATE CONSTRAINT TRIGGER pharmacy_complete AFTER INSERT ON public.%I DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.i3_pharmacy_complete()',t);
  EXECUTE format('CREATE TRIGGER pharmacy_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.i2_immutable()',t);
 END LOOP;
END $$;
CREATE TRIGGER pharmacy_operation_time BEFORE INSERT ON public.pharmacy_operations FOR EACH ROW EXECUTE FUNCTION public.i3_recorded_time();
-- Queue readers hold the recipient organization FOR SHARE. These additive
-- triggers make actual source cancel/replace/privacy writers conflict with it.
CREATE FUNCTION public.i3_pharmacy_source_fence() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE source_id uuid; lineage uuid;
BEGIN
 IF TG_TABLE_NAME='prescription_privacy_restrictions' THEN lineage:=NEW.lineage_id;
 ELSIF NEW.command IN ('CANCEL','REPLACE') THEN source_id:=NEW.root_id;
 ELSE RETURN NEW; END IF;
 PERFORM o.id FROM public.organizations o WHERE o.id IN (SELECT r.pharmacy_id FROM public.pharmacy_routes r JOIN public.prescriptions p ON p.id=r.root_id WHERE p.id=source_id OR p.lineage_id=lineage) ORDER BY o.id FOR UPDATE;
 RETURN NEW;
END $$;
CREATE TRIGGER pharmacy_source_fence BEFORE INSERT ON public.prescription_versions FOR EACH ROW EXECUTE FUNCTION public.i3_pharmacy_source_fence();
CREATE TRIGGER pharmacy_privacy_fence BEFORE INSERT ON public.prescription_privacy_restrictions FOR EACH ROW EXECUTE FUNCTION public.i3_pharmacy_source_fence();
CREATE FUNCTION public.i3_pharmacy_route_state(target uuid) RETURNS text LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
 SELECT CASE WHEN rv.state='WITHDRAWN' THEN 'WITHDRAWN'
 WHEN NOT EXISTS(SELECT 1 FROM public.pharmacy_route_items ri WHERE ri.route_id=r.id AND NOT EXISTS(SELECT 1 FROM public.pharmacy_dispenses d WHERE d.item_id=ri.item_id)) THEN 'COMPLETED'
 WHEN pv.state IN ('CANCELLED','REPLACED') THEN pv.state WHEN pv.valid_until<=clock_timestamp() THEN 'EXPIRED' ELSE rv.state END
 FROM public.pharmacy_routes r JOIN LATERAL(SELECT * FROM public.pharmacy_route_versions WHERE route_id=r.id ORDER BY version DESC LIMIT 1) rv ON true JOIN LATERAL(SELECT * FROM public.prescription_versions WHERE root_id=r.root_id ORDER BY version DESC LIMIT 1) pv ON true WHERE r.id=target
$$;
CREATE FUNCTION public.i3_pharmacy_item_projection(target uuid, page integer, size integer) RETURNS jsonb LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
 SELECT jsonb_build_object('fulfillmentState',CASE WHEN d.id IS NULL THEN 'NOT_DISPENSED' ELSE 'FULLY_DISPENSED' END,
 'routingHistory',coalesce((SELECT jsonb_agg(x.value ORDER BY x.stamp DESC,x.id) FROM (SELECT r.id,r.created_at stamp,jsonb_build_object('id',r.id,'pharmacyId',r.pharmacy_id,'pharmacyName',o.name,'state',public.i3_pharmacy_route_state(r.id),'createdAt',r.created_at,'predecessorId',r.predecessor_id,'transitions',(SELECT jsonb_agg(jsonb_build_object('state',v.state,'recordedAt',v.recorded_at,'reason',v.reason) ORDER BY v.version) FROM public.pharmacy_route_versions v WHERE v.route_id=r.id)) value FROM public.pharmacy_route_items ri JOIN public.pharmacy_routes r ON r.id=ri.route_id JOIN public.organizations o ON o.id=r.pharmacy_id WHERE ri.item_id=target ORDER BY r.created_at DESC,r.id LIMIT size OFFSET (page-1)*size) x),'[]'::jsonb),
 'routingHistoryMeta',jsonb_build_object('page',page,'pageSize',size,'total',(SELECT count(*) FROM public.pharmacy_route_items WHERE item_id=target)),
 'dispense',CASE WHEN d.id IS NULL THEN NULL ELSE jsonb_build_object('id',d.id,'routeId',d.route_id,'pharmacyId',d.pharmacy_id,'pharmacyName',(SELECT name FROM public.organizations WHERE id=d.pharmacy_id),'dispensedAt',d.recorded_at,'medicationId',d.medication_id,'medicationDisplay',d.medication_display,'quantity',trim(trailing '.' FROM trim(trailing '0' FROM d.quantity::text)),'unit',d.unit,
 'correctionVersion',coalesce((SELECT max(version) FROM public.pharmacy_dispense_corrections WHERE dispense_id=d.id),0),
 'corrections',coalesce((SELECT jsonb_agg(x.value ORDER BY x.version) FROM (SELECT c.version,jsonb_build_object('id',c.id,'kind',c.kind,'reason',c.reason,'recordedAt',c.recorded_at) value FROM public.pharmacy_dispense_corrections c WHERE c.dispense_id=d.id ORDER BY c.version DESC LIMIT size OFFSET (page-1)*size) x),'[]'::jsonb),
 'correctionHistoryMeta',jsonb_build_object('page',page,'pageSize',size,'total',(SELECT count(*) FROM public.pharmacy_dispense_corrections WHERE dispense_id=d.id)),
 'reversed',EXISTS(SELECT 1 FROM public.pharmacy_dispense_corrections WHERE dispense_id=d.id AND kind='REVERSAL')) END)
 FROM (SELECT 1) seed LEFT JOIN public.pharmacy_dispenses d ON d.item_id=target
 WHERE EXISTS(SELECT 1 FROM public.prescription_items i JOIN public.prescriptions p ON p.id=i.root_id WHERE i.id=target AND NOT EXISTS(SELECT 1 FROM public.prescription_privacy_restrictions pr WHERE pr.lineage_id=p.lineage_id))
$$;

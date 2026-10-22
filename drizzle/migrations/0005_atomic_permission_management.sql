CREATE FUNCTION public.set_feature_permissions(p_user_id uuid,p_organization_id uuid,p_permissions jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE f text; g jsonb;
BEGIN
IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Not permitted'; END IF;
IF (p_user_id IS NULL) = (p_organization_id IS NULL) THEN RAISE EXCEPTION 'Exactly one permission target required'; END IF;
IF p_user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.managed_accounts WHERE user_id=p_user_id) THEN RAISE EXCEPTION 'Managed account required'; END IF;
FOREACH f IN ARRAY ARRAY['cards','themes','qr','fonts','templates'] LOOP
 g=p_permissions->f;
 IF g IS NULL OR jsonb_typeof(g)<>'object' THEN RAISE EXCEPTION 'Invalid permissions'; END IF;
 IF p_user_id IS NOT NULL THEN
 INSERT INTO public.feature_permissions(user_id,feature,can_view,can_add,can_edit,can_delete) VALUES(p_user_id,f,(g->>'view')::boolean,(g->>'add')::boolean,(g->>'edit')::boolean,(g->>'delete')::boolean) ON CONFLICT(user_id,feature) WHERE user_id IS NOT NULL DO UPDATE SET can_view=excluded.can_view,can_add=excluded.can_add,can_edit=excluded.can_edit,can_delete=excluded.can_delete;
 ELSE
 INSERT INTO public.feature_permissions(organization_id,feature,can_view,can_add,can_edit,can_delete) VALUES(p_organization_id,f,(g->>'view')::boolean,(g->>'add')::boolean,(g->>'edit')::boolean,(g->>'delete')::boolean) ON CONFLICT(organization_id,feature) WHERE organization_id IS NOT NULL DO UPDATE SET can_view=excluded.can_view,can_add=excluded.can_add,can_edit=excluded.can_edit,can_delete=excluded.can_delete;
 END IF;
END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.set_feature_permissions(uuid,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_feature_permissions(uuid,uuid,jsonb) TO authenticated;
CREATE FUNCTION public.enforce_template_features() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE old_theme text;old_font text;new_theme text;new_font text;
BEGIN
IF auth.role()='service_role' THEN RETURN NEW; END IF;
new_theme=COALESCE(NEW.design->>'theme','royal');new_font=COALESCE(NEW.design->>'font','classic');
IF TG_OP='INSERT' THEN
IF new_theme<>'royal' AND NOT public.has_feature_permission('themes','add') THEN RAISE EXCEPTION 'Custom themes are not enabled'; END IF;
IF new_font<>'classic' AND NOT public.has_feature_permission('fonts','add') THEN RAISE EXCEPTION 'Font customization is not enabled'; END IF;
ELSE
old_theme=COALESCE(OLD.design->>'theme','royal');old_font=COALESCE(OLD.design->>'font','classic');
IF new_theme<>old_theme AND (NOT public.has_feature_permission('themes','view') OR NOT public.has_feature_permission('themes',CASE WHEN new_theme='royal' THEN 'delete' WHEN old_theme='royal' THEN 'add' ELSE 'edit' END)) THEN RAISE EXCEPTION 'Theme change is not permitted'; END IF;
IF new_font<>old_font AND (NOT public.has_feature_permission('fonts','view') OR NOT public.has_feature_permission('fonts',CASE WHEN new_font='classic' THEN 'delete' WHEN old_font='classic' THEN 'add' ELSE 'edit' END)) THEN RAISE EXCEPTION 'Font change is not permitted'; END IF;
END IF;
RETURN NEW;
END $$;
CREATE TRIGGER template_feature_permissions BEFORE INSERT OR UPDATE ON public.card_templates FOR EACH ROW EXECUTE FUNCTION public.enforce_template_features();
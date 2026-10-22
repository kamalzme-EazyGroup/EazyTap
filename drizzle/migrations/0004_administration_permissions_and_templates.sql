CREATE TYPE public.app_role AS ENUM ('super_admin');
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role public.app_role NOT NULL, UNIQUE(user_id, role));
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.is_super_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='super_admin') $$;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
CREATE POLICY "Read own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE TABLE public.organizations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super administrator manages organizations" ON public.organizations FOR ALL TO authenticated USING(public.is_super_admin()) WITH CHECK(public.is_super_admin());
CREATE TABLE public.managed_accounts (user_id uuid PRIMARY KEY, email text NOT NULL, organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.managed_accounts TO authenticated;
GRANT ALL ON public.managed_accounts TO service_role;
ALTER TABLE public.managed_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super administrator manages accounts" ON public.managed_accounts FOR ALL TO authenticated USING(public.is_super_admin()) WITH CHECK(public.is_super_admin());
CREATE POLICY "Users read own membership" ON public.managed_accounts FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE TABLE public.feature_permissions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE, feature text NOT NULL CHECK(feature IN ('cards','themes','qr','fonts','templates')), can_view boolean NOT NULL DEFAULT false, can_add boolean NOT NULL DEFAULT false, can_edit boolean NOT NULL DEFAULT false, can_delete boolean NOT NULL DEFAULT false, CHECK ((user_id IS NULL) <> (organization_id IS NULL)));
CREATE UNIQUE INDEX permission_user_feature ON public.feature_permissions(user_id,feature) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX permission_org_feature ON public.feature_permissions(organization_id,feature) WHERE organization_id IS NOT NULL;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.feature_permissions TO authenticated;
GRANT ALL ON public.feature_permissions TO service_role;
ALTER TABLE public.feature_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super administrator manages permissions" ON public.feature_permissions FOR ALL TO authenticated USING(public.is_super_admin()) WITH CHECK(public.is_super_admin());
CREATE POLICY "Users read applicable permissions" ON public.feature_permissions FOR SELECT TO authenticated USING(user_id=auth.uid() OR organization_id IN (SELECT organization_id FROM public.managed_accounts WHERE user_id=auth.uid()));
CREATE FUNCTION public.has_feature_permission(p_feature text,p_action text) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE permission public.feature_permissions; org uuid;
BEGIN
IF auth.uid() IS NULL THEN RETURN false; END IF;
IF p_feature NOT IN ('cards','themes','qr','fonts','templates') OR p_action NOT IN ('view','add','edit','delete') THEN RETURN false; END IF;
IF public.is_super_admin() THEN RETURN true; END IF;
SELECT * INTO permission FROM public.feature_permissions WHERE user_id=auth.uid() AND feature=p_feature;
IF NOT FOUND THEN
SELECT organization_id INTO org FROM public.managed_accounts WHERE user_id=auth.uid();
SELECT * INTO permission FROM public.feature_permissions WHERE organization_id=org AND feature=p_feature;
IF NOT FOUND THEN RETURN NOT EXISTS(SELECT 1 FROM public.managed_accounts WHERE user_id=auth.uid()); END IF;
END IF;
RETURN CASE p_action WHEN 'view' THEN permission.can_view WHEN 'add' THEN permission.can_add WHEN 'edit' THEN permission.can_edit WHEN 'delete' THEN permission.can_delete ELSE false END;
END $$;
GRANT EXECUTE ON FUNCTION public.has_feature_permission(text,text) TO authenticated;
ALTER POLICY "Owners insert cards" ON public.cards WITH CHECK(auth.uid()=user_id AND public.has_feature_permission('cards','add'));
ALTER POLICY "Owners update cards" ON public.cards USING(auth.uid()=user_id AND public.has_feature_permission('cards','view') AND public.has_feature_permission('cards','edit')) WITH CHECK(auth.uid()=user_id AND public.has_feature_permission('cards','edit'));
ALTER POLICY "Owners delete cards" ON public.cards USING(auth.uid()=user_id AND public.has_feature_permission('cards','view') AND public.has_feature_permission('cards','delete'));
CREATE FUNCTION public.enforce_card_feature_permissions() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
IF auth.role()='service_role' THEN RETURN NEW; END IF;
IF TG_OP='INSERT' THEN
IF NEW.theme<>'royal' AND NOT public.has_feature_permission('themes','add') THEN RAISE EXCEPTION 'Custom themes are not enabled for your account'; END IF;
IF NEW.font<>'classic' AND NOT public.has_feature_permission('fonts','add') THEN RAISE EXCEPTION 'Font customization is not enabled for your account'; END IF;
IF NEW.qr_settings<>'{}'::jsonb AND NOT public.has_feature_permission('qr','add') THEN RAISE EXCEPTION 'QR customization is not enabled for your account'; END IF;
ELSE
IF NEW.theme IS DISTINCT FROM OLD.theme AND (NOT public.has_feature_permission('themes','view') OR NOT public.has_feature_permission('themes',CASE WHEN NEW.theme='royal' THEN 'delete' WHEN OLD.theme='royal' THEN 'add' ELSE 'edit' END)) THEN RAISE EXCEPTION 'Theme change is not permitted'; END IF;
IF NEW.font IS DISTINCT FROM OLD.font AND (NOT public.has_feature_permission('fonts','view') OR NOT public.has_feature_permission('fonts',CASE WHEN NEW.font='classic' THEN 'delete' WHEN OLD.font='classic' THEN 'add' ELSE 'edit' END)) THEN RAISE EXCEPTION 'Font change is not permitted'; END IF;
IF NEW.qr_settings IS DISTINCT FROM OLD.qr_settings THEN
IF NOT public.has_feature_permission('qr','view') OR NOT public.has_feature_permission('qr',CASE WHEN OLD.qr_settings='{}'::jsonb THEN 'add' WHEN NEW.qr_settings='{}'::jsonb THEN 'delete' ELSE 'edit' END) THEN RAISE EXCEPTION 'QR change is not permitted'; END IF;
IF COALESCE(NEW.qr_settings->>'logo','')<>'' AND COALESCE(OLD.qr_settings->>'logo','')='' AND NOT public.has_feature_permission('qr','add') THEN RAISE EXCEPTION 'Adding QR logos is not permitted'; END IF;
IF COALESCE(NEW.qr_settings->>'logo','')='' AND COALESCE(OLD.qr_settings->>'logo','')<>'' AND NOT public.has_feature_permission('qr','delete') THEN RAISE EXCEPTION 'Removing QR logos is not permitted'; END IF;
END IF;
END IF;
RETURN NEW;
END $$;
CREATE TRIGGER card_feature_permissions BEFORE INSERT OR UPDATE ON public.cards FOR EACH ROW EXECUTE FUNCTION public.enforce_card_feature_permissions();
CREATE TABLE public.card_templates (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, name text NOT NULL DEFAULT 'My template', design jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.card_templates TO authenticated;
GRANT ALL ON public.card_templates TO service_role;
ALTER TABLE public.card_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view templates" ON public.card_templates FOR SELECT TO authenticated USING(user_id=auth.uid() AND public.has_feature_permission('templates','view'));
CREATE POLICY "Owners add templates" ON public.card_templates FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() AND public.has_feature_permission('templates','view') AND public.has_feature_permission('templates','add'));
CREATE POLICY "Owners edit templates" ON public.card_templates FOR UPDATE TO authenticated USING(user_id=auth.uid() AND public.has_feature_permission('templates','view') AND public.has_feature_permission('templates','edit')) WITH CHECK(user_id=auth.uid() AND public.has_feature_permission('templates','edit'));
CREATE POLICY "Owners delete templates" ON public.card_templates FOR DELETE TO authenticated USING(user_id=auth.uid() AND public.has_feature_permission('templates','view') AND public.has_feature_permission('templates','delete'));
CREATE TRIGGER template_updated_at BEFORE UPDATE ON public.card_templates FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE FUNCTION public.enforce_template_qr_link() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE previous text;current_slug text;
BEGIN
IF auth.role()='service_role' THEN RETURN NEW; END IF;
current_slug=COALESCE(NEW.design->>'cardSlug','');
IF TG_OP='INSERT' THEN previous=''; ELSE previous=COALESCE(OLD.design->>'cardSlug',''); END IF;
IF current_slug IS DISTINCT FROM previous THEN
 IF NOT public.has_feature_permission('qr','view') OR NOT public.has_feature_permission('qr',CASE WHEN current_slug='' THEN 'delete' WHEN previous='' THEN 'add' ELSE 'edit' END) THEN RAISE EXCEPTION 'QR linking is not permitted'; END IF;
 IF current_slug<>'' AND (NOT public.has_feature_permission('cards','view') OR NOT EXISTS(SELECT 1 FROM public.cards WHERE slug=current_slug AND user_id=auth.uid())) THEN RAISE EXCEPTION 'Choose one of your own business cards'; END IF;
END IF;
RETURN NEW;
END $$;
CREATE TRIGGER template_qr_link_permission BEFORE INSERT OR UPDATE ON public.card_templates FOR EACH ROW EXECUTE FUNCTION public.enforce_template_qr_link();
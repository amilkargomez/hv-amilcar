-- Restrict admin to only amilkargomez@hotmail.es
-- Grant role if user already exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'amilkargomez@hotmail.es'
ON CONFLICT DO NOTHING;

-- Replace claim function: only the allowed email becomes admin
CREATE OR REPLACE FUNCTION public.claim_admin_if_first()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  IF user_email <> 'amilkargomez@hotmail.es' THEN
    RETURN public.has_role(auth.uid(), 'admin');
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'admin') ON CONFLICT DO NOTHING;
  RETURN TRUE;
END;
$function$;
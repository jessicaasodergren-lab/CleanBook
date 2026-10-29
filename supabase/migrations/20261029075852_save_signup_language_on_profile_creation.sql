CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name, language)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'host')::text,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Ny Användare'),
    COALESCE(
      new.raw_user_meta_data->>'language',
      CASE WHEN COALESCE(new.raw_user_meta_data->>'role', 'host') = 'host' THEN 'sv' ELSE 'es' END
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name;

  RETURN new;
END;
$function$;

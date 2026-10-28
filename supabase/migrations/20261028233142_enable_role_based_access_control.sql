/*
# Enable row level security with host and cleaner access rules

1. What this does
- Turns on row level security for every app table so each signed-in user only sees their own data.
- Hosts see and manage their own properties, the bookings on those properties, and the incidents reported for them.
- Cleaners see the properties they are connected to, the bookings on those properties, and can report incidents and update booking status.
- Cleaners connect to a property with an invite code through a secure function, so the invite codes themselves are never readable by other users.

2. Tables affected
- `properties`: hosts manage their own; connected cleaners can read.
- `property_connections`: cleaners manage their own connections; hosts can read the cleaners connected to their properties.
- `bookings`: hosts manage bookings on their properties; connected cleaners can read and update them.
- `incidents`: visible to the host and connected cleaners of the booking; cleaners can create them.
- `profiles`: users manage their own profile; users can read profiles of people they work with.

3. Security changes
- Row level security enabled on all five tables.
- Anonymous (not signed in) access removed from all tables.
- Each signed-in role only gets the verbs the app actually uses.
- Old policies that were too broad are removed and replaced.
- New function `connect_cleaner_by_invite` lets a cleaner connect to a property by invite code without reading any other property.

4. Notes
- No data is deleted or changed.
- Row level security uses the existing helper functions to avoid policies looping between tables.
*/

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON properties, property_connections, bookings, incidents, profiles FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON properties TO authenticated;
GRANT SELECT, UPDATE, DELETE ON property_connections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON bookings TO authenticated;
GRANT SELECT, INSERT ON incidents TO authenticated;
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;

DROP POLICY IF EXISTS "Allow select on properties" ON properties;
DROP POLICY IF EXISTS "Allow select on connections" ON property_connections;
DROP POLICY IF EXISTS "Allow update on connections" ON property_connections;
DROP POLICY IF EXISTS "Manage bookings policy" ON bookings;
DROP POLICY IF EXISTS "Allow authenticated users to insert incidents" ON incidents;
DROP POLICY IF EXISTS "Allow authenticated users to select incidents" ON incidents;
DROP POLICY IF EXISTS "Allow authenticated users to read profile names" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

REVOKE EXECUTE ON FUNCTION public.is_host_of_property(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_cleaner_connected_to_property(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_host_of_property(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_cleaner_connected_to_property(uuid, uuid) TO authenticated;

-- properties
DROP POLICY IF EXISTS "properties_select_host_or_connected_cleaner" ON properties;
CREATE POLICY "properties_select_host_or_connected_cleaner" ON properties FOR SELECT
TO authenticated
USING (host_id = auth.uid() OR is_cleaner_connected_to_property(id, auth.uid()));

DROP POLICY IF EXISTS "properties_insert_own" ON properties;
CREATE POLICY "properties_insert_own" ON properties FOR INSERT
TO authenticated
WITH CHECK (host_id = auth.uid());

DROP POLICY IF EXISTS "properties_update_own" ON properties;
CREATE POLICY "properties_update_own" ON properties FOR UPDATE
TO authenticated
USING (host_id = auth.uid())
WITH CHECK (host_id = auth.uid());

DROP POLICY IF EXISTS "properties_delete_own" ON properties;
CREATE POLICY "properties_delete_own" ON properties FOR DELETE
TO authenticated
USING (host_id = auth.uid());

-- property_connections
DROP POLICY IF EXISTS "connections_select_cleaner_or_host" ON property_connections;
CREATE POLICY "connections_select_cleaner_or_host" ON property_connections FOR SELECT
TO authenticated
USING (cleaner_id = auth.uid() OR is_host_of_property(property_id, auth.uid()));

DROP POLICY IF EXISTS "connections_update_own" ON property_connections;
CREATE POLICY "connections_update_own" ON property_connections FOR UPDATE
TO authenticated
USING (cleaner_id = auth.uid())
WITH CHECK (cleaner_id = auth.uid());

DROP POLICY IF EXISTS "connections_delete_own" ON property_connections;
CREATE POLICY "connections_delete_own" ON property_connections FOR DELETE
TO authenticated
USING (cleaner_id = auth.uid());

-- bookings
DROP POLICY IF EXISTS "bookings_select_host_or_cleaner" ON bookings;
CREATE POLICY "bookings_select_host_or_cleaner" ON bookings FOR SELECT
TO authenticated
USING (is_host_of_property(property_id, auth.uid()) OR is_cleaner_connected_to_property(property_id, auth.uid()));

DROP POLICY IF EXISTS "bookings_insert_host" ON bookings;
CREATE POLICY "bookings_insert_host" ON bookings FOR INSERT
TO authenticated
WITH CHECK (is_host_of_property(property_id, auth.uid()));

DROP POLICY IF EXISTS "bookings_update_host_or_cleaner" ON bookings;
CREATE POLICY "bookings_update_host_or_cleaner" ON bookings FOR UPDATE
TO authenticated
USING (is_host_of_property(property_id, auth.uid()) OR is_cleaner_connected_to_property(property_id, auth.uid()))
WITH CHECK (is_host_of_property(property_id, auth.uid()) OR is_cleaner_connected_to_property(property_id, auth.uid()));

DROP POLICY IF EXISTS "bookings_delete_host" ON bookings;
CREATE POLICY "bookings_delete_host" ON bookings FOR DELETE
TO authenticated
USING (is_host_of_property(property_id, auth.uid()));

-- incidents
DROP POLICY IF EXISTS "incidents_select_host_or_cleaner" ON incidents;
CREATE POLICY "incidents_select_host_or_cleaner" ON incidents FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM bookings b
  WHERE b.id = incidents.booking_id
    AND (is_host_of_property(b.property_id, auth.uid()) OR is_cleaner_connected_to_property(b.property_id, auth.uid()))
));

DROP POLICY IF EXISTS "incidents_insert_cleaner" ON incidents;
CREATE POLICY "incidents_insert_cleaner" ON incidents FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM bookings b
  WHERE b.id = incidents.booking_id
    AND is_cleaner_connected_to_property(b.property_id, auth.uid())
));

-- profiles
DROP POLICY IF EXISTS "profiles_select_self_or_colleague" ON profiles;
CREATE POLICY "profiles_select_self_or_colleague" ON profiles FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM properties p
    WHERE p.host_id = profiles.id AND is_cleaner_connected_to_property(p.id, auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM property_connections pc
    WHERE pc.cleaner_id = profiles.id AND is_host_of_property(pc.property_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- invite code connection
CREATE OR REPLACE FUNCTION public.connect_cleaner_by_invite(p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_property_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT id INTO v_property_id
  FROM properties
  WHERE invite_code = upper(trim(p_code));

  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_CODE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM property_connections
    WHERE property_id = v_property_id AND cleaner_id = v_user
  ) THEN
    RAISE EXCEPTION 'ALREADY_CONNECTED';
  END IF;

  INSERT INTO property_connections (property_id, cleaner_id)
  VALUES (v_property_id, v_user);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.connect_cleaner_by_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.connect_cleaner_by_invite(text) TO authenticated;

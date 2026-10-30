/*
# Secure cleaner invitations and property assignments

Replaces the static, reusable property invite code with one-time invitation codes, adds an ending state to cleaner-property connections, and moves the cleaner's private notes and cleaning time out of the shared connection row so hosts can no longer read them. Cleaners keep read access to the work they completed after a connection ends.

1. New Tables
- `property_invitations`: one-time invitation codes, stored only as SHA-256 hashes. Columns: id, property_id, code_hash (unique), created_by, created_at, expires_at (7 days after creation), redeemed_at, redeemed_by, revoked_at. App users have no direct access; only the functions below touch this table.
- `cleaner_property_settings`: a cleaner's private cleaning time and internal notes per property. Columns: cleaner_id, property_id (together the primary key), cleaning_time, internal_notes, updated_at. Only the cleaner can read or write her own rows.

2. Modified Tables
- `property_connections`: new columns `status` ('active' or 'terminated', default 'active') and `ended_at`. Terminated rows are kept as history. The old `cleaning_time` and `internal_notes` columns are kept (no data is removed), their values were copied to `cleaner_property_settings`, and app users can no longer read them.
- `bookings`: `cleaner_id` now records which cleaner accepted or finished a task. Status changes go through `update_booking_status`. An index on `cleaner_id` was added.
- `properties`: the static `invite_code` values were cleared and its default removed. Codes are now created per invitation by `create_property_invitation`.

3. Functions (SECURITY DEFINER, EXECUTE granted only to authenticated)
- `create_property_invitation(p_property_id)`: a host creates a one-time code. The code is returned once and only its hash is stored. Older unused codes for that property are revoked.
- `connect_cleaner_by_invite(p_code)`: a cleaner redeems a code. Redemption is atomic and the code is marked used in the same step. Unknown, used, revoked or expired codes are rejected with the same error.
- `end_connection(p_connection_id)`: a host removes a cleaner, or a cleaner leaves a property. The connection becomes terminated and that cleaner's accepted but unfinished tasks become pending again.
- `update_booking_status(p_booking_id, p_status)`: a connected cleaner accepts, reopens or finishes a task. Ownership and allowed transitions are enforced on the server.
- `is_cleaner_connected_to_property`: now counts only active connections.

4. Security Changes
- RLS is enabled on both new tables. `property_invitations` has no client grants at all.
- Cleaners lose UPDATE and DELETE on `property_connections`. They can read only their own connection rows, and only the non-private columns.
- Hosts can no longer read a cleaner's private notes or cleaning time.
- App users lose UPDATE on `bookings`. Status changes must go through `update_booking_status`.
- Cleaners whose connection has ended can still read bookings they finished, and the name and address of those properties.
- All new functions revoke EXECUTE from PUBLIC and anon.

5. Important Notes
- Old static invite codes stop working immediately.
- Accepted tasks that were created before this change without a recorded cleaner are not released automatically when a connection ends.
- Existing rows are never deleted by this migration.
*/

CREATE TABLE IF NOT EXISTS property_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  code_hash text NOT NULL UNIQUE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  redeemed_at timestamptz,
  redeemed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS property_invitations_property_id_idx ON property_invitations (property_id);

ALTER TABLE property_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON property_invitations FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS cleaner_property_settings (
  cleaner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  cleaning_time text,
  internal_notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cleaner_id, property_id)
);

ALTER TABLE cleaner_property_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON cleaner_property_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON cleaner_property_settings TO authenticated;

DROP POLICY IF EXISTS "select_own_property_settings" ON cleaner_property_settings;
CREATE POLICY "select_own_property_settings" ON cleaner_property_settings FOR SELECT
  TO authenticated USING (cleaner_id = auth.uid());

DROP POLICY IF EXISTS "insert_own_property_settings" ON cleaner_property_settings;
CREATE POLICY "insert_own_property_settings" ON cleaner_property_settings FOR INSERT
  TO authenticated WITH CHECK (cleaner_id = auth.uid() AND is_cleaner_connected_to_property(property_id, auth.uid()));

DROP POLICY IF EXISTS "update_own_property_settings" ON cleaner_property_settings;
CREATE POLICY "update_own_property_settings" ON cleaner_property_settings FOR UPDATE
  TO authenticated
  USING (cleaner_id = auth.uid())
  WITH CHECK (cleaner_id = auth.uid() AND is_cleaner_connected_to_property(property_id, auth.uid()));

INSERT INTO cleaner_property_settings (cleaner_id, property_id, cleaning_time, internal_notes)
SELECT cleaner_id, property_id, cleaning_time, internal_notes
FROM property_connections
WHERE cleaning_time IS NOT NULL OR internal_notes IS NOT NULL
ON CONFLICT (cleaner_id, property_id) DO NOTHING;

ALTER TABLE property_connections ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE property_connections ADD COLUMN IF NOT EXISTS ended_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_connections_status_check') THEN
    ALTER TABLE property_connections
      ADD CONSTRAINT property_connections_status_check CHECK (status IN ('active', 'terminated'));
  END IF;
END $$;

REVOKE ALL ON property_connections FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, property_id, cleaner_id, status, ended_at, created_at) ON property_connections TO authenticated;

DROP POLICY IF EXISTS "connections_update_own" ON property_connections;
DROP POLICY IF EXISTS "connections_delete_own" ON property_connections;

CREATE INDEX IF NOT EXISTS bookings_cleaner_id_idx ON bookings (cleaner_id);

REVOKE UPDATE ON bookings FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "bookings_update_host_or_cleaner" ON bookings;

UPDATE properties SET invite_code = NULL WHERE invite_code IS NOT NULL;
ALTER TABLE properties ALTER COLUMN invite_code DROP DEFAULT;

CREATE OR REPLACE FUNCTION public.is_cleaner_connected_to_property(p_id uuid, u_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.property_connections
    WHERE property_id = p_id AND cleaner_id = u_id AND status = 'active'
  );
$function$;

CREATE OR REPLACE FUNCTION public.create_property_invitation(p_property_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_code text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF NOT is_host_of_property(p_property_id, v_user) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  UPDATE property_invitations
  SET revoked_at = now()
  WHERE property_id = p_property_id
    AND redeemed_at IS NULL
    AND revoked_at IS NULL
    AND expires_at > now();

  INSERT INTO property_invitations (property_id, code_hash, created_by, expires_at)
  VALUES (
    p_property_id,
    encode(sha256(convert_to(v_code, 'UTF8')), 'hex'),
    v_user,
    now() + interval '7 days'
  );

  RETURN substr(v_code, 1, 4) || '-' || substr(v_code, 5, 4) || '-' || substr(v_code, 9, 4);
END;
$function$;

CREATE OR REPLACE FUNCTION public.connect_cleaner_by_invite(p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_invitation_id uuid;
  v_property_id uuid;
  v_code_hash text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  v_code_hash := encode(
    sha256(convert_to(upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')), 'UTF8')),
    'hex'
  );

  SELECT i.id, i.property_id INTO v_invitation_id, v_property_id
  FROM property_invitations i
  WHERE i.code_hash = v_code_hash
    AND i.redeemed_at IS NULL
    AND i.revoked_at IS NULL
    AND i.expires_at > now()
  FOR UPDATE;

  IF v_invitation_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_CODE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM property_connections pc
    WHERE pc.property_id = v_property_id AND pc.cleaner_id = v_user AND pc.status = 'active'
  ) THEN
    RAISE EXCEPTION 'ALREADY_CONNECTED';
  END IF;

  INSERT INTO property_connections (property_id, cleaner_id, status, ended_at)
  VALUES (v_property_id, v_user, 'active', NULL)
  ON CONFLICT (property_id, cleaner_id) DO UPDATE SET status = 'active', ended_at = NULL;

  UPDATE property_invitations
  SET redeemed_at = now(), redeemed_by = v_user
  WHERE id = v_invitation_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.end_connection(p_connection_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_property_id uuid;
  v_cleaner_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT pc.property_id, pc.cleaner_id INTO v_property_id, v_cleaner_id
  FROM property_connections pc
  WHERE pc.id = p_connection_id
    AND pc.status = 'active'
    AND (pc.cleaner_id = v_user OR is_host_of_property(pc.property_id, v_user))
  FOR UPDATE;

  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  UPDATE bookings
  SET status = 'pending', cleaner_id = NULL
  WHERE property_id = v_property_id
    AND cleaner_id = v_cleaner_id
    AND status = 'accepted';

  UPDATE property_connections
  SET status = 'terminated', ended_at = now()
  WHERE id = p_connection_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_booking_status(p_booking_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_booking bookings%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id FOR UPDATE;

  IF v_booking.id IS NULL OR NOT is_cleaner_connected_to_property(v_booking.property_id, v_user) THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF p_status = 'accepted' THEN
    IF NOT (
      (v_booking.cleaner_id IS NULL AND v_booking.status IN ('pending', 'accepted'))
      OR (v_booking.cleaner_id = v_user AND v_booking.status IN ('accepted', 'finished'))
    ) THEN
      RAISE EXCEPTION 'NOT_ALLOWED';
    END IF;
  ELSIF p_status = 'finished' THEN
    IF NOT (
      v_booking.status = 'accepted'
      AND (v_booking.cleaner_id IS NULL OR v_booking.cleaner_id = v_user)
    ) THEN
      RAISE EXCEPTION 'NOT_ALLOWED';
    END IF;
  ELSE
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  UPDATE bookings SET status = p_status, cleaner_id = v_user WHERE id = p_booking_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_property_invitation(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.connect_cleaner_by_invite(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.end_connection(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_booking_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_property_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.connect_cleaner_by_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_connection(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_booking_status(uuid, text) TO authenticated;

DROP POLICY IF EXISTS "bookings_select_host_or_cleaner" ON bookings;
CREATE POLICY "bookings_select_host_or_cleaner" ON bookings FOR SELECT
  TO authenticated
  USING (
    is_host_of_property(property_id, auth.uid())
    OR is_cleaner_connected_to_property(property_id, auth.uid())
    OR (cleaner_id = auth.uid() AND status = 'finished')
  );

DROP POLICY IF EXISTS "incidents_select_host_or_cleaner" ON incidents;
CREATE POLICY "incidents_select_host_or_cleaner" ON incidents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = incidents.booking_id
        AND (
          is_host_of_property(b.property_id, auth.uid())
          OR is_cleaner_connected_to_property(b.property_id, auth.uid())
          OR (b.cleaner_id = auth.uid() AND b.status = 'finished')
        )
    )
  );

DROP POLICY IF EXISTS "properties_select_host_or_connected_cleaner" ON properties;
CREATE POLICY "properties_select_host_or_connected_cleaner" ON properties FOR SELECT
  TO authenticated
  USING (
    host_id = auth.uid()
    OR is_cleaner_connected_to_property(id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.property_id = properties.id
        AND b.cleaner_id = auth.uid()
        AND b.status = 'finished'
    )
  );

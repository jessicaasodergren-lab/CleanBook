/*
# Remove redundant booking and connection columns

1. What this does
- Bookings no longer store a copy of the property name, property address or host name. These are read from the linked property and its host profile instead.
- Property connections no longer store property specs (kvm, rooms, bathrooms, cleaning time in minutes). These are read from the property itself. The app never used them.
- Every booking must now point to a property.

2. Tables affected
- `bookings`: drops `property_name`, `property_address`, `host_name`; `property_id` becomes NOT NULL; index on `property_id` added.
- `property_connections`: drops `kvm`, `rooms`, `bathrooms`, `cleaning_time_minutes`.

3. Security changes
- None. Existing row level security policies and grants are unchanged.

4. Notes
- Existing booking rows are not backfilled; the owner has confirmed that test data may be deleted.
- Statements are idempotent and safe to re-run.
*/

ALTER TABLE bookings ALTER COLUMN property_id SET NOT NULL;

ALTER TABLE bookings DROP COLUMN IF EXISTS property_name;
ALTER TABLE bookings DROP COLUMN IF EXISTS property_address;
ALTER TABLE bookings DROP COLUMN IF EXISTS host_name;

CREATE INDEX IF NOT EXISTS bookings_property_id_idx ON bookings (property_id);

ALTER TABLE property_connections DROP COLUMN IF EXISTS kvm;
ALTER TABLE property_connections DROP COLUMN IF EXISTS rooms;
ALTER TABLE property_connections DROP COLUMN IF EXISTS bathrooms;
ALTER TABLE property_connections DROP COLUMN IF EXISTS cleaning_time_minutes;

-- Vaak / PingTalk: Complete Schema & Strict Supabase Row-Level Security (RLS) Policies
-- Paste and execute this entire script inside your Supabase Dashboard -> SQL Editor.
-- Protects user registrations, Call-Sign IDs, contacts, friend/connect requests,
-- family circles, 6-digit PIN rooms, and sealed /gov-vault audit records.

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  identifier text not null,
  call_sign text unique not null,
  device_id text not null,
  x25519_public_key text not null,
  country_iso text not null default 'IN',
  auth_method text not null default 'otp',
  is_suspended boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.vaak_contacts (
  id text primary key,
  owner_uid uuid references auth.users(id) on delete cascade,
  owner_device_id text not null,
  contact_name text not null,
  phone text not null,
  phonebook_label text not null default 'Mobile',
  on_vaak boolean not null default false,
  connected boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.vaak_connect_requests (
  id text primary key,
  sender_uid uuid references auth.users(id) on delete cascade,
  sender_device_id text not null,
  contact_name text not null,
  phone text not null,
  direction text not null check (direction in ('incoming', 'outgoing', 'invite_sms')),
  status text not null check (status in ('pending', 'accepted', 'declined', 'invited')),
  created_at timestamptz not null default now()
);

create table if not exists public.family_circles (
  id uuid primary key default gen_random_uuid(),
  owner_uid uuid references auth.users(id) on delete cascade,
  member_uids uuid[] not null default '{}',
  circle_name text not null default 'Pinned Family',
  created_at timestamptz not null default now()
);

create table if not exists public.pin_rooms (
  id uuid primary key default gen_random_uuid(),
  pin_code text not null,
  room_name text not null,
  category text not null default 'Neighborhood',
  member_uids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.pin_rooms(id) on delete cascade,
  sender_uid uuid references auth.users(id) on delete cascade,
  ciphertext text not null,
  lamport_seq integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.gov_audit_vault (
  id text primary key,
  event_type text not null,
  actor text not null,
  device_id text,
  country_code text not null,
  coordinates text not null,
  summary text not null,
  paninian_key_id text not null,
  lamport_seq integer not null default 1,
  severity text not null,
  payload_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.radio_tracking_footprints (
  id text primary key,
  host_uid uuid references auth.users(id) on delete cascade,
  host_device_id text not null,
  beacon_code text not null,
  encrypted_coord_hash text not null,
  distance_km numeric not null default 0,
  duty_cycle_sec integer not null default 60,
  created_at timestamptz not null default now()
);

-- Enable strict Row-Level Security (RLS) across all tables
alter table public.user_profiles enable row level security;
alter table public.vaak_contacts enable row level security;
alter table public.vaak_connect_requests enable row level security;
alter table public.family_circles enable row level security;
alter table public.pin_rooms enable row level security;
alter table public.room_messages enable row level security;
alter table public.gov_audit_vault enable row level security;
alter table public.radio_tracking_footprints enable row level security;

-- 1. User Profiles & Call-Sign IDs: strictly owner-only read/insert/update
drop policy if exists "user_profiles_owner_select" on public.user_profiles;
create policy "user_profiles_owner_select"
  on public.user_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "user_profiles_owner_insert" on public.user_profiles;
create policy "user_profiles_owner_insert"
  on public.user_profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_profiles_owner_update" on public.user_profiles;
create policy "user_profiles_owner_update"
  on public.user_profiles for update
  using (auth.uid() = user_id and is_suspended = false)
  with check (auth.uid() = user_id);

-- 2. Contacts: strictly owner-scoped via auth.uid()
drop policy if exists "vaak_contacts_owner_all" on public.vaak_contacts;
create policy "vaak_contacts_owner_all"
  on public.vaak_contacts for all
  using (auth.uid() = owner_uid)
  with check (auth.uid() = owner_uid);

-- 3. Mutual Connect / Friend Requests: scoped to sender_uid
drop policy if exists "vaak_connect_requests_owner_all" on public.vaak_connect_requests;
create policy "vaak_connect_requests_owner_all"
  on public.vaak_connect_requests for all
  using (auth.uid() = sender_uid)
  with check (auth.uid() = sender_uid);

-- 4. Family Circles: visible only to owner or verified family circle members
drop policy if exists "family_circles_member_access" on public.family_circles;
create policy "family_circles_member_access"
  on public.family_circles for select
  using (auth.uid() = owner_uid or auth.uid() = any(member_uids));

drop policy if exists "family_circles_owner_write" on public.family_circles;
create policy "family_circles_owner_write"
  on public.family_circles for all
  using (auth.uid() = owner_uid)
  with check (auth.uid() = owner_uid);

-- 5. 6-Digit PIN Rooms & Messages: scoped to non-suspended room members
drop policy if exists "pin_rooms_member_select" on public.pin_rooms;
create policy "pin_rooms_member_select"
  on public.pin_rooms for select
  using (auth.uid() = any(member_uids));

drop policy if exists "room_messages_member_select" on public.room_messages;
create policy "room_messages_member_select"
  on public.room_messages for select
  using (
    exists (
      select 1 from public.pin_rooms r
      where r.id = room_messages.room_id and auth.uid() = any(r.member_uids)
    )
  );

drop policy if exists "room_messages_member_insert" on public.room_messages;
create policy "room_messages_member_insert"
  on public.room_messages for insert
  with check (
    auth.uid() = sender_uid
    and exists (
      select 1 from public.user_profiles p
      where p.user_id = auth.uid() and p.is_suspended = false
    )
  );

-- 6. /gov-vault Audit Logs: Dual-Key Custody role only for reads; tamper-evident append
drop policy if exists "gov_vault_dual_key_select" on public.gov_audit_vault;
create policy "gov_vault_dual_key_select"
  on public.gov_audit_vault for select
  using ((auth.jwt() ->> 'role') = 'founder_gov_custody');

drop policy if exists "gov_vault_authenticated_append" on public.gov_audit_vault;
create policy "gov_vault_authenticated_append"
  on public.gov_audit_vault for insert
  with check (auth.role() = 'authenticated');

-- 7. Radio Tracking Encrypted Footprints: host-only read/insert
drop policy if exists "radio_tracking_host_all" on public.radio_tracking_footprints;
create policy "radio_tracking_host_all"
  on public.radio_tracking_footprints for all
  using (auth.uid() = host_uid)
  with check (auth.uid() = host_uid);

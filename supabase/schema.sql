-- Run in Supabase → SQL Editor. Minimal data only: profile, membership, latest position.
create extension if not exists pgcrypto;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, display_name text not null default 'Friend',
  avatar_emoji text not null default '🙂', marker_color text not null default '#8B7CFF',
  created_at timestamptz not null default now());

create table public.circles (
  id uuid primary key default gen_random_uuid(), name text not null check (char_length(name) between 1 and 40),
  owner_id uuid not null references public.users(id) on delete cascade,
  invite_code text unique not null, created_at timestamptz not null default now());

create table public.circle_members (
  circle_id uuid references public.circles(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  role text not null default 'member', share_trail boolean not null default false, -- trail is opt-in
  joined_at timestamptz not null default now(), primary key (circle_id, user_id));

-- One row per user per circle = latest position only. `trail` (last 30 min) is written only if share_trail is on.
create table public.location_shares (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  circle_id uuid not null references public.circles(id) on delete cascade,
  latitude double precision not null, longitude double precision not null, accuracy real,
  recorded_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  is_active boolean not null default true, trail jsonb,
  unique (user_id, circle_id));
alter table public.location_shares replica identity full;
alter publication supabase_realtime add table public.location_shares;

-- Auto-create profile on signup
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.users (id, email, display_name) values (new.id, new.email, split_part(new.email,'@',1)); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Helpers (security definer avoids RLS recursion)
create function public.is_member(cid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from circle_members where circle_id = cid and user_id = auth.uid()) $$;
create function public.shares_circle(uid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from circle_members a join circle_members b on a.circle_id = b.circle_id where a.user_id = auth.uid() and b.user_id = uid) $$;

create function public.new_code() returns text language sql volatile as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + (get_byte(gen_random_bytes(1),0) % 32), 1), '') from generate_series(1,6) $$;

create function public.create_circle(p_name text) returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid; begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into circles (name, owner_id, invite_code) values (p_name, auth.uid(), new_code()) returning id into cid;
  insert into circle_members (circle_id, user_id, role) values (cid, auth.uid(), 'owner'); return cid; end $$;

create function public.join_circle(p_code text) returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid; begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select id into cid from circles where invite_code = upper(trim(p_code));
  if cid is null then raise exception 'Invalid invite code'; end if;
  insert into circle_members (circle_id, user_id) values (cid, auth.uid()) on conflict do nothing; return cid; end $$;

-- Row Level Security
alter table users enable row level security; alter table circles enable row level security;
alter table circle_members enable row level security; alter table location_shares enable row level security;

create policy "read self or circle-mates" on users for select using (id = auth.uid() or shares_circle(id));
create policy "update self" on users for update using (id = auth.uid());
create policy "members read circle" on circles for select using (is_member(id));
create policy "owner edits circle" on circles for update using (owner_id = auth.uid());
create policy "owner deletes circle" on circles for delete using (owner_id = auth.uid());
create policy "members read members" on circle_members for select using (is_member(circle_id));
create policy "update own membership" on circle_members for update using (user_id = auth.uid());
create policy "leave circle" on circle_members for delete using (user_id = auth.uid());
create policy "members read live locations" on location_shares for select using (is_member(circle_id) and expires_at > now());
create policy "insert own location" on location_shares for insert with check (user_id = auth.uid() and is_member(circle_id));
create policy "update own location" on location_shares for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own location" on location_shares for delete using (user_id = auth.uid());

-- 24h expiry: reads already hide expired rows; this physically deletes them. Enable pg_cron (Database → Extensions) then run:
-- select cron.schedule('purge-locations', '*/10 * * * *', $$delete from public.location_shares where expires_at < now()$$);

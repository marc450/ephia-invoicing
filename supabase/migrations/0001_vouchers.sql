-- Wertgutscheine (value vouchers) — Mehrzweckgutschein model
--
-- Run this in the Supabase SQL editor (or via the Supabase CLI) against the
-- ephia-invoicing project. It is idempotent: safe to run more than once.
--
-- E2EE notes (matches patients / documents / behandlungen):
--   * `data`  holds the AES-GCM ciphertext (base64 text), encrypted client-side
--             with the user's MEK. Shape (decrypted):
--               { nennwert, restwert, gueltigBis, issuedAt,
--                 purchaserName?, purchaserEmail?,
--                 redemptions: [{ invoiceId, betrag, datum }] }
--   * `iv`    base64 IV used for that ciphertext.
--   * `code`  PLAINTEXT random serial (e.g. GS-2026-0007-7K3F). Lookup key for
--             redemption scanning. Not patient data.
--   * `status` PLAINTEXT, so the voucher list can filter without bulk-decrypt.
--   No patient-identifying data is ever stored in plaintext here.

create extension if not exists "pgcrypto";

create table if not exists public.vouchers (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  code               text not null,
  status             text not null default 'aktiv'
                       check (status in ('aktiv','teil_eingeloest','eingeloest','storniert','abgelaufen')),
  data               text not null,
  iv                 text,
  encryption_version integer not null default 1,
  created_at         timestamptz not null default now()
);

-- One code per user; lookup key for redemption.
create unique index if not exists vouchers_user_code_uidx
  on public.vouchers (user_id, code);

-- List filtering by status.
create index if not exists vouchers_user_status_idx
  on public.vouchers (user_id, status);

-- Row level security: a user only ever sees / writes their own vouchers.
alter table public.vouchers enable row level security;

drop policy if exists vouchers_select_own on public.vouchers;
create policy vouchers_select_own on public.vouchers
  for select using (auth.uid() = user_id);

drop policy if exists vouchers_insert_own on public.vouchers;
create policy vouchers_insert_own on public.vouchers
  for insert with check (auth.uid() = user_id);

drop policy if exists vouchers_update_own on public.vouchers;
create policy vouchers_update_own on public.vouchers
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists vouchers_delete_own on public.vouchers;
create policy vouchers_delete_own on public.vouchers
  for delete using (auth.uid() = user_id);

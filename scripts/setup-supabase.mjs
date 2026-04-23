#!/usr/bin/env node
/**
 * Crea la tabla `caos_rooms` en Supabase, la añade a la publicación realtime
 * y abre RLS para que cualquier cliente con la anon key pueda crear/leer/actualizar
 * salas (la entrada protegida es el código aleatorio de 5 caracteres).
 *
 * Uso (local):
 *   SUPABASE_DB_URL="postgres://postgres:<password>@db.<ref>.supabase.co:5432/postgres" \
 *   node scripts/setup-supabase.mjs
 */
import pg from "pg";

const url =
  process.env.SUPABASE_DB_URL ||
  "postgresql://postgres.wmmxnplssfwycnsdtqqm:mariohugomb.02@aws-0-eu-west-1.pooler.supabase.com:6543/postgres";

const SQL = `
create table if not exists public.caos_rooms (
  code text primary key,
  state jsonb not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists caos_rooms_updated_idx on public.caos_rooms (updated_at);

-- Realtime: enable full row image so postgres_changes UPDATEs deliver new state
alter table public.caos_rooms replica identity full;

-- Add to supabase_realtime publication (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'caos_rooms'
  ) then
    execute 'alter publication supabase_realtime add table public.caos_rooms';
  end if;
end $$;

-- Open RLS: this is a party game with random 5-char room codes (~24M combos).
-- No personal data is stored; access is gated by knowing the code.
alter table public.caos_rooms enable row level security;

drop policy if exists caos_rooms_select on public.caos_rooms;
drop policy if exists caos_rooms_insert on public.caos_rooms;
drop policy if exists caos_rooms_update on public.caos_rooms;
drop policy if exists caos_rooms_delete on public.caos_rooms;

create policy caos_rooms_select on public.caos_rooms for select using (true);
create policy caos_rooms_insert on public.caos_rooms for insert with check (true);
create policy caos_rooms_update on public.caos_rooms for update using (true) with check (true);
create policy caos_rooms_delete on public.caos_rooms for delete using (true);
`;

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(SQL);
  const { rows } = await client.query("select count(*)::int as n from public.caos_rooms");
  console.log(`OK. caos_rooms lista. ${rows[0].n} salas existentes.`);
  await client.end();
} catch (e) {
  console.error("Error:", e.message);
  process.exit(1);
}

-- ===================================================================
-- Tabla player_tokens
--   Guarda el token push (FCM en Android, APNs en iOS, endpoint en web)
--   asociado a un (room_code, player_id) para enviar notificaciones
--   reales con la app cerrada / pantalla apagada.
--
-- Cómo crearla:
--   1) Abre tu proyecto Supabase: https://supabase.com/dashboard/project/wmmxnplssfwycnsdtqqm
--   2) SQL Editor → "New query" → pega TODO el contenido de este archivo → Run.
--
-- RLS abierto a anon: igual que `caos_rooms`, la seguridad la da el
-- carácter aleatorio del room_code (5 chars). Cualquier cliente que
-- conozca el código de sala puede registrar/leer tokens de esa sala.
-- ===================================================================

create table if not exists public.player_tokens (
  id           uuid primary key default gen_random_uuid(),
  room_code    text        not null,
  player_id    text        not null,
  token        text        not null,
  platform     text        not null check (platform in ('android','ios','web')),
  updated_at   timestamptz not null default now(),
  unique (room_code, player_id, platform)
);

create index if not exists player_tokens_room_idx
  on public.player_tokens (room_code);

create index if not exists player_tokens_player_idx
  on public.player_tokens (player_id);

-- Habilitar RLS y permitir todo a anon (mismo modelo que caos_rooms).
alter table public.player_tokens enable row level security;

drop policy if exists "anon all" on public.player_tokens;
create policy "anon all" on public.player_tokens
  for all to anon
  using (true)
  with check (true);

-- Limpieza: elimina tokens de salas inactivas hace > 7 días.
-- Llama esta función desde un cron de Supabase si quieres GC automático.
create or replace function public.gc_player_tokens()
returns void
language sql
as $$
  delete from public.player_tokens
   where updated_at < now() - interval '7 days';
$$;

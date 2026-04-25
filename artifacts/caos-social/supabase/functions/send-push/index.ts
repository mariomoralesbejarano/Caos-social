// Edge Function: send-push
//
// Despliega con:
//   supabase functions deploy send-push --project-ref wmmxnplssfwycnsdtqqm
//
// Variables de entorno necesarias en el proyecto Supabase
// (Settings → Edge Functions → Secrets):
//
//   FCM_PROJECT_ID            = caos-social-f6d88
//   FCM_SERVICE_ACCOUNT_JSON  = (todo el JSON del service-account de Firebase,
//                               descargado de Project Settings → Service Accounts)
//
// Esta función:
//   1) Recibe { playerId, title, body, tag } por POST.
//   2) Lee de la tabla `player_tokens` los tokens FCM del jugador.
//   3) Pide un access_token OAuth2 a Google con el service-account.
//   4) Envía la push HTTP v1 a cada token.
//
// Si tu app aún solo se usa en web/PWA, no hace falta desplegar esto:
// el broadcast en sala ya entrega la notificación cuando la app está abierta.

// @ts-ignore – API global de Deno disponible en Edge Functions.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore – ESM import via URL en Deno.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

interface Body {
  playerId: string;
  title: string;
  body: string;
  tag?: string;
  roomCode?: string;
}

const SUPABASE_URL = (globalThis as any).Deno?.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = (globalThis as any).Deno?.env.get(
  "SUPABASE_SERVICE_ROLE_KEY",
)!;
const FCM_PROJECT_ID = (globalThis as any).Deno?.env.get("FCM_PROJECT_ID")!;
const FCM_SA_JSON = (globalThis as any).Deno?.env.get(
  "FCM_SERVICE_ACCOUNT_JSON",
)!;

let cachedToken: { value: string; exp: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.value;
  const sa = JSON.parse(FCM_SA_JSON);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const enc = (o: unknown) =>
    btoa(JSON.stringify(o)).replaceAll("=", "").replaceAll("+", "-").replaceAll("/", "_");
  const unsigned = `${enc(header)}.${enc(claims)}`;

  const pem = sa.private_key as string;
  const der = atob(pem.replace(/-----[^-]+-----|\s/g, ""));
  const buf = new Uint8Array([...der].map((c) => c.charCodeAt(0)));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    buf,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)),
  );
  const sigB64 = btoa(String.fromCharCode(...sig))
    .replaceAll("=", "")
    .replaceAll("+", "-")
    .replaceAll("/", "_");
  const jwt = `${unsigned}.${sigB64}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const json = await resp.json();
  if (!json.access_token) throw new Error("OAuth failed: " + JSON.stringify(json));
  cachedToken = { value: json.access_token, exp: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method", { status: 405 });
  const body = (await req.json()) as Body;
  if (!body.playerId || !body.title || !body.body) {
    return new Response("missing fields", { status: 400 });
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
  const { data: tokens, error } = await sb
    .from("player_tokens")
    .select("token, platform")
    .eq("player_id", body.playerId);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  if (!tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: "no tokens" }), { status: 200 });
  }

  const access = await getAccessToken();
  let sent = 0;
  for (const t of tokens) {
    const message = {
      message: {
        token: t.token,
        notification: { title: body.title, body: body.body },
        android: { priority: "HIGH" as const, notification: { tag: body.tag, sound: "default" } },
        apns: { payload: { aps: { sound: "default", "thread-id": body.tag } } },
      },
    };
    const r = await fetch(
      `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      },
    );
    if (r.ok) sent++;
  }
  return new Response(JSON.stringify({ sent, of: tokens.length }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

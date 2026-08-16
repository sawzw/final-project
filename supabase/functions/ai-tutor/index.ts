import { createClient } from "npm:@supabase/supabase-js@2.111.0";

const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const MAX_PROMPT_LENGTH = 30_000;

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: jsonHeaders });
  if (request.method !== "POST") return respond(405, { error: "Method not allowed" });

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_PROMPT_LENGTH + 1_000) {
    return respond(413, { error: "Request body is too large" });
  }

  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return respond(401, { error: "Authentication required" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  if (!supabaseUrl || !supabaseAnonKey || !geminiApiKey) {
    return respond(503, { error: "AI tutor is not configured" });
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser(authorization.slice(7));
  if (authError || !user) return respond(401, { error: "Invalid or expired session" });

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return respond(400, { error: "Invalid JSON body" });
  }

  const body = input as { mode?: unknown; prompt?: unknown };
  if ((body.mode !== "summary" && body.mode !== "chat") || typeof body.prompt !== "string") {
    return respond(400, { error: "Invalid request" });
  }
  const prompt = body.prompt.trim();
  if (!prompt || prompt.length > MAX_PROMPT_LENGTH) {
    return respond(400, { error: "Prompt exceeds the allowed size" });
  }

  const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";
  const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": geminiApiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 800, temperature: 0.3 }
    })
  });

  const payload = await upstream.json().catch(() => ({}));
  if (!upstream.ok) return respond(502, { error: "AI provider request failed" });

  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text ?? "")
    .join("")
    .trim();
  if (!text) return respond(502, { error: "AI provider returned no content" });
  return respond(200, { text });
});

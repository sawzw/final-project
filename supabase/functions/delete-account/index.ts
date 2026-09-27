import { createClient } from "npm:@supabase/supabase-js@2.111.0";

const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: jsonHeaders });
  if (request.method !== "POST") return respond(405, { error: "Method not allowed" });

  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return respond(401, { error: "Authentication required" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return respond(503, { error: "Account deletion is not configured" });
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser(authorization.slice(7));
  if (authError || !user) return respond(401, { error: "Invalid or expired session" });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  await adminClient.from("user_app_data").delete().eq("user_id", user.id);
  await adminClient.from("profiles").delete().eq("id", user.id);
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
  if (deleteError) return respond(500, { error: "Account deletion failed" });

  return respond(200, { deleted: true });
});

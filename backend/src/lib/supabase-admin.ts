import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

export function isSupabaseAdminConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  if (!adminClient) {
    adminClient = createClient(
      process.env.SUPABASE_URL!.trim(),
      process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  return adminClient;
}

export async function issueSupabaseSessionTokenHash(
  email: string
): Promise<string> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error("Supabase admin is not configured on the backend");
  }

  const { error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (
    createError &&
    !createError.message.toLowerCase().includes("already")
  ) {
    throw new Error(createError.message);
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    throw new Error(
      error?.message ?? "Failed to create Supabase session token"
    );
  }

  return tokenHash;
}

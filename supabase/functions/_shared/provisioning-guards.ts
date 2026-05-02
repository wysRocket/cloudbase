import { SupabaseClient } from "npm:@supabase/supabase-js@2";

export class ProvisioningGuardError extends Error {
  code: string;
  status: number;

  constructor(code: string, status = 403, message?: string) {
    super(message ?? code);
    this.code = code;
    this.status = status;
  }
}

export async function requireOwnedResource(
  supabase: SupabaseClient,
  userId: string,
  resourceId: string,
) {
  const { data, error } = await supabase
    .from("resources")
    .select("id,user_id,deleted_at")
    .eq("id", resourceId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new ProvisioningGuardError("resource_not_found_or_not_owned", 404);
  }

  if (data.deleted_at) {
    throw new ProvisioningGuardError("resource_already_deleted", 409);
  }

  return data;
}

export async function enforceProvisioningQuota(
  supabase: SupabaseClient,
  userId: string,
  requestId?: string,
) {
  const { data, error } = await supabase.rpc(
    "check_and_increment_provisioning_quota",
    { p_user_id: userId, p_request_id: requestId ?? null },
  );

  if (error) {
    throw new ProvisioningGuardError("quota_check_failed", 500, error.message);
  }

  const result = data?.[0];
  if (!result?.allowed) {
    throw new ProvisioningGuardError(result?.reason ?? "quota_exceeded", 429);
  }
}

export async function tombstoneBeforeDestroy(
  supabase: SupabaseClient,
  userId: string,
  resourceId: string,
  requestId: string,
  reason?: string,
) {
  const { data, error } = await supabase.rpc("tombstone_resource", {
    p_user_id: userId,
    p_resource_id: resourceId,
    p_request_id: requestId,
    p_reason: reason ?? null,
  });

  if (error) {
    throw new ProvisioningGuardError("tombstone_failed", 500, error.message);
  }

  if (data === false) {
    throw new ProvisioningGuardError("resource_not_found_or_not_owned", 404);
  }
}

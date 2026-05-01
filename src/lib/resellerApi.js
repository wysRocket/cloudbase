import { supabase } from './supabaseClient'

async function callProvisionEndpoint(payload) {
  const { data, error } = await supabase.functions.invoke('provider-provision', { body: payload })
  if (error) {
    throw new Error(error.message || 'Provider orchestration failed.')
  }
  if (data?.error) {
    throw new Error(data.error)
  }
  return data
}

export async function createServiceOrder(input) {
  return callProvisionEndpoint({ action: 'create_order', ...input })
}

export async function confirmServicePayment(input) {
  return callProvisionEndpoint({ action: 'confirm_payment', ...input })
}

export async function provisionService(input) {
  return callProvisionEndpoint({ action: 'provision_service', ...input })
}

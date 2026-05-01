import { supabase } from './supabaseClient'

export async function getProviderQuote({ planCode, region, quantity = 1 }) {
  const { data, error } = await supabase.functions.invoke('provider-quote', {
    body: { planCode, region, quantity },
  })

  if (error) {
    throw new Error(error.message || 'Unable to fetch provider quote.')
  }

  return data
}

export async function createServiceResource({ serviceType, displayName, region, metadata = {} }) {
  const { data: userResult, error: userError } = await supabase.auth.getUser()
  if (userError || !userResult?.user) {
    throw new Error('You must be signed in to create resources.')
  }

  const { data, error } = await supabase
    .from('service_resources')
    .insert({
      user_id: userResult.user.id,
      order_item_id: null,
      service_type: serviceType,
      display_name: displayName,
      region,
      status: 'pending',
      metadata,
    })
    .select('id, status')
    .single()

  if (error) {
    throw new Error(error.message || 'Unable to create service resource.')
  }

  return data
}

export async function enqueueProvisionJob({ resourceId }) {
  const idempotencyKey = `provision-${resourceId}`
  const { data, error } = await supabase.functions.invoke('provider-provision', {
    body: {
      resourceId,
      idempotencyKey,
    },
  })

  if (error) {
    throw new Error(error.message || 'Unable to enqueue provision job.')
  }

  return data
}

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

export async function enqueueProvisionJob({ resourceId, creditsToDeduct = 0, creditDescription = 'Service deployment' }) {
  const idempotencyKey = `provision-${resourceId}`
  const { data, error } = await supabase.functions.invoke('provider-provision', {
    body: {
      resourceId,
      idempotencyKey,
      creditsToDeduct,
      creditDescription,
    },
  })

  if (error) {
    throw new Error(error.message || 'Unable to enqueue provision job.')
  }

  return data
}


export async function requestLifecycleAction({ resourceId, action }) {
  const idempotencyKey = `${action}-${resourceId}`
  const { data, error } = await supabase.functions.invoke('provider-lifecycle', {
    body: { resourceId, action, idempotencyKey },
  })

  if (error) {
    throw new Error(error.message || 'Unable to enqueue lifecycle action.')
  }

  return data
}

export async function syncResourceStatus({ resourceId }) {
  const { data, error } = await supabase.functions.invoke('provider-sync-status', {
    body: { resourceId },
  })

  if (error) {
    throw new Error(error.message || 'Unable to sync resource status.')
  }

  return data
}

export async function getKubeconfig({ resourceId }) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  if (!token) throw new Error('You must be signed in.')

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-kubeconfig`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ resourceId }),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed.' }))
    throw new Error(err.error || 'Unable to fetch kubeconfig.')
  }

  return res.text()
}

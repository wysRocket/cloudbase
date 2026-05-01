import { getCorsHeaders, jsonResponse } from '../_shared/cors.ts'
import { createAdminClient, createUserClient } from '../_shared/supabase.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(request) })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405, request)

  try {
    const authHeader = request.headers.get('Authorization')
    const userClient = createUserClient(authHeader)
    const adminClient = createAdminClient()
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return jsonResponse({ error: 'You must be signed in.' }, 401, request)

    const body = await request.json()
    const action = String(body?.action || '')

    if (action === 'create_order') {
      const { data: order, error: orderError } = await adminClient.from('orders').insert({ user_id: user.id, status: 'pending' }).select('id').single()
      if (orderError || !order) return jsonResponse({ error: 'Unable to create order.' }, 500, request)

      const { error: itemError } = await adminClient.from('order_items').insert({
        order_id: order.id,
        service_type: String(body?.serviceType || ''),
        service_name: String(body?.serviceName || ''),
        region: String(body?.region || ''),
        amount_credits: Number(body?.amountCredits || 0),
        display_price: String(body?.displayPrice || ''),
      })
      if (itemError) return jsonResponse({ error: 'Unable to create order item.' }, 500, request)

      await adminClient.from('provision_events').insert({ order_id: order.id, event_type: 'order_created', details: { action } })
      return jsonResponse({ orderId: order.id }, 200, request)
    }

    if (action === 'confirm_payment') {
      const orderId = String(body?.orderId || '')
      const { data: item } = await adminClient.from('order_items').select('id,amount_credits').eq('order_id', orderId).maybeSingle()
      if (!item) return jsonResponse({ error: 'Order item not found.' }, 404, request)

      const { error: debitError } = await adminClient.from('credit_transactions').insert({
        user_id: user.id,
        description: `Service order ${orderId}`,
        amount: -Math.abs(Number(item.amount_credits || 0)),
        type: 'debit',
        status: 'Completed',
      })
      if (debitError) return jsonResponse({ error: 'Payment confirmation failed.' }, 500, request)

      await adminClient.from('orders').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', orderId).eq('user_id', user.id)
      await adminClient.from('provision_events').insert({ order_id: orderId, event_type: 'payment_confirmed', details: { action } })
      return jsonResponse({ orderId, status: 'paid' }, 200, request)
    }

    if (action === 'provision_service') {
      const orderId = String(body?.orderId || '')
      const { data: order } = await adminClient.from('orders').select('id,status,user_id').eq('id', orderId).maybeSingle()
      if (!order || order.user_id !== user.id) return jsonResponse({ error: 'Order not found.' }, 404, request)
      if (order.status !== 'paid') {
        await adminClient.from('provision_events').insert({ order_id: orderId, event_type: 'provision_rejected_unpaid', details: { status: order.status } })
        return jsonResponse({ error: 'Provisioning is only allowed for paid orders.' }, 422, request)
      }

      const { data: item } = await adminClient.from('order_items').select('id,service_type,service_name,region,display_price').eq('order_id', orderId).maybeSingle()
      if (!item) return jsonResponse({ error: 'Order item not found.' }, 404, request)

      const name = `${item.service_type}-${crypto.randomUUID().slice(0, 6)}`
      const { data: resource, error: resourceError } = await adminClient.from('service_resources').insert({ order_item_id: item.id, name, service_type: item.service_name, region: item.region, price: item.display_price, status: 'active' }).select('id,name').single()
      if (resourceError || !resource) return jsonResponse({ error: 'Provisioning failed.' }, 500, request)

      await adminClient.from('orders').update({ status: 'provisioned', provisioned_at: new Date().toISOString() }).eq('id', orderId)
      await adminClient.from('provision_events').insert({ order_id: orderId, order_item_id: item.id, service_resource_id: resource.id, event_type: 'service_provisioned', details: { resourceName: name } })
      return jsonResponse({ orderId, resource }, 200, request)
    }

    return jsonResponse({ error: 'Unsupported action.' }, 400, request)
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error.' }, 500, request)
  }
})

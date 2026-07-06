'use strict'

// Stripe payments — hosted Checkout + webhooks + Customer Portal.
// The whole module degrades gracefully: when STRIPE_SECRET_KEY is unset the
// exported `stripe` client is null and payment endpoints return 503, so the
// app deploys safely before the owner adds live keys (same pattern as R2).

const Stripe = require('stripe')
const { sendOrderReceiptEmail, sendSubscriptionConfirmationEmail } = require('./email')

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || null
const MEMBERSHIP_PRICE_ID = process.env.STRIPE_MEMBERSHIP_PRICE_ID || null
const MEMBERSHIP_NAME = 'Talweeh Society Membership'

// Unix seconds → MySQL DATETIME string (UTC), or null.
function toDateTime(sec) {
  if (!sec) return null
  return new Date(sec * 1000).toISOString().slice(0, 19).replace('T', ' ')
}

// Find or create the Stripe Customer for an app user and persist the link.
// Searches Stripe by email first so customers from the old WooCommerce site
// (same Stripe account) get relinked instead of duplicated.
async function getOrCreateStripeCustomer(pool, user) {
  const [rows] = await pool.query('SELECT stripe_customer_id FROM auth_users WHERE id = ?', [user.id])
  if (rows.length && rows[0].stripe_customer_id) return rows[0].stripe_customer_id

  let customerId = null
  const existing = await stripe.customers.list({ email: user.email, limit: 1 })
  if (existing.data.length) {
    customerId = existing.data[0].id
  } else {
    const created = await stripe.customers.create({
      email: user.email,
      name: user.name || undefined,
      metadata: { app_user_id: String(user.id) },
    })
    customerId = created.id
  }
  await pool.query('UPDATE auth_users SET stripe_customer_id = ? WHERE id = ?', [customerId, user.id])
  return customerId
}

// Active membership = any active/trialing subscription owned by the user
// (covers both new Stripe subscriptions and imported WooCommerce ones).
async function userHasActiveMembership(pool, userId, email) {
  const [rows] = await pool.query(
    `SELECT id FROM subscriptions
      WHERE status IN ('active', 'trialing')
        AND (user_id = ? OR billing_email = ?)
      LIMIT 1`,
    [userId, email || '']
  )
  return rows.length > 0
}

// Resolve the app user for a webhook object: metadata.user_id when we created
// the checkout, otherwise fall back to matching the customer email (needed for
// legacy subscriptions created on the old WooCommerce site).
async function resolveUserId(pool, { metadataUserId, email }) {
  if (metadataUserId && Number(metadataUserId)) return Number(metadataUserId)
  if (!email) return null
  const [rows] = await pool.query('SELECT id FROM auth_users WHERE email = ?', [email.toLowerCase()])
  return rows.length ? rows[0].id : null
}

// One-time purchase fulfillment: order + items + enrollment + receipt email.
// Idempotent — the UNIQUE key on orders.stripe_checkout_session_id makes a
// replayed webhook (or the success-page fallback racing the webhook) a no-op.
async function fulfillCheckoutSession(pool, session) {
  if (session.mode !== 'payment' || session.payment_status !== 'paid') return false

  const email = session.customer_details?.email || null
  const userId = await resolveUserId(pool, { metadataUserId: session.metadata?.user_id, email })
  const courseId = Number(session.metadata?.course_id) || null
  const total = (session.amount_total || 0) / 100
  const currency = (session.currency || 'usd').toUpperCase()

  let orderId
  try {
    const [result] = await pool.query(
      `INSERT INTO orders
         (user_id, billing_email, status, total, currency, payment_method, created_at,
          stripe_checkout_session_id, stripe_payment_intent_id)
       VALUES (?, ?, 'completed', ?, ?, 'stripe', NOW(), ?, ?)`,
      [userId, email, total, currency, session.id,
       typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null]
    )
    orderId = result.insertId
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return false // already fulfilled
    throw err
  }

  let itemName = session.metadata?.item_name || 'Course purchase'
  if (courseId) {
    const [courses] = await pool.query('SELECT title FROM courses WHERE id = ?', [courseId])
    if (courses.length) itemName = courses[0].title
  }
  await pool.query(
    'INSERT INTO order_items (order_id, course_id, name, quantity, total) VALUES (?, ?, ?, 1, ?)',
    [orderId, courseId, itemName, total]
  )

  if (courseId && userId) {
    await pool.query(
      "INSERT IGNORE INTO enrollments (user_id, course_id, granted_by, source) VALUES (?, ?, NULL, 'purchase')",
      [userId, courseId]
    )
  }

  if (email) {
    sendOrderReceiptEmail(email, { orderId, itemName, total, currency }).catch(() => {})
  }
  return true
}

// Upsert our subscriptions row from a Stripe Subscription object.
async function syncSubscription(pool, sub, { email: knownEmail } = {}) {
  let email = knownEmail || null
  if (!email && sub.customer) {
    try {
      const customer = await stripe.customers.retrieve(
        typeof sub.customer === 'string' ? sub.customer : sub.customer.id
      )
      if (!customer.deleted) email = customer.email || null
    } catch (err) {
      console.error('[stripe] Failed to retrieve customer for subscription sync:', err.message)
    }
  }

  const userId = await resolveUserId(pool, { metadataUserId: sub.metadata?.user_id, email })
  const item = sub.items?.data?.[0] || null
  // current_period_end lives on the subscription in older API versions and on
  // the item in newer ones — accept either.
  const periodEnd = sub.current_period_end || item?.current_period_end || null
  const amount = item?.price?.unit_amount != null ? item.price.unit_amount / 100 : null
  const interval = item?.price?.recurring?.interval || 'month'
  const status = sub.status === 'canceled' ? 'cancelled' : sub.status

  await pool.query(
    `INSERT INTO subscriptions
       (user_id, billing_email, status, total, billing_period, start_at, next_payment_at,
        created_at, cancel_at, stripe_subscription_id, stripe_customer_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       user_id = COALESCE(VALUES(user_id), user_id),
       billing_email = COALESCE(VALUES(billing_email), billing_email),
       status = VALUES(status),
       total = COALESCE(VALUES(total), total),
       next_payment_at = VALUES(next_payment_at),
       cancel_at = VALUES(cancel_at)`,
    [userId, email, status, amount, interval, toDateTime(sub.start_date), toDateTime(periodEnd),
     toDateTime(sub.cancel_at), sub.id, typeof sub.customer === 'string' ? sub.customer : sub.customer?.id || null]
  )
  return { userId, email, amount, interval, periodEnd }
}

// Record a subscription payment (initial or renewal) as an order row.
// Idempotent via the UNIQUE key on orders.stripe_payment_intent_id — we store
// the invoice id there (prefixed) since one invoice = one payment record.
async function recordInvoiceOrder(pool, invoice) {
  const email = invoice.customer_email || null
  const userId = await resolveUserId(pool, {
    metadataUserId: invoice.subscription_details?.metadata?.user_id || invoice.parent?.subscription_details?.metadata?.user_id,
    email,
  })
  const total = (invoice.amount_paid || 0) / 100
  if (total <= 0) return null
  const currency = (invoice.currency || 'usd').toUpperCase()

  let orderId
  try {
    const [result] = await pool.query(
      `INSERT INTO orders
         (user_id, billing_email, status, total, currency, payment_method, created_at, stripe_payment_intent_id)
       VALUES (?, ?, 'completed', ?, ?, 'stripe', NOW(), ?)`,
      [userId, email, total, currency, `in_${invoice.id}`]
    )
    orderId = result.insertId
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return null
    throw err
  }
  await pool.query(
    'INSERT INTO order_items (order_id, name, quantity, total) VALUES (?, ?, 1, ?)',
    [orderId, MEMBERSHIP_NAME, total]
  )
  return { orderId, email, total, currency }
}

function subscriptionIdFromInvoice(invoice) {
  // Older API: invoice.subscription; newer (2025+): invoice.parent.subscription_details.
  const raw = invoice.subscription || invoice.parent?.subscription_details?.subscription || null
  return typeof raw === 'string' ? raw : raw?.id || null
}

async function handleWebhookEvent(pool, event) {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object
      if (session.mode === 'payment') {
        await fulfillCheckoutSession(pool, session)
      } else if (session.mode === 'subscription' && session.subscription) {
        const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id
        const sub = await stripe.subscriptions.retrieve(subId)
        const { email, amount, interval, periodEnd } = await syncSubscription(pool, sub, {
          email: session.customer_details?.email,
        })
        if (email) {
          sendSubscriptionConfirmationEmail(email, {
            name: MEMBERSHIP_NAME,
            amount,
            interval,
            nextPaymentAt: periodEnd ? new Date(periodEnd * 1000) : null,
          }).catch(() => {})
        }
      }
      break
    }
    case 'invoice.paid': {
      const invoice = event.data.object
      await recordInvoiceOrder(pool, invoice)
      const subId = subscriptionIdFromInvoice(invoice)
      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId)
        await syncSubscription(pool, sub, { email: invoice.customer_email })
      }
      break
    }
    case 'invoice.payment_failed': {
      const subId = subscriptionIdFromInvoice(event.data.object)
      if (subId) {
        await pool.query("UPDATE subscriptions SET status = 'past_due' WHERE stripe_subscription_id = ?", [subId])
      }
      break
    }
    case 'customer.subscription.updated': {
      await syncSubscription(pool, event.data.object)
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object
      await pool.query(
        "UPDATE subscriptions SET status = 'cancelled', cancel_at = ? WHERE stripe_subscription_id = ?",
        [toDateTime(sub.canceled_at || sub.ended_at), sub.id]
      )
      break
    }
    default:
      break
  }
}

// Express handler for POST /api/webhooks/stripe. Must be mounted with
// express.raw() BEFORE the global express.json() so signature verification
// sees the raw body.
function createWebhookHandler(pool) {
  return async (req, res) => {
    if (!stripe || !WEBHOOK_SECRET) return res.status(503).json({ error: 'Payments not configured' })

    let event
    try {
      event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], WEBHOOK_SECRET)
    } catch (err) {
      console.error('[stripe] Webhook signature verification failed:', err.message)
      return res.status(400).json({ error: 'Invalid signature' })
    }

    // Event-level idempotency: first insert wins, replays are acknowledged.
    try {
      await pool.query('INSERT INTO stripe_events (event_id, type) VALUES (?, ?)', [event.id, event.type])
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.json({ received: true, duplicate: true })
      throw err
    }

    try {
      await handleWebhookEvent(pool, event)
      res.json({ received: true })
    } catch (err) {
      console.error(`[stripe] Webhook handler failed for ${event.type} (${event.id}):`, err)
      // Remove the idempotency marker so Stripe's retry re-processes the event.
      await pool.query('DELETE FROM stripe_events WHERE event_id = ?', [event.id]).catch(() => {})
      res.status(500).json({ error: 'Webhook handler failed' })
    }
  }
}

module.exports = {
  stripe,
  MEMBERSHIP_PRICE_ID,
  MEMBERSHIP_NAME,
  getOrCreateStripeCustomer,
  userHasActiveMembership,
  fulfillCheckoutSession,
  createWebhookHandler,
}

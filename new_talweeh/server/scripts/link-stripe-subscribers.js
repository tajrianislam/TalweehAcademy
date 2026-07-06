'use strict'

// One-off backfill: link existing Stripe subscribers (from the old WooCommerce
// site — same Stripe account) to new-site accounts and subscription rows.
//
// For every non-canceled subscription in Stripe:
//   1. Match the Stripe customer email to auth_users → set stripe_customer_id.
//   2. Attach the Stripe subscription to the imported WooCommerce subscription
//      row with the same billing email (or insert a fresh row if none).
//
// Run once after Stripe keys are configured:
//   node server/scripts/link-stripe-subscribers.js
//
// Safe to re-run — every step is an idempotent match-then-update.

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const mysql = require('mysql2/promise')
const Stripe = require('stripe')

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY is not set — aborting.')
    process.exit(1)
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  const toDateTime = (sec) => (sec ? new Date(sec * 1000).toISOString().slice(0, 19).replace('T', ' ') : null)
  let linkedUsers = 0
  let linkedSubs = 0
  let insertedSubs = 0
  let unmatched = 0

  for await (const sub of stripe.subscriptions.list({ status: 'all', limit: 100 })) {
    if (['canceled', 'incomplete', 'incomplete_expired'].includes(sub.status)) continue

    let customer
    try {
      customer = await stripe.customers.retrieve(
        typeof sub.customer === 'string' ? sub.customer : sub.customer.id
      )
    } catch (err) {
      console.warn(`  ! ${sub.id}: failed to load customer (${err.message})`)
      continue
    }
    if (customer.deleted || !customer.email) {
      console.warn(`  ! ${sub.id}: customer has no email — skipped`)
      unmatched++
      continue
    }
    const email = customer.email.toLowerCase()

    // 1. Link the app user account.
    const [users] = await pool.query('SELECT id, stripe_customer_id FROM auth_users WHERE email = ?', [email])
    const userId = users.length ? users[0].id : null
    if (userId && !users[0].stripe_customer_id) {
      await pool.query('UPDATE auth_users SET stripe_customer_id = ? WHERE id = ?', [customer.id, userId])
      linkedUsers++
    }
    if (!userId) {
      console.warn(`  ? ${sub.id} (${email}): no matching account on the new site yet`)
    }

    // 2. Attach to the subscriptions table.
    const [existing] = await pool.query(
      'SELECT id FROM subscriptions WHERE stripe_subscription_id = ?', [sub.id]
    )
    const item = sub.items?.data?.[0] || null
    const periodEnd = sub.current_period_end || item?.current_period_end || null
    const amount = item?.price?.unit_amount != null ? item.price.unit_amount / 100 : null
    const interval = item?.price?.recurring?.interval || 'month'

    if (existing.length) continue

    const [imported] = await pool.query(
      `SELECT id FROM subscriptions
        WHERE stripe_subscription_id IS NULL AND billing_email = ?
          AND status IN ('active', 'on-hold', 'pending')
        ORDER BY start_at DESC LIMIT 1`,
      [email]
    )
    if (imported.length) {
      await pool.query(
        `UPDATE subscriptions
            SET stripe_subscription_id = ?, stripe_customer_id = ?, status = ?,
                next_payment_at = ?, user_id = COALESCE(user_id, ?)
          WHERE id = ?`,
        [sub.id, customer.id, sub.status, toDateTime(periodEnd), userId, imported[0].id]
      )
      linkedSubs++
    } else {
      await pool.query(
        `INSERT INTO subscriptions
           (user_id, billing_email, status, total, billing_period, start_at, next_payment_at,
            created_at, stripe_subscription_id, stripe_customer_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
        [userId, email, sub.status, amount, interval, toDateTime(sub.start_date),
         toDateTime(periodEnd), sub.id, customer.id]
      )
      insertedSubs++
    }
  }

  console.log(`Done. Linked ${linkedUsers} user account(s), attached ${linkedSubs} imported subscription(s), inserted ${insertedSubs} new row(s), ${unmatched} skipped.`)
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

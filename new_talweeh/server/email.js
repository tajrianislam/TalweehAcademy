'use strict'

const { Resend } = require('resend')

const EMAIL_FROM = process.env.EMAIL_FROM || 'Talweeh Academy <no-reply@talweehacademy.com>'

// Escape user-supplied text before interpolating into email HTML.
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getResendClient() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

/**
 * Send a password-reset email.
 * Never throws — logs server-side and returns false on failure so callers can
 * still return the generic success response to the user.
 *
 * @param {string} to       Recipient email address
 * @param {string} resetUrl Full reset URL including the raw token
 * @returns {Promise<boolean>} true if the email was accepted by Resend
 */
async function sendPasswordResetEmail(to, resetUrl) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background:#f4f7f4;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="540" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:8px;overflow:hidden;
                      box-shadow:0 2px 12px rgba(0,0,0,0.08);max-width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#243f2b;padding:28px 40px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:bold;color:#ffffff;
                         letter-spacing:0.03em;">Talweeh Academy</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 16px;font-size:20px;color:#243f2b;">
                Reset your password
              </h1>
              <p style="margin:0 0 24px;color:#444;font-size:15px;line-height:1.6;">
                We received a request to reset the password for your account.
                Click the button below to choose a new password. This link
                expires in&nbsp;<strong>60&nbsp;minutes</strong>.
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:#243f2b;border-radius:6px;">
                    <a href="${resetUrl}"
                       style="display:inline-block;padding:13px 28px;
                              font-size:15px;font-weight:bold;color:#ffffff;
                              text-decoration:none;border-radius:6px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;color:#666;font-size:13px;line-height:1.5;">
                If the button doesn&rsquo;t work, copy and paste this URL into
                your browser:
              </p>
              <p style="margin:0 0 28px;word-break:break-all;">
                <a href="${resetUrl}"
                   style="font-size:12px;color:#3a5a40;">${resetUrl}</a>
              </p>

              <p style="margin:0;color:#888;font-size:13px;line-height:1.5;">
                If you didn&rsquo;t request a password reset, you can safely
                ignore this email. Your password will not change.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fbf9;border-top:1px solid #eee;
                        padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#aaa;">
                &copy; ${new Date().getFullYear()} Talweeh Academy &mdash;
                All rights reserved
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const resend = getResendClient()
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — password reset email not sent')
    return false
  }

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: 'Reset your Talweeh Academy password',
      html,
    })
    if (error) {
      console.error('[email] Resend error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('[email] Failed to send reset email:', err.message)
    return false
  }
}

async function sendContactNotificationEmail({ name, email, message }) {
  const resend = getResendClient()
  const notifyTo = process.env.CONTACT_NOTIFY_EMAIL || 'info@talweehacademy.com'
  if (!resend) return false
  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: notifyTo,
      replyTo: email,
      subject: `Contact form: ${name}`,
      html: `<p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`,
    })
    if (error) {
      console.error('[email] Contact notify error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('[email] Failed to send contact notification:', err.message)
    return false
  }
}

// Shared wrapper for the branded transactional layout used by the reset email.
function brandedEmail(title, bodyHtml) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f7f4;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="540" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:8px;overflow:hidden;
                      box-shadow:0 2px 12px rgba(0,0,0,0.08);max-width:100%;">
          <tr>
            <td style="background:#243f2b;padding:28px 40px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:bold;color:#ffffff;
                         letter-spacing:0.03em;">Talweeh Academy</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">${bodyHtml}</td>
          </tr>
          <tr>
            <td style="background:#f9fbf9;border-top:1px solid #eee;
                        padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#aaa;">
                &copy; ${new Date().getFullYear()} Talweeh Academy &mdash;
                All rights reserved
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Send a purchase receipt after a successful one-time payment.
 * Never throws — logs and returns false on failure.
 */
async function sendOrderReceiptEmail(to, { orderId, itemName, total, currency = 'USD' }) {
  const resend = getResendClient()
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — order receipt not sent')
    return false
  }
  const amount = `${Number(total).toFixed(2)} ${escapeHtml(currency)}`
  const html = brandedEmail('Your Talweeh Academy receipt', `
    <h1 style="margin:0 0 16px;font-size:20px;color:#243f2b;">Thank you for your purchase</h1>
    <p style="margin:0 0 24px;color:#444;font-size:15px;line-height:1.6;">
      Your payment was successful. Here are your order details:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;font-size:14px;color:#444;">
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;">Order</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">#${escapeHtml(String(orderId))}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;">Item</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${escapeHtml(itemName || 'Course purchase')}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;">Total</td>
        <td style="padding:8px 0;text-align:right;"><strong>${amount}</strong></td>
      </tr>
    </table>
    <p style="margin:0;color:#888;font-size:13px;line-height:1.5;">
      Your course is now available in your account. If you have any questions,
      just reply to this email.
    </p>`)
  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: 'Your Talweeh Academy receipt',
      html,
    })
    if (error) {
      console.error('[email] Receipt email error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('[email] Failed to send receipt email:', err.message)
    return false
  }
}

/**
 * Send a confirmation after a new subscription is started.
 * Never throws — logs and returns false on failure.
 */
async function sendSubscriptionConfirmationEmail(to, { name, amount, interval = 'month', nextPaymentAt }) {
  const resend = getResendClient()
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — subscription confirmation not sent')
    return false
  }
  const priceLine = amount != null ? `${Number(amount).toFixed(2)} USD / ${escapeHtml(interval)}` : null
  const html = brandedEmail('Welcome to Talweeh Society', `
    <h1 style="margin:0 0 16px;font-size:20px;color:#243f2b;">Welcome!</h1>
    <p style="margin:0 0 24px;color:#444;font-size:15px;line-height:1.6;">
      Your subscription to <strong>${escapeHtml(name || 'Talweeh Society')}</strong> is now active.
      ${priceLine ? `You'll be billed <strong>${priceLine}</strong>.` : ''}
      ${nextPaymentAt ? `Your next payment is on <strong>${escapeHtml(new Date(nextPaymentAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }))}</strong>.` : ''}
    </p>
    <p style="margin:0;color:#888;font-size:13px;line-height:1.5;">
      You can manage or cancel your subscription anytime from your dashboard.
    </p>`)
  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: 'Your Talweeh Society membership is active',
      html,
    })
    if (error) {
      console.error('[email] Subscription confirmation error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('[email] Failed to send subscription confirmation:', err.message)
    return false
  }
}

module.exports = {
  sendPasswordResetEmail,
  sendContactNotificationEmail,
  sendOrderReceiptEmail,
  sendSubscriptionConfirmationEmail,
}

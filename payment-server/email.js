const { Resend } = require('resend');

const DEFAULT_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Crappik <noreply@crappik.site>';
const DEFAULT_FRONTEND_URL = (process.env.FRONTEND_URL || 'https://crappik.site').replace(/\/+$/, '');

let resendClient = null;

function getResendClient() {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is missing');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isNonRetryableError(error) {
  const status = error?.statusCode ?? error?.status;
  return status === 400 || status === 401 || status === 403 || status === 422;
}

/**
 * Send a transactional email via Resend with automatic exponential-backoff retry.
 */
async function sendEmail({
  to,
  subject,
  html,
  text,
  from = DEFAULT_FROM_EMAIL,
  replyTo,
  cc,
  bcc,
  attachments,
  tags,
  maxRetries = 3,
  initialDelayMs = 1000,
}) {
  if (!to) throw new Error('Recipient "to" is required');
  if (!subject) throw new Error('Email "subject" is required');
  if (!html && !text) throw new Error('Either "html" or "text" content is required');

  const resend = getResendClient();

  const payload = {
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    ...(html !== undefined ? { html } : {}),
    ...(text !== undefined ? { text } : {}),
    ...(replyTo !== undefined ? { replyTo } : {}),
    ...(cc !== undefined ? { cc } : {}),
    ...(bcc !== undefined ? { bcc } : {}),
    ...(attachments !== undefined ? { attachments } : {}),
    ...(tags !== undefined ? { tags } : {}),
  };

  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await resend.emails.send(payload);

      if (error) {
        if (isNonRetryableError(error) || attempt === maxRetries) {
          console.error(
            `[PaymentServer Email] Resend API error on attempt ${attempt + 1}/${maxRetries + 1}:`,
            error
          );
          const finalErr = new Error(error.message || 'Failed to send email via Resend');
          finalErr.nonRetryable = isNonRetryableError(error);
          throw finalErr;
        }

        lastError = error;
        const delay = initialDelayMs * Math.pow(2, attempt);
        console.warn(
          `[PaymentServer Email] Attempt ${attempt + 1}/${maxRetries + 1} failed (${error.message}). Retrying in ${delay}ms...`
        );
        await sleep(delay);
        continue;
      }

      return data;
    } catch (err) {
      lastError = err;
      if (err?.nonRetryable || attempt === maxRetries) {
        throw err;
      }
      const delay = initialDelayMs * Math.pow(2, attempt);
      console.warn(
        `[PaymentServer Email] Attempt ${attempt + 1}/${maxRetries + 1} threw error (${err.message}). Retrying in ${delay}ms...`
      );
      await sleep(delay);
    }
  }

  throw new Error(lastError?.message || 'Failed to send email after retries');
}

/**
 * Resolve a user's email address and name from Supabase Auth, profiles, or checkout payload.
 */
async function resolveUserContact(supabase, userId, customer = null) {
  let email = null;
  let name = customer?.name || null;

  if (supabase && userId) {
    try {
      const { data, error } = await supabase.auth.admin.getUserById(userId);
      if (!error && data?.user) {
        email = data.user.email || null;
        if (!name) {
          name =
            data.user.user_metadata?.full_name ||
            data.user.user_metadata?.name ||
            null;
        }
      }
    } catch (err) {
      console.warn(`[PaymentServer Email] Failed to query auth user ${userId}:`, err.message);
    }

    if (!email || !name) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('customer_email, customer_name')
          .eq('id', userId)
          .maybeSingle();

        if (profile) {
          if (!email && profile.customer_email) email = profile.customer_email;
          if (!name && profile.customer_name) name = profile.customer_name;
        }
      } catch (err) {
        console.warn(`[PaymentServer Email] Failed to query profile for ${userId}:`, err.message);
      }
    }
  }

  if (!email && customer?.email) {
    email = customer.email;
  }

  return { email, name };
}

function buildEmailLayout({ heading, bodyHtml, ctaLabel, ctaUrl }) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; padding: 32px 16px;">
      <div style="max-width: 520px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 32px;">
        <div style="font-size: 12px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: #eab308; margin-bottom: 16px;">
          Crappik Billing
        </div>
        <h1 style="font-size: 22px; font-weight: 800; color: #ffffff; margin: 0 0 16px 0; line-height: 1.3;">
          ${heading}
        </h1>
        <div style="font-size: 15px; line-height: 1.6; color: #d4d4d8; margin-bottom: 24px;">
          ${bodyHtml}
        </div>
        ${
          ctaLabel && ctaUrl
            ? `<div style="margin-top: 24px;">
                <a href="${escapeHtml(ctaUrl)}" style="display: inline-block; background-color: #eab308; color: #09090b; font-weight: 800; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 10px;">
                  ${escapeHtml(ctaLabel)}
                </a>
              </div>`
            : ''
        }
      </div>
    </div>
  `.trim();
}

async function sendCreditPurchaseSuccessEmail({
  supabase,
  userId,
  creditsAdded,
  cardLastFour,
  customer,
  frontendUrl = DEFAULT_FRONTEND_URL,
}) {
  try {
    const { email, name } = await resolveUserContact(supabase, userId, customer);
    if (!email) {
      console.warn(`[PaymentServer Email] Skipping purchase success email: no email found for user ${userId}`);
      return null;
    }

    const baseUrl = (frontendUrl || DEFAULT_FRONTEND_URL).replace(/\/+$/, '');
    const billingUrl = `${baseUrl}/content-creator/billing`;
    const formattedCredits = Number(creditsAdded || 0).toLocaleString('en-US');
    const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi there,';

    const html = buildEmailLayout({
      heading: 'Your credits have been added',
      bodyHtml: `
        <p style="margin: 0 0 12px 0;">${greeting}</p>
        <p style="margin: 0 0 12px 0;">
          Thank you for your purchase! Your payment was successful and <strong style="color: #eab308;">${escapeHtml(formattedCredits)} credits</strong> have been added to your Crappik account.
        </p>
        ${
          cardLastFour
            ? `<p style="margin: 0; font-size: 13px; color: #a1a1aa;">Payment method: Card ending in ${escapeHtml(cardLastFour)}</p>`
            : ''
        }
      `,
      ctaLabel: 'Go to Dashboard',
      ctaUrl: billingUrl,
    });

    const text = [
      name ? `Hi ${name},` : 'Hi there,',
      '',
      `Thank you for your purchase! Your payment was successful and ${formattedCredits} credits have been added to your Crappik account.`,
      ...(cardLastFour ? [`Payment method: Card ending in ${cardLastFour}`] : []),
      '',
      `View your balance: ${billingUrl}`,
    ].join('\n');

    const result = await sendEmail({
      to: email,
      subject: `Payment confirmed — ${formattedCredits} credits added`,
      html,
      text,
    });

    console.log(`[PaymentServer Email] Sent credit purchase confirmation email to ${email}`);
    return result;
  } catch (err) {
    console.error(`[PaymentServer Email] Failed to send purchase success email for user ${userId}:`, err.message);
    return null;
  }
}

async function sendTransactionFailedEmail({
  supabase,
  userId,
  creditsAttempted,
  reason,
  customer,
  frontendUrl = DEFAULT_FRONTEND_URL,
}) {
  try {
    const { email, name } = await resolveUserContact(supabase, userId, customer);
    if (!email) {
      console.warn(`[PaymentServer Email] Skipping transaction failed email: no email found for user ${userId}`);
      return null;
    }

    const baseUrl = (frontendUrl || DEFAULT_FRONTEND_URL).replace(/\/+$/, '');
    const pricingUrl = `${baseUrl}/content-creator/creator-pricing`;
    const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi there,';
    const packDescription =
      creditsAttempted && Number(creditsAttempted) > 0
        ? ` for <strong style="color: #ffffff;">${escapeHtml(Number(creditsAttempted).toLocaleString('en-US'))} credits</strong>`
        : '';
    const textPackDescription =
      creditsAttempted && Number(creditsAttempted) > 0
        ? ` for ${Number(creditsAttempted).toLocaleString('en-US')} credits`
        : '';

    const html = buildEmailLayout({
      heading: 'Your payment could not be completed',
      bodyHtml: `
        <p style="margin: 0 0 12px 0;">${greeting}</p>
        <p style="margin: 0 0 12px 0;">
          We weren't able to process your recent payment${packDescription}. No credits were added and your account was not charged.
        </p>
        ${
          reason
            ? `<p style="margin: 0 0 12px 0; font-size: 13px; color: #fca5a5;">Reason: ${escapeHtml(reason)}</p>`
            : ''
        }
        <p style="margin: 0;">
          Please check your payment details or try another card to complete your credit purchase.
        </p>
      `,
      ctaLabel: 'Try Again',
      ctaUrl: pricingUrl,
    });

    const text = [
      name ? `Hi ${name},` : 'Hi there,',
      '',
      `We weren't able to process your recent payment${textPackDescription}. No credits were added and your account was not charged.`,
      ...(reason ? [`Reason: ${reason}`] : []),
      '',
      'Please check your payment details or try another card to complete your credit purchase.',
      '',
      `Try again: ${pricingUrl}`,
    ].join('\n');

    const result = await sendEmail({
      to: email,
      subject: 'Payment unsuccessful — Your Crappik credit purchase',
      html,
      text,
    });

    console.log(`[PaymentServer Email] Sent transaction failed email to ${email}`);
    return result;
  } catch (err) {
    console.error(`[PaymentServer Email] Failed to send transaction failed email for user ${userId}:`, err.message);
    return null;
  }
}

module.exports = {
  getResendClient,
  sendEmail,
  resolveUserContact,
  sendCreditPurchaseSuccessEmail,
  sendTransactionFailedEmail,
};

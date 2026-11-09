import { Resend } from 'resend';

const DEFAULT_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Crappik <noreply@crappik.site>';
const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://crappik.site').replace(/\/+$/, '');

let resendClient = null;

export function getResendClient() {
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
export async function sendEmail({
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
            `[ContentServer Email] Resend API error on attempt ${attempt + 1}/${maxRetries + 1}:`,
            error
          );
          const finalErr = new Error(error.message || 'Failed to send email via Resend');
          finalErr.nonRetryable = isNonRetryableError(error);
          throw finalErr;
        }

        lastError = error;
        const delay = initialDelayMs * Math.pow(2, attempt);
        console.warn(
          `[ContentServer Email] Attempt ${attempt + 1}/${maxRetries + 1} failed (${error.message}). Retrying in ${delay}ms...`
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
        `[ContentServer Email] Attempt ${attempt + 1}/${maxRetries + 1} threw error (${err.message}). Retrying in ${delay}ms...`
      );
      await sleep(delay);
    }
  }

  throw new Error(lastError?.message || 'Failed to send email after retries');
}

/**
 * Resolve a user's email address and display name from Supabase Auth / profiles.
 */
export async function resolveUserContact(supabase, userId) {
  if (!supabase || !userId) return { email: null, name: null };

  let email = null;
  let name = null;

  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (!error && data?.user) {
      email = data.user.email || null;
      name =
        data.user.user_metadata?.full_name ||
        data.user.user_metadata?.name ||
        null;
    }
  } catch (err) {
    console.warn(`[ContentServer Email] Failed to query auth user ${userId}:`, err.message);
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
      console.warn(`[ContentServer Email] Failed to query profile for ${userId}:`, err.message);
    }
  }

  return { email, name };
}

function buildEmailLayout({ heading, bodyHtml, ctaLabel, ctaUrl }) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; padding: 32px 16px;">
      <div style="max-width: 520px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 32px;">
        <div style="font-size: 12px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: #eab308; margin-bottom: 16px;">
          Crappik Studio
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

export async function sendExportCompletedEmail({
  supabase,
  userId,
  projectTitle,
  videoUrl,
}) {
  try {
    const { email, name } = await resolveUserContact(supabase, userId);
    if (!email) {
      console.warn(`[ContentServer Email] Skipping export completion email: no email found for user ${userId}`);
      return null;
    }

    const cleanTitle = (projectTitle || 'Untitled Video').trim();
    const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi there,';
    const storiesUrl = `${FRONTEND_URL}/content-creator/stories`;
    const hasPublicVideoUrl = typeof videoUrl === 'string' && /^https?:\/\//i.test(videoUrl);

    const html = buildEmailLayout({
      heading: 'Your video export is ready',
      bodyHtml: `
        <p style="margin: 0 0 12px 0;">${greeting}</p>
        <p style="margin: 0 0 12px 0;">
          Great news — your video <strong style="color: #ffffff;">"${escapeHtml(cleanTitle)}"</strong> has finished rendering and is ready to watch or download.
        </p>
        ${
          hasPublicVideoUrl
            ? `<p style="margin: 12px 0 0 0; font-size: 13px; color: #a1a1aa;">
                Direct video link: <a href="${escapeHtml(videoUrl)}" style="color: #eab308; text-decoration: underline;">Download MP4</a>
              </p>`
            : ''
        }
      `,
      ctaLabel: 'View Your Exported Videos',
      ctaUrl: storiesUrl,
    });

    const text = [
      name ? `Hi ${name},` : 'Hi there,',
      '',
      `Your video "${cleanTitle}" has finished rendering and is ready to watch or download.`,
      '',
      `View your exported videos: ${storiesUrl}`,
      ...(hasPublicVideoUrl ? [`Direct video link: ${videoUrl}`] : []),
    ].join('\n');

    const result = await sendEmail({
      to: email,
      subject: `Your video export is ready — "${cleanTitle}"`,
      html,
      text,
    });

    console.log(`[ContentServer Email] Sent export completed email to ${email}`);
    return result;
  } catch (err) {
    console.error(`[ContentServer Email] Failed to send export completed email for user ${userId}:`, err.message);
    return null;
  }
}

export async function sendExportFailedEmail({
  supabase,
  userId,
  projectTitle,
}) {
  try {
    const { email, name } = await resolveUserContact(supabase, userId);
    if (!email) {
      console.warn(`[ContentServer Email] Skipping export failed email: no email found for user ${userId}`);
      return null;
    }

    const cleanTitle = (projectTitle || 'Untitled Video').trim();
    const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi there,';
    const projectsUrl = `${FRONTEND_URL}/content-creator/projects`;

    const html = buildEmailLayout({
      heading: 'We could not finish exporting your video',
      bodyHtml: `
        <p style="margin: 0 0 12px 0;">${greeting}</p>
        <p style="margin: 0 0 12px 0;">
          Something went wrong while exporting <strong style="color: #ffffff;">"${escapeHtml(cleanTitle)}"</strong>, and the render could not be completed.
        </p>
        <p style="margin: 0;">
          Your project and generated scenes are still saved in your workspace — you can open the project and start the export again anytime.
        </p>
      `,
      ctaLabel: 'Open Your Projects',
      ctaUrl: projectsUrl,
    });

    const text = [
      name ? `Hi ${name},` : 'Hi there,',
      '',
      `Something went wrong while exporting "${cleanTitle}", and the render could not be completed.`,
      'Your project and scenes are still saved in your workspace — you can open the project and retry the export anytime.',
      '',
      `Open your projects: ${projectsUrl}`,
    ].join('\n');

    const result = await sendEmail({
      to: email,
      subject: `Video export failed — "${cleanTitle}"`,
      html,
      text,
    });

    console.log(`[ContentServer Email] Sent export failed email to ${email}`);
    return result;
  } catch (err) {
    console.error(`[ContentServer Email] Failed to send export failed email for user ${userId}:`, err.message);
    return null;
  }
}

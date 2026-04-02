// backend/src/services/emailService.js
import { Resend } from 'resend';
import fs from 'fs';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM || 'Sales <noreply@example.com>';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(addr) {
  return !!addr && EMAIL_RE.test(String(addr).trim());
}

/** Escape minimal HTML when interpolating plain text into templates. */
function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderBrandedFollowup({ customerName, round = 1 }) {
  const title = round === 1 ? 'Following up on your solar enquiry' : 'Quick follow-up';
  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width,initial-scale=1"/>
      <title>${title}</title>
    </head>
    <body style="margin:0;padding:0;background:#f6f9fc;font-family:Arial,sans-serif;color:#0f172a;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f9fc;">
        <tr>
          <td align="center" style="padding:24px">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
              <!-- Header -->
              <tr>
                <td style="background:#1A7B7B;color:#fff;padding:16px 20px;font-weight:700;font-size:16px;">
                  XVRYTHNG — Sales
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:20px;">
                  <p style="margin:0 0 12px;">Hi ${customerName ? customerName : ''},</p>
                  <p style="margin:0 0 12px;">Just checking in to see if you had a chance to review our previous message. We're here to help with any questions about your solar project.</p>
                  <p style="margin:0 0 12px;">Reply to this email and we’ll get right back to you.</p>
                  <p style="margin:0;">Best regards,<br/>Sales Team</p>
                  <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
                  <p style="font-size:12px;color:#6b7280;margin:0;">Automated follow-up #${round}</p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding:16px 20px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;">
                  © ${new Date().getFullYear()} XVRYTHNG • This message was sent automatically.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}


export async function sendAutomatedFollowupEmail({ to, subject, html, headers = {} }) {
  if (!isValidEmail(to)) throw new Error(`Invalid recipient email: ${to}`);
  console.log('[FU] Resend: sending →', { to, subject, from: FROM });

  if (!resend) {
    console.warn('[FU] Resend email service not configured (RESEND_API_KEY missing). Email NOT sent.');
    return { data: { id: 'fake-' + Date.now() }, error: null };
  }

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text: subject,
    headers: { 'X-Automated': 'true', ...headers },
  });

  if (error) {
    console.error('[FU] Resend ERROR:', error);
    throw new Error(error?.message || 'Resend send failed');
  }

  console.log('[FU] Resend OK, id =', data?.id);
  return data?.id || null;
}
export function renderOwnerDocReminderEmail({ assigneeName, lead }) {
  const title = `Action needed: Lead #${lead.id} is missing documents`;
  return `
  <!doctype html>
  <html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f9fc;font-family:Arial,sans-serif;color:#0f172a;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f9fc;">
      <tr><td align="center" style="padding:24px">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
          <tr>
            <td style="background:#1A7B7B;color:#fff;padding:16px 20px;font-weight:700;font-size:16px;">
              XVRYTHNG — Missing document reminder
            </td>
          </tr>
          <tr>
            <td style="padding:20px;">
              <p style="margin:0 0 12px;">Hi ${assigneeName || 'there'},</p>
              <p style="margin:0 0 12px;">Lead <strong>#${lead.id}</strong> ${lead.customer_name ? `(${lead.customer_name})` : ''} currently has <strong>no uploaded documents</strong>.</p>
              <p style="margin:0 0 12px;">Please chase the customer and upload or mark received in the CRM so reminders stop automatically.</p>
              <p style="margin:0;">Thanks,<br/>Sales Ops</p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
              <p style="font-size:12px;color:#6b7280;margin:0;">Automated internal reminder • This will stop when at least one document is received.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 20px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;">
              © ${new Date().getFullYear()} XVRYTHNG
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}



export function renderEmployeeCredentialEmail({
  employeeName,
  email,
  tempPassword,
  companyName = 'your company',
  appUrl = process.env.APP_BASE_URL || 'http://localhost:5173',
}) {
  const rawCompany = companyName || 'your company';
  const safeName = escapeHtml((employeeName || '').trim() || 'there');
  const safeCompany = escapeHtml(rawCompany);
  const safeEmail = escapeHtml(String(email ?? ''));
  const safePwd = escapeHtml(String(tempPassword ?? ''));
  const title = `Your ${rawCompany} login details`;
  const signInUrl = `${String(appUrl || '').replace(/\/+$/, '')}/login`;

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f9fc;font-family:Arial,sans-serif;color:#0f172a;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f9fc;">
      <tr>
        <td align="center" style="padding:24px">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
            <!-- Header -->
            <tr>
              <td style="background:#1A7B7B;color:#fff;padding:16px 20px;font-weight:700;font-size:16px;">
                XVRYTHNG — Welcome
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:20px;">
                <p style="margin:0 0 12px;">Hi ${safeName},</p>
                <p style="margin:0 0 12px;">Your ${safeCompany} account has been created. Here are your login details:</p>
                <ul style="margin:0 0 12px 20px;padding:0;line-height:1.6">
                  <li><strong>Email:</strong> ${safeEmail}</li>
                  <li><strong>Temporary password:</strong> ${safePwd}</li>
                </ul>

                <p style="margin:0 0 12px;">
                  Click the button below to sign in and change your password on first login.
                </p>

                <p style="margin:16px 0 20px;">
                  <a href="${escapeHtml(signInUrl)}"
                     style="display:inline-block;background:#1A7B7B;color:#fff;text-decoration:none;padding:10px 16px;border-radius:10px;font-weight:700">
                    Sign in
                  </a>
                </p>

              
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
                <p style="font-size:12px;color:#6b7280;margin:0;">If you didn’t expect this, please contact Support.</p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="padding:16px 20px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;">
                © ${new Date().getFullYear()} XVRYTHNG
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}


export async function sendEmployeeCredentialEmail({
  to,
  employeeName,
  email,
  tempPassword,
  companyName,
  appUrl,
  headers = {},
}) {
  if (!isValidEmail(to)) throw new Error(`Invalid recipient email: ${to}`);
  if (!process.env.RESEND_API_KEY?.trim()) {
    console.warn('[ONBOARD] RESEND_API_KEY is not set; skipping credential email to', to);
    return null;
  }

  const subject = `${companyName || 'XVRYTHNG'} — Your login details`;
  const html = renderEmployeeCredentialEmail({ employeeName, email, tempPassword, companyName, appUrl });

  console.log('[ONBOARD] Resend: sending →', { to, subject, from: FROM });

  if (!resend) {
    console.warn('[ONBOARD] Resend email service not configured (RESEND_API_KEY missing). Email NOT sent.');
    return null;
  }

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text: `Your login has been created.\nEmail: ${email}\nTemporary password: ${tempPassword}\n\nPlease sign in and change your password.`,
    headers: { 'X-Onboarding': 'true', ...headers },
  });

  if (error) {
    console.error('[ONBOARD] Resend ERROR:', error);
    throw new Error(error?.message || 'Resend send failed');
  }

  console.log('[ONBOARD] Resend OK, id =', data?.id);
  return data?.id || null;
}

/**
 * Render a "bulletproof" CTA button (works in most email clients).
 * Fallback shows the raw URL below for clients that strip styles.
 */
function renderCtaButton(href, label, bg = '#1A7B7B', color = '#FFFFFF') {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td align="center" bgcolor="${bg}" style="
          border-radius: 8px;
          background: ${bg};
        ">
          <a href="${safeHref}" target="_blank" style="
            display:inline-block;
            font-weight:700;
            text-decoration:none;
            color:${color};
            background:${bg};
            border: 1px solid ${bg};
            border-radius:8px;
            padding:12px 18px;
            font-family: Arial, Helvetica, sans-serif;
          ">${safeLabel}</a>
        </td>
      </tr>
    </table>
    <div style="font-size:12px;color:#555555;margin-top:8px;">
      Can’t click the button? Copy this link: <br/>
      <a href="${safeHref}" target="_blank" style="color:#1A7B7B;">${safeHref}</a>
    </div>
  `;
}

/**
 * Render a summary panel like the red boxed section in your sample image.
 * Pass an array of items: [{label, value}, ...]
 */
function renderSummaryBox(items = []) {
  if (!Array.isArray(items) || items.length === 0) return '';
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="
      background:#FFFFFF;
      border:1px solid #E5E7EB;
      border-radius:8px;
    ">
      <tr>
        <td style="padding:16px;">
          ${items
            .map(
              (it) => `
              <div style="margin-bottom:8px;">
                <div style="font-size:12px;color:#555555;margin-bottom:2px;">
                  ${escapeHtml(it.label ?? '')}
                </div>
                <div style="font-size:14px;color:#1A1A2E;font-weight:700;">
                  ${escapeHtml(it.value ?? '')}
                </div>
              </div>
            `
            )
            .join('')}
        </td>
      </tr>
    </table>
  `;
}

/**
 * Render Trial Link Email (table-based, inline CSS, brand colors)
 * - Looks like the sample: prominent header, intro copy, summary box, CTA.
 *
 * @param {{
 *   recipientName?: string,
 *   trialLink: string,
 *   companyName?: string,
 *   // Optional visual customizations
 *   headerTitle?: string,             // e.g., "Let's get you started."
 *   headerBg?: string,                // header background color
 *   logoUrl?: string | null,
 *   // Optional summary box (like your red rectangle)
 *   summaryItems?: Array<{ label: string, value: string }>,
 *   // Optional footer/support text
 *   supportHtml?: string
 * }} opts
 */
export function renderTrialLinkEmail({
  recipientName,
  trialLink,
  companyName = 'XVRYTHNG',
  headerTitle = "Let's get you started.",
  headerBg = '#1A7B7B', // Brand Primary Teal
  logoUrl = null,
  summaryItems = [],
  supportHtml = '',
}) {
  const safeName = (recipientName || '').trim() || 'there';
  const year = new Date().getFullYear();

  // Email-safe container
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(companyName)} • Trial Access</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#F5F5F5;">
  <center style="width:100%;background:#F5F5F5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:640px;margin:0 auto;">
      <!-- Brand header -->
      <tr>
        <td style="padding:0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="
            background:${headerBg};
            border-radius:0 0 8px 8px;
          ">
            <tr>
              <td style="padding:16px 20px;">
                <table role="presentation" width="100%">
                  <tr>
                    <td align="left" valign="middle" style="font-family:Arial,Helvetica,sans-serif;">
                      ${logoUrl ? `
                        <img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(companyName)}" height="24" style="display:block;border:0;outline:none;">
                      ` : `
                        <div style="color:#FFFFFF;font-weight:800;font-size:14px;letter-spacing:1px;">
                          ${escapeHtml(companyName)}
                        </div>
                      `}
                    </td>
                    <td></td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:12px 20px 20px;">
                <div style="
                  font-family:Arial,Helvetica,sans-serif;
                  color:#FFFFFF;
                  font-size:24px;
                  font-weight:800;
                ">
                  ${escapeHtml(headerTitle)}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- White card -->
      <tr>
        <td style="padding:20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="
            background:#FFFFFF;
            border-radius:8px;
            border:1px solid #E5E7EB;
          ">
            <tr>
              <td style="padding:20px;font-family:Arial,Helvetica,sans-serif;color:#1A1A2E;">
                <p style="margin:0 0 12px 0;">Hi ${escapeHtml(safeName)},</p>
                <p style="margin:0 0 16px 0;color:#555555;">
                  You're invited to try our platform. Click the button below to start your trial and explore the features.
                </p>

                <!-- Optional summary box -->
                ${renderSummaryBox(summaryItems)}

                <!-- Spacer -->
                <div style="height:16px;line-height:16px;">&nbsp;</div>

                <!-- CTA -->
                ${renderCtaButton(trialLink, 'Start your trial')}

                <!-- Spacer -->
                <div style="height:16px;line-height:16px;">&nbsp;</div>

                <!-- Support note -->
                ${
                  supportHtml
                    ? `<div style="font-size:13px;color:#555555;">${supportHtml}</div>`
                    : `<div style="font-size:13px;color:#555555;">
                         Need help? Reply to this email and our team will assist you.
                       </div>`
                }
              </td>
            </tr>
          </table>

          <!-- Footer -->
          <div style="text-align:center;color:#555555;font-size:12px;margin:14px 0;font-family:Arial,Helvetica,sans-serif;">
            © ${year} ${escapeHtml(companyName)} • This message was sent automatically.
          </div>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>
`;
}

/**
 * Send Trial Link Email via Resend
 * @param {{
 *   to: string | string[],
 *   recipientName?: string,
 *   trialLink: string,
 *   companyName?: string,
 *   headerTitle?: string,
 *   headerBg?: string,
 *   logoUrl?: string | null,
 *   summaryItems?: Array<{label:string, value:string}>,
 *   supportHtml?: string,
 *   headers?: Record<string,string>
 * }} args
 */
export async function sendTrialLinkEmail({
  to,
  recipientName,
  trialLink,
  companyName = 'XVRYTHNG',
  headerTitle,
  headerBg,
  logoUrl = null,
  summaryItems,
  supportHtml,
  headers = {},
}) {
  if (Array.isArray(to)) {
    // Validate list quickly
    to.forEach((addr) => {
      if (!isValidEmail(addr)) throw new Error(`Invalid recipient email: ${addr}`);
    });
  } else {
    if (!isValidEmail(to)) throw new Error(`Invalid recipient email: ${to}`);
  }

  const subject = `${companyName} — Your trial access link`;
  const html = renderTrialLinkEmail({
    recipientName,
    trialLink,
    companyName,
    headerTitle,
    headerBg,
    logoUrl,
    summaryItems,
    supportHtml,
  });

  if (!resend) {
    console.warn('[TRIAL] Resend email service not configured (RESEND_API_KEY missing). Email NOT sent.');
    return 'fake-' + Date.now();
  }

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text: `Start your trial: ${trialLink}`,
    headers: { 'X-Email-Type': 'trial-link', ...headers },
  });

  if (error) throw new Error(error?.message ?? 'Resend send failed');
  return data?.id ?? null;
}

// ---------------------------------------------------------------------------
// Payroll: payslip emailing
// ---------------------------------------------------------------------------
export function renderPayslipEmail({
  employeeName,
  companyName = 'XVRYTHNG',
  periodStart,
  periodEnd,
  netPay,
}) {
  const title = `${companyName} — Your payslip`;
  const safeName = (employeeName || '').trim() || 'there';
  const net = netPay != null ? `$${Number(netPay).toFixed(2)}` : '—';

  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width,initial-scale=1"/>
      <title>${title}</title>
    </head>
    <body style="margin:0;padding:0;background:#f6f9fc;font-family:Arial,sans-serif;color:#0f172a;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f9fc;">
        <tr>
          <td align="center" style="padding:24px">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
              <tr>
                <td style="background:#1A7B7B;color:#fff;padding:16px 20px;font-weight:700;font-size:16px;">
                  ${companyName} — Payroll
                </td>
              </tr>
              <tr>
                <td style="padding:20px;">
                  <p style="margin:0 0 12px;">Hi ${safeName},</p>
                  <p style="margin:0 0 12px;">
                    Please find attached your payslip for the period <strong>${periodStart}</strong> to <strong>${periodEnd}</strong>.
                  </p>
                  <div style="margin:12px 0 16px;padding:12px 14px;border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb;">
                    <div style="font-size:12px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Net pay</div>
                    <div style="font-size:20px;font-weight:900;color:#0f172a;">${net}</div>
                  </div>
                  <p style="margin:0;">Regards,<br/>${companyName} Payroll Team</p>
                  <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
                  <p style="font-size:12px;color:#6b7280;margin:0;">This is an automated email. If you have questions, please contact your manager.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;">
                  © ${new Date().getFullYear()} ${companyName}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

/**
 * Send a payslip email with a PDF attachment (best-effort attachment, depends on Resend support).
 */
export async function sendPayslipEmail({
  to,
  employeeName,
  companyName,
  periodStart,
  periodEnd,
  netPay,
  attachmentPath,
  attachmentFilename = 'payslip.pdf',
  headers = {},
}) {
  if (!isValidEmail(to)) throw new Error(`Invalid recipient email: ${to}`);
  if (!attachmentPath) throw new Error('Missing attachmentPath');

  const subject = `${companyName || 'XVRYTHNG'} — Payslip (${periodStart} to ${periodEnd})`;
  const html = renderPayslipEmail({ employeeName, companyName, periodStart, periodEnd, netPay });

  const content = fs.readFileSync(attachmentPath);

  if (!resend) {
    console.warn('[PAYSLIP] Resend email service not configured (RESEND_API_KEY missing). Email NOT sent.');
    return 'fake-' + Date.now();
  }

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [to],
    subject,
    html,
    text: `Your payslip for ${periodStart} to ${periodEnd} is attached.`,
    // Resend supports attachments in most SDK versions.
    attachments: [
      {
        filename: attachmentFilename,
        content,
      },
    ],
    headers: { 'X-Email-Type': 'payslip', ...headers },
  });

  if (error) throw new Error(error?.message ?? 'Resend send failed');
  return data?.id ?? null;
}

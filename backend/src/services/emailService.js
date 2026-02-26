// backend/src/services/emailService.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM || 'Sales <noreply@example.com>';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(addr) {
  return !!addr && EMAIL_RE.test(String(addr).trim());
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
  const safeName = (employeeName || '').trim() || 'there';
  const title = `Your ${companyName} login details`;
  const signInUrl = appUrl.replace(/\/+$/, '') + '/login';

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
                XVRYTHNG — Welcome
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:20px;">
                <p style="margin:0 0 12px;">Hi ${safeName},</p>
                <p style="margin:0 0 12px;">Your ${companyName} account has been created. Here are your login details:</p>
                <ul style="margin:0 0 12px 20px;padding:0;line-height:1.6">
                  <li><strong>Email:</strong> ${email}</li>
                  <li><strong>Temporary password:</strong> ${tempPassword}</li>
                </ul>

                <p style="margin:0 0 12px;">
                  Click the button below to sign in and change your password on first login.
                </p>

                <p style="margin:16px 0 20px;">
                  <a href="${signInUrl}"
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

  const subject = `${companyName || 'XVRYTHNG'} — Your login details`;
  const html = renderEmployeeCredentialEmail({ employeeName, email, tempPassword, companyName, appUrl });

  console.log('[ONBOARD] Resend: sending →', { to, subject, from: FROM });

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
/**
 * Get a customer portal test link (backend must be running).
 * Usage: node scripts/get-portal-test-link.js [leadId]
 * Example: node scripts/get-portal-test-link.js 69
 *
 * Uses ADMIN_EMAIL and ADMIN_PASSWORD from .env, or defaults for dev.
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const BASE = process.env.API_BASE_URL || 'http://localhost:3000';
const leadId = process.argv[2] || process.env.LEAD_ID || '69';
const email = process.env.ADMIN_EMAIL || 'admin@xvrythng.com';
const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

async function main() {
  // Try dev-only endpoint first (no auth, NODE_ENV=development)
  const devRes = await fetch(`${BASE}/api/dev/portal-test-link?leadId=${encodeURIComponent(leadId)}`);
  const devData = await devRes.json().catch(() => ({}));
  if (devData.success && devData.loginUrl) {
    console.log(devData.loginUrl);
    return;
  }

  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginData = await loginRes.json().catch(() => ({}));
  if (!loginData.token) {
    console.error('Login failed:', loginData.message || 'No token');
    process.exit(1);
  }

  let linkRes = await fetch(`${BASE}/api/leads/${leadId}/customer-portal-test-link`, {
    headers: { Authorization: `Bearer ${loginData.token}` },
  });
  let linkData = await linkRes.json().catch(() => ({}));
  if (!linkData.success || !linkData.loginUrl) {
    linkRes = await fetch(`${BASE}/api/leads/customer-portal-test-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${loginData.token}` },
      body: JSON.stringify({ leadId: Number(leadId) || leadId }),
    });
    linkData = await linkRes.json().catch(() => ({}));
  }
  if (!linkData.success || !linkData.loginUrl) {
    console.error('Test link failed:', linkData.message || 'No loginUrl');
    process.exit(1);
  }

  console.log(linkData.loginUrl);
}

main();

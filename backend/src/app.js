/**
 * Express app: CORS, JSON body, auth routes.
 * No auth middleware on login; protected routes will use JWT middleware later.
 */
import express from 'express';
import cors from 'cors';

import db from './config/db.js';

import authRoutes from './routes/authRoutes.js';

import adminRoutes from './routes/adminRoutes.js';
import userRoutes from './routes/userRoutes.js';
import meController from './controllers/meController.js';
import documentRoutes from './routes/documentRoutes.js'
import companyRoutes from './routes/companyRoutes.js';
import leadsRoutes from './routes/leadRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import calendarRoutes from './routes/calendarRoutes.js';
import solarQuotesRoutes from './routes/solarQuotesRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import referralRoutes from './routes/referralRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import cron from 'node-cron';
import { syncSolarQuotesLeads } from './services/solarQuotesService.js';
import { fileURLToPath } from 'url';
import path from 'path';
import siteInspectionRoutes from './routes/siteInspectionRoutes.js';
import siteInspectionFilesRoutes from './routes/siteInspectionFilesRoutes.js'
import checklistRoutes from './routes/checklistRoutes.js';

import inspectionTemplateRoutes from './routes/inspectionTemplateRoutes.js';
import leadProposalRoutes from './routes/leadProposalRoutes.js';

import employeeRoutes from './routes/employeeRoutes.js';

import employeeDocumentRoutes from './routes/employeeDocumentRoutes.js';
import trialUserRoutes from './routes/trialUserRoutes.js';

import projectRoutes from './routes/projectRoutes.js';

import retailerProjectRoutes from './routes/retailerProjectRoutes.js';
import ProjectManagementDashboardRoutes from './routes/ProjectManagementDashboardRoutes.js';

import projectDocumentRoutes from './routes/projectDocumentRoutes.js';
import projectNoteRoutes from './routes/projectNoteRoutes.js';
import retailerProjectDocumentRoutes from './routes/retailerProjectDocumentRoutes.js';
import retailerProjectNoteRoutes from './routes/retailerProjectNoteRoutes.js';

import installationRoutes from './routes/installationRoutes.js';
import onFieldRoutes from './routes/onFieldRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import approvalsRoutes from './routes/approvalsRoutes.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'uploads');

const app = express();
app.use((req, _res, next) => { req.db = db; next(); });
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

app.use('/uploads', express.static(uploadsDir));
app.use('/api/leads/:leadId/site-inspection/files', siteInspectionFilesRoutes);
app.get('/health', (_, res) => res.status(200).json({ status: 'ok' }));

// Dev-only: get a customer portal test link (no auth). Open in browser: /api/dev/portal-test-link?leadId=69
if (process.env.NODE_ENV === 'development') {
  const leadService = await import('./services/leadService.js').then(m => m.default);
  const customerCredentialsService = await import('./services/customerCredentialsService.js');
  app.get('/api/dev/portal-test-link', async (req, res) => {
    try {
      const leadId = req.query.leadId || req.query.lead_id || '69';
      const result = await leadService.getLeadById(leadId);
      const lead = result.lead;
      if (!lead || !lead.email) {
        return res.status(400).json({ success: false, message: 'Lead not found or has no email.', leadId });
      }
      const linkToken = customerCredentialsService.createLinkToken(lead.email, {
        leadId: lead.id,
        customerName: lead.customer_name || null,
      });
      const base = process.env.PORTAL_BASE_URL || process.env.APP_BASE_URL || 'http://localhost:5173';
      const loginUrl = `${base}/portal/login?token=${linkToken}`;
      return res.status(200).json({ success: true, loginUrl, email: lead.email });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });
}

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);

app.use('/api/company', companyRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/integrations/solarquotes', solarQuotesRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/referrals', referralRoutes);

app.use('/api', meController);

app.use('/api/webhooks/email', express.json({ limit: '1mb' }), emailRoutes);
app.use('/api/leads/:leadId/documents', documentRoutes);
app.use('/api/leads/:leadId/site-inspection', siteInspectionRoutes);
app.use('/api/site-inspection-checklists', checklistRoutes);
app.use('/api/company/settings/inspection-templates', inspectionTemplateRoutes);
app.use('/api/leads', leadProposalRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api', employeeDocumentRoutes);

app.use('/api/trial-users', trialUserRoutes);

app.use('/api/projects', projectRoutes);

app.use('/api/retailer-projects', retailerProjectRoutes);
app.use('/api/pm-dashboard', ProjectManagementDashboardRoutes);

app.use('/api/projects/:id/documents', projectDocumentRoutes);
app.use('/api/projects/:id/notes', projectNoteRoutes);
app.use('/api/retailer-projects/:id/documents', retailerProjectDocumentRoutes);
app.use('/api/retailer-projects/:id/notes', retailerProjectNoteRoutes);

app.use('/api/installation-jobs', installationRoutes);
app.use('/api/on-field', onFieldRoutes);
app.use('/api/approvals', approvalsRoutes);
app.use('/api', activityRoutes);
// ---------------------------------------------------------------------------
// Cron Jobs
// ---------------------------------------------------------------------------
// Fetch SolarQuotes leads every hour
cron.schedule('0 * * * *', async () => {
  console.log('[Cron] Fetching SolarQuotes leads...');
  try {
    const { count } = await syncSolarQuotesLeads();
    console.log(`[Cron] SolarQuotes sync complete. Found ${count} leads.`);
  } catch (err) {
    console.error('[Cron] SolarQuotes sync failed:', err);
  }
});
// 404
app.use((_, res) => res.status(404).json({ success: false, message: 'Not found' }));

// Error handler
app.use((err, _, res, next) => {
  if (res.headersSent) return next(err);
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

export default app;

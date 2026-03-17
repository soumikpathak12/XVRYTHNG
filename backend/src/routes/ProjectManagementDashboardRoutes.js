// src/routes/ProjectManagementDashboardRoutes.js
// Purpose: Route definitions for the PM dashboard.
// Keeps your current imports and adds two extra debug endpoints for faster diagnosis.

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';

import {
  getPmDashboard,
  getPmDashboardDrilldown,
  getPmDashboardDebug,
  getPmDashboardDebugRaw,     // NEW
  getPmDashboardDebugCounts,  // NEW
} from '../controllers/projectMangementDashboardController.js';

const router = Router();

// If your app requires auth/tenant context, keep these middlewares.
// If not required for testing, you can comment them out temporarily.
router.use(requireAuth, tenantContext);

// Main dashboard aggregation
router.get('/', getPmDashboard);

// Metric drilldown list
router.get('/drilldown', getPmDashboardDrilldown);

// Debug: notify to check logs for SQL + params
router.get('/_debug/sql', getPmDashboardDebug);

// Debug: return UNION raw rows + histogram
router.get('/_debug/raw', getPmDashboardDebugRaw);

// Debug: quick counts to prove DB has data
router.get('/_debug/counts', getPmDashboardDebugCounts);

export default router;
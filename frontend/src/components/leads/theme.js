// components/leads/theme.js
export const BRAND_TEAL = '#146b6b';
export const GREEN_WON = '#16a34a';
export const RED_LOST  = '#dc2626';

/** Light, soothing header colors for each pipeline stage */
const STAGE_PASTELS = {
  new: '#e8f6fc',                 // very light blue
  contacted: '#eef2ff',           // very light indigo
  qualified: '#ecfdf9',           // very light teal
  inspection_booked: '#f5f3ff',   // very light violet
  inspection_completed: '#f3f0ff', // very light purple
  proposal_sent: '#fffbeb',       // very light amber
  negotiation: '#fff7ed',         // very light peach
  closed_won: '#f0fdf4',          // very light green
  closed_lost: '#fef2f2',         // very light rose
  
  // Projects (classic pipeline)
  pre_approval: '#f0fdf4',        // light green
  state_rebate: '#ecfeff',        // light cyan
  design_engineering: '#fdf4ff',  // light fuchsia
  procurement: '#fff1f2',         // light rose
  scheduled: '#eef2ff',           // light indigo
  to_be_rescheduled: '#fff7ed',   // light peach
  installation_in_progress: '#fffbeb', // light amber
  installation_completed: '#f0fdf4', // light green
  compliance_check: '#fef2f2',    // light rose
  inspection_grid_connection: '#f5f3ff', // light violet
  rebate_stc_claims: '#ecfdf9',   // light teal
  project_completed: '#f0fdf4',   // light green
  ces_certificate_applied: '#fffbeb',
  ces_certificate_received: '#ecfdf9',
  grid_connection_initiated: '#f5f3ff',
  grid_connection_completed: '#e0f2fe',
  system_handover: '#f0fdf4',

  // Retailer Projects
  site_inspection: '#f3f0ff',     // light purple
  stage_one: '#e8f6fc',           // light blue
  stage_two: '#ecfdf9',           // light teal
  full_system: '#f5f3ff',         // light violet
  cancelled: '#fef2f2',           // light rose
  to_be_rescheduled: '#fff7ed',   // light peach
  ces_certificate_applied: '#fffbeb', // light amber
  ces_certificate_received: '#f0fdf4', // light green
  ces_certificate_submitted: '#eef2ff', // light indigo
  done: '#f0fdf4',                // light green
};

/** Returns the pastel header background color for a given stage */
export function colorForStage(stage) {
  return STAGE_PASTELS[stage] ?? '#e2e8f0';
}
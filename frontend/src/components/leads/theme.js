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
};

/** Returns the pastel header background color for a given stage */
export function colorForStage(stage) {
  return STAGE_PASTELS[stage] ?? '#e2e8f0';
}
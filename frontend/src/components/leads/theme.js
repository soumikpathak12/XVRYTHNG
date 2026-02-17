// components/leads/theme.js
export const BRAND_TEAL = '#146b6b';
export const GREEN_WON = '#16a34a';
export const RED_LOST  = '#dc2626';

/** Pastel header colors for each pipeline stage */
const STAGE_PASTELS = {
  new: '#bae6fd',                 // pastel blue
  contacted: '#e0e7ff',           // pastel indigo
  qualified: '#ccfbf1',           // pastel teal
  inspection_booked: '#ddd6fe',   // pastel violet
  inspection_completed: '#c4b5fd', // pastel purple
  proposal_sent: '#fef3c7',      // pastel amber
  negotiation: '#fed7aa',       // pastel orange
  closed_won: '#bbf7d0',         // pastel green
  closed_lost: '#fecaca',        // pastel red
};

/** Returns the pastel header background color for a given stage */
export function colorForStage(stage) {
  return STAGE_PASTELS[stage] ?? '#e2e8f0';
}
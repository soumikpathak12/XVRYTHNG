// components/leads/theme.js
export const BRAND_TEAL = '#146b6b';
export const GREEN_WON = '#16a34a';
export const RED_LOST  = '#dc2626';

/** Returns the header + border color for a given stage */
export function colorForStage(stage) {
  switch (stage) {
    case 'closed_won':
      return GREEN_WON;
    case 'closed_lost':
      return RED_LOST;
    default:
      return BRAND_TEAL;
  }
}
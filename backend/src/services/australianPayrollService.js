/**
 * Australian payroll helpers — PAYG Schedule 1 Scale 2 (weekly formula),
 * Super Guarantee on ordinary time earnings, NES-style leave accrual hours.
 *
 * PAYG coefficients: FY 2025–26 (1 Jul 2025 – 30 Jun 2026). Replace annually from:
 * https://www.ato.gov.au/tax-rates-and-codes/payg-withholding-schedule-1-statement-of-formulas-for-calculating-amounts-to-be-withheld
 */

/** @typedef {{ min: number, max: number, zero?: boolean, a?: number, b?: number }} Scale2Bracket */

/** Scale 2 — resident, tax-free threshold claimed; weekly payments (Schedule 1). */
const SCALE2_WEEKLY_BRACKETS_FY2025_26 = /** @type {Scale2Bracket[]} */ ([
  { min: 0, max: 361, zero: true },
  { min: 361, max: 500, a: 0.16, b: 57.8462 },
  { min: 500, max: 625, a: 0.26, b: 107.8462 },
  { min: 625, max: 721, a: 0.18, b: 57.8462 },
  { min: 721, max: 865, a: 0.189, b: 64.3365 },
  { min: 865, max: 1282, a: 0.3227, b: 180.0385 },
  { min: 1282, max: 2596, a: 0.32, b: 176.5769 },
  { min: 2596, max: 3653, a: 0.39, b: 358.3077 },
  { min: 3653, max: Number.POSITIVE_INFINITY, a: 0.47, b: 650.6154 },
]);

function xWeekly(weeklyGross) {
  return Math.floor(Number(weeklyGross)) + 0.99;
}

function roundPaygDollar(amount) {
  return Math.round(Number(amount));
}

/**
 * Weekly PAYG withholding (Scale 2). Returns whole dollars ≥ 0.
 * @param {number} weeklyGross — ordinary earnings for that week (inclusive of cents when scaled)
 */
export function calculateWeeklyPaygScale2(weeklyGross) {
  const x = xWeekly(weeklyGross);
  for (const br of SCALE2_WEEKLY_BRACKETS_FY2025_26) {
    if (x >= br.min && x < br.max) {
      if (br.zero) return 0;
      const raw = br.a * x - br.b;
      return Math.max(0, roundPaygDollar(raw));
    }
  }
  const top = SCALE2_WEEKLY_BRACKETS_FY2025_26[SCALE2_WEEKLY_BRACKETS_FY2025_26.length - 1];
  const raw = top.a * x - top.b;
  return Math.max(0, roundPaygDollar(raw));
}

/**
 * Inclusive calendar days for pay period (Australian practice: use pay period length to scale weekly tables).
 */
export function periodInclusiveDays(periodStart, periodEnd) {
  const s = new Date(`${periodStart}T12:00:00`);
  const e = new Date(`${periodEnd}T12:00:00`);
  const ms = e.getTime() - s.getTime();
  const days = Math.floor(ms / 86400000) + 1;
  return Math.max(1, days);
}

export function weeklyEquivalentGross(grossPay, periodStart, periodEnd) {
  const days = periodInclusiveDays(periodStart, periodEnd);
  return (Number(grossPay) * 7) / days;
}

/**
 * Period PAYG from gross using weekly Scale 2 on weekly-equivalent earnings, scaled back to period (whole dollars).
 */
export function calculateAustralianPaygPeriodScale2(grossPay, periodStart, periodEnd) {
  const days = periodInclusiveDays(periodStart, periodEnd);
  const weeklyEq = weeklyEquivalentGross(grossPay, periodStart, periodEnd);
  const weeklyWh = calculateWeeklyPaygScale2(weeklyEq);
  const periodWh = Math.round((weeklyWh * days) / 7);
  return Math.max(0, periodWh);
}

/** SG on ordinary time earnings (excludes overtime pay in typical awards). */
export function calculateSuperGuarantee(ordinaryTimeEarnings, rate) {
  const ote = Number(ordinaryTimeEarnings);
  const r = Number(rate);
  return Math.round(ote * r * 100) / 100;
}

/** NES-style hours accrued this period from ordinary hours worked (full-time equivalence). */
export function calculateLeaveAccrualHours(regularHours, annualLeaveWeeks, personalLeaveWeeks) {
  const h = Number(regularHours);
  const aw = Number(annualLeaveWeeks);
  const pw = Number(personalLeaveWeeks);
  return {
    annual: Math.round(h * (aw / 52) * 10000) / 10000,
    personal: Math.round(h * (pw / 52) * 10000) / 10000,
  };
}

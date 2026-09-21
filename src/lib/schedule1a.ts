/**
 * Schedule 1-A deduction math (tax years 2025–2028).
 * Port of /workspace/no-tax-overtime-calculator/calc.js — Dwight-cleared C1–C4.
 * Premium-OT-only: qualified OT = half-time premium, NOT gross OT wages.
 * FLSA §7 gate + FLSA regular-rate labeling required before positive OT estimate.
 * Not tax advice. Not affiliated with IRS / TurboTax.
 * Income-tax deduction only — FICA still applies.
 */

export type FilingStatus = "single" | "mfj" | "mfs" | "hoh" | "qss";
export type FlsaAnswer = "yes" | "no" | "unsure" | "";
export type RegularRateKnowledge = "known" | "estimate";
export type OtMode = "a" | "b";

export const OT_CAPS: Record<FilingStatus, number> = {
  single: 12500,
  mfj: 25000,
  hoh: 12500,
  qss: 12500,
  mfs: 0,
};

export const MAGI_THRESHOLDS: Record<FilingStatus, number> = {
  single: 150000,
  mfj: 300000,
  hoh: 150000,
  qss: 150000,
  mfs: 0,
};

export const TIPS_CAP = 25000;

export const STATUS_LABELS: Record<FilingStatus, string> = {
  single: "Single",
  mfj: "Married Filing Jointly",
  mfs: "Married Filing Separately",
  hoh: "Head of Household",
  qss: "Qualifying Surviving Spouse",
};

export interface DeductionResult {
  qualified: number;
  cap: number;
  beforePhaseout: number;
  reduction: number;
  deduction: number;
  remainingRoom: number;
  magi: number;
  threshold: number;
  aboveThreshold: boolean;
}

export interface StatusConfig {
  key: FilingStatus;
  eligible: boolean;
  otCap: number;
  tipsCap: number;
  threshold: number;
  label: string;
}

export function money(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function moneyExact(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseNum(value: string | number | null | undefined): number {
  if (value == null || value === "") return 0;
  const v = typeof value === "number" ? value : parseFloat(String(value).replace(/,/g, ""));
  return Number.isFinite(v) ? v : 0;
}

/** Phaseout: floor(excess MAGI / 1000) * $100 */
export function phaseoutReduction(magi: number, threshold: number): number {
  if (magi <= threshold) return 0;
  const excess = magi - threshold;
  const thousands = Math.floor(excess / 1000);
  return thousands * 100;
}

/** Core: min(qualified, cap) - reduction, floored at 0 */
export function computeDeduction(
  qualified: number,
  cap: number,
  magi: number,
  threshold: number
): DeductionResult {
  const beforePhaseout = Math.min(Math.max(qualified, 0), cap);
  const reduction = phaseoutReduction(magi, threshold);
  const deduction = Math.max(beforePhaseout - reduction, 0);
  const remainingRoom = Math.max(cap - Math.max(qualified, 0), 0);
  return {
    qualified: Math.max(qualified, 0),
    cap,
    beforePhaseout,
    reduction,
    deduction,
    remainingRoom,
    magi,
    threshold,
    aboveThreshold: magi > threshold,
  };
}

/**
 * FLSA time-and-a-half: OT rate = 1.5 × regular → premium = 0.5 × regular × OT hours
 */
export function premiumFromHours(regularRate: number, otHours: number): number {
  return 0.5 * Math.max(regularRate, 0) * Math.max(otHours, 0);
}

export function statusConfig(filingStatus: string): StatusConfig {
  const key = (String(filingStatus || "single").toLowerCase() as FilingStatus);
  const safeKey: FilingStatus = OT_CAPS[key] != null ? key : "single";
  return {
    key: safeKey,
    eligible: safeKey !== "mfs",
    otCap: OT_CAPS[safeKey],
    tipsCap: TIPS_CAP,
    threshold: MAGI_THRESHOLDS[safeKey],
    label: STATUS_LABELS[safeKey] || filingStatus,
  };
}

export interface OtCalcInput {
  filingStatus: string;
  taxYear: string;
  magi: number;
  flsa7: FlsaAnswer;
  mode: OtMode;
  regularRate?: number;
  otHours?: number;
  rrKnow?: RegularRateKnowledge;
  qualifiedPremium?: number;
  totalOtWages?: number;
}

export type OtCalcOutcome =
  | {
      kind: "blocked";
      reason: "mfs" | "flsa_unanswered" | "flsa_no" | "flsa_unsure";
      deduction: 0;
      year: string;
      statusLabel: string;
      alertHtml: string;
      alertKind: "danger" | "warn" | "info";
      explain: string;
      estimateOnly: false;
    }
  | {
      kind: "ok";
      result: DeductionResult;
      year: string;
      statusLabel: string;
      explain: string;
      estimateOnly: boolean;
      alertHtml: string;
      alertKind: "danger" | "warn" | "info" | "";
    };

export function computeOtDeduction(input: OtCalcInput): OtCalcOutcome {
  const cfg = statusConfig(input.filingStatus);
  const year = input.taxYear;

  if (!cfg.eligible) {
    return {
      kind: "blocked",
      reason: "mfs",
      deduction: 0,
      year,
      statusLabel: cfg.label,
      alertKind: "danger",
      alertHtml:
        "<strong>Not eligible under MVP rules.</strong> Married Filing Separately generally cannot claim the No Tax on Overtime deduction — married taxpayers must file jointly. Confirm with IRS Schedule 1-A instructions.",
      explain: "Married filing separately is treated as ineligible for this calculator.",
      estimateOnly: false,
    };
  }

  const flsa = input.flsa7;
  if (!flsa) {
    return {
      kind: "blocked",
      reason: "flsa_unanswered",
      deduction: 0,
      year,
      statusLabel: cfg.label,
      alertKind: "warn",
      alertHtml:
        "<strong>FLSA §7 eligibility required.</strong> Select Yes, No, or Not sure before a deduction estimate can be shown. Only overtime required under federal FLSA §7 (not state law or company policy alone) is Schedule 1-A deductible.",
      explain:
        "No deduction estimate until you answer whether this overtime was required under FLSA §7.",
      estimateOnly: false,
    };
  }

  if (flsa === "no" || flsa === "unsure") {
    const reason =
      flsa === "no"
        ? "You indicated this overtime was <em>not</em> required under federal FLSA §7 (state law or company policy only)."
        : "You indicated you are <em>not sure</em> whether this overtime was required under federal FLSA §7.";
    return {
      kind: "blocked",
      reason: flsa === "no" ? "flsa_no" : "flsa_unsure",
      deduction: 0,
      year,
      statusLabel: cfg.label,
      alertKind: "danger",
      alertHtml:
        "<strong>Not shown as Schedule 1-A qualified.</strong> " +
        reason +
        " State-law or employer-policy OT that is not required under FLSA §7 is <strong>not</strong> deductible under Schedule 1-A (CRS). " +
        "Estimated deduction: <strong>$0</strong>. Mode A and Mode B numeric claims stay blocked until you can confirm Yes.",
      explain:
        'Only overtime required under FLSA §7 qualifies. Because your answer was “' +
        (flsa === "no" ? "No" : "Not sure") +
        ',” this calculator does not treat the entered hours or premium as deductible. Confirm with IRS Schedule 1-A instructions or a tax professional.',
      estimateOnly: false,
    };
  }

  const flsaNote =
    " Only OT required under FLSA §7 qualifies for Schedule 1-A; you confirmed Yes.";

  let qualified = 0;
  let explain = "";
  let isEstimateOnly = false;
  const mode = input.mode;

  if (mode === "a") {
    const rate = input.regularRate ?? 0;
    const hours = input.otHours ?? 0;
    qualified = premiumFromHours(rate, hours);
    const rrKnow = input.rrKnow || "known";
    isEstimateOnly = rrKnow === "estimate";

    if (rrKnow === "known") {
      explain =
        "Using your stated FLSA regular rate: premium = 0.5 × $" +
        rate.toFixed(2) +
        "/hr × " +
        hours +
        " OT hours = " +
        moneyExact(qualified) +
        ". Premium uses the FLSA regular rate (which can exceed posted hourly wage when nondiscretionary bonuses/commissions apply) — not total OT wages, and not the OT rate itself.";
    } else {
      explain =
        "ESTIMATE ONLY — simple hourly path: premium = 0.5 × $" +
        rate.toFixed(2) +
        "/hr × " +
        hours +
        " OT hours = " +
        moneyExact(qualified) +
        ". If you have nondiscretionary bonuses, commissions, or other non-hourly pay, your true FLSA regular rate is often higher than this stated wage, so this premium may be wrong. Prefer Mode B / employer-reported qualified OT.";
    }
    explain +=
      " Mode A models time-and-a-half (1.5×) only; double-time / daily OT should use Mode B.";
  } else {
    qualified = input.qualifiedPremium ?? 0;
    explain =
      "You entered qualified OT premium of " +
      moneyExact(qualified) +
      " directly (preferred when pay stub shows an OT premium line or employer reports qualified OT). Remember: qualified OT is the premium above FLSA regular rate only, not total OT wages.";
  }

  if (year === "2025") {
    explain +=
      " TY2025: employers may not separately report qualified OT on the W-2 — reconstruct via Schedule 1-A instructions when needed; Mode B / pay-stub premium is preferred over Mode A.";
  }

  explain += flsaNote;
  explain +=
    " This estimate is a federal income-tax deduction only; Social Security and Medicare (FICA) still apply.";

  const totalOtWages = input.totalOtWages ?? 0;
  if (totalOtWages > 0 && mode === "a") {
    const rate2 = input.regularRate ?? 0;
    const hours2 = input.otHours ?? 0;
    const impliedGross = rate2 * 1.5 * hours2;
    explain +=
      " Optional total OT wages entered: " +
      moneyExact(totalOtWages) +
      " (for education only). Premium used in the deduction is still " +
      moneyExact(qualified) +
      ", not total OT pay.";
    if (impliedGross > 0 && Math.abs(totalOtWages - impliedGross) / impliedGross > 0.05) {
      explain +=
        " Note: at 1.5× your entered rate, expected gross OT ≈ " + moneyExact(impliedGross) + ".";
    }
  } else if (totalOtWages > 0) {
    explain +=
      " Optional total OT wages (" +
      moneyExact(totalOtWages) +
      ") are shown for education — they are not used as qualified OT.";
  }

  const result = computeDeduction(qualified, cfg.otCap, input.magi, cfg.threshold);

  let alertHtml = "";
  let alertKind: "danger" | "warn" | "info" | "" = "";
  if (result.aboveThreshold) {
    const excess = input.magi - result.threshold;
    alertKind = "warn";
    alertHtml =
      "<strong>MAGI phaseout applies.</strong> Your MAGI estimate (" +
      money(input.magi) +
      ") is above the " +
      money(result.threshold) +
      " threshold. Excess ≈ " +
      money(excess) +
      "; reduction = floor(excess ÷ 1,000) × $100 = " +
      money(result.reduction) +
      ".";
  } else if (result.qualified <= 0) {
    alertKind = "info";
    alertHtml =
      "Enter overtime hours and FLSA regular rate (or a qualified premium amount) greater than zero to see a deduction estimate.";
  }

  return {
    kind: "ok",
    result,
    year,
    statusLabel: cfg.label,
    explain,
    estimateOnly: isEstimateOnly && mode === "a",
    alertHtml,
    alertKind,
  };
}

export interface TipsCalcInput {
  filingStatus: string;
  taxYear: string;
  magi: number;
  qualifiedTips: number;
}

export type TipsCalcOutcome =
  | {
      kind: "blocked";
      reason: "mfs";
      deduction: 0;
      year: string;
      statusLabel: string;
      alertHtml: string;
      alertKind: "danger";
    }
  | {
      kind: "ok";
      result: DeductionResult;
      year: string;
      statusLabel: string;
      alertHtml: string;
      alertKind: "danger" | "warn" | "info" | "";
    };

export function computeTipsDeduction(input: TipsCalcInput): TipsCalcOutcome {
  const cfg = statusConfig(input.filingStatus);
  const year = input.taxYear;

  if (!cfg.eligible) {
    return {
      kind: "blocked",
      reason: "mfs",
      deduction: 0,
      year,
      statusLabel: cfg.label,
      alertKind: "danger",
      alertHtml:
        "<strong>Not eligible under MVP rules.</strong> Married Filing Separately generally cannot claim the No Tax on Tips deduction — married taxpayers must file jointly. Confirm with IRS Schedule 1-A instructions.",
    };
  }

  const result = computeDeduction(input.qualifiedTips, cfg.tipsCap, input.magi, cfg.threshold);

  let alertHtml = "";
  let alertKind: "danger" | "warn" | "info" | "" = "";
  if (result.aboveThreshold) {
    const excess = input.magi - result.threshold;
    alertKind = "warn";
    alertHtml =
      "<strong>MAGI phaseout applies.</strong> Your MAGI estimate (" +
      money(input.magi) +
      ") is above the " +
      money(result.threshold) +
      " threshold. Excess ≈ " +
      money(excess) +
      "; reduction = floor(excess ÷ 1,000) × $100 = " +
      money(result.reduction) +
      ".";
  } else if (result.qualified <= 0) {
    alertKind = "info";
    alertHtml = "Enter your qualified tips amount to see a deduction estimate.";
  }

  return {
    kind: "ok",
    result,
    year,
    statusLabel: cfg.label,
    alertHtml,
    alertKind,
  };
}

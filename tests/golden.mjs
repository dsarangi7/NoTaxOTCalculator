/**
 * Golden math tests — must match Dwight-cleared expectations.
 * Run: node --experimental-strip-types tests/golden.mjs
 * Or after build via tsx / node with import from compiled.
 */
import {
  premiumFromHours,
  computeDeduction,
  phaseoutReduction,
  statusConfig,
  computeOtDeduction,
  computeTipsDeduction,
} from "../src/lib/schedule1a.ts";

let passed = 0;
let failed = 0;

function assertEq(name, actual, expected) {
  if (actual === expected) {
    console.log(`PASS  ${name}: ${actual}`);
    passed++;
  } else {
    console.error(`FAIL  ${name}: got ${actual}, expected ${expected}`);
    failed++;
  }
}

// Golden 1: Single $20 × 10 hrs MAGI 140k → $100
{
  const premium = premiumFromHours(20, 10);
  assertEq("premium $20×10", premium, 100);
  const cfg = statusConfig("single");
  const r = computeDeduction(premium, cfg.otCap, 140000, cfg.threshold);
  assertEq("OT Single $20×10 MAGI 140k → deduction", r.deduction, 100);
}

// Golden 2: Single premium $8k MAGI 155500 → $7500
{
  const cfg = statusConfig("single");
  const reduction = phaseoutReduction(155500, cfg.threshold);
  assertEq("phaseout MAGI 155500 single", reduction, 500);
  const r = computeDeduction(8000, cfg.otCap, 155500, cfg.threshold);
  assertEq("OT Single premium $8k MAGI 155500 → deduction", r.deduction, 7500);
}

// Golden 3: Tips MFJ $28k MAGI 302400 → $24800
{
  const cfg = statusConfig("mfj");
  const reduction = phaseoutReduction(302400, cfg.threshold);
  assertEq("phaseout MAGI 302400 MFJ", reduction, 200);
  const r = computeDeduction(28000, cfg.tipsCap, 302400, cfg.threshold);
  assertEq("Tips MFJ $28k MAGI 302400 → deduction", r.deduction, 24800);
}

// Golden 4: FLSA No → $0
{
  const out = computeOtDeduction({
    filingStatus: "single",
    taxYear: "2026",
    magi: 100000,
    flsa7: "no",
    mode: "a",
    regularRate: 20,
    otHours: 10,
  });
  assertEq("FLSA No → blocked", out.kind, "blocked");
  assertEq("FLSA No → deduction 0", out.deduction, 0);
}

// FLSA unsure → $0
{
  const out = computeOtDeduction({
    filingStatus: "single",
    taxYear: "2026",
    magi: 100000,
    flsa7: "unsure",
    mode: "b",
    qualifiedPremium: 5000,
  });
  assertEq("FLSA unsure Mode B still blocked", out.kind, "blocked");
  assertEq("FLSA unsure → 0", out.deduction, 0);
}

// MFS ineligible
{
  const out = computeOtDeduction({
    filingStatus: "mfs",
    taxYear: "2026",
    magi: 100000,
    flsa7: "yes",
    mode: "a",
    regularRate: 20,
    otHours: 10,
  });
  assertEq("MFS OT blocked", out.kind, "blocked");
  const tips = computeTipsDeduction({
    filingStatus: "mfs",
    taxYear: "2026",
    magi: 100000,
    qualifiedTips: 10000,
  });
  assertEq("MFS Tips blocked", tips.kind, "blocked");
}

// Happy path Mode A with FLSA yes
{
  const out = computeOtDeduction({
    filingStatus: "single",
    taxYear: "2026",
    magi: 140000,
    flsa7: "yes",
    mode: "a",
    regularRate: 20,
    otHours: 10,
    rrKnow: "known",
  });
  assertEq("FLSA Yes Mode A kind", out.kind, "ok");
  if (out.kind === "ok") {
    assertEq("FLSA Yes Mode A deduction", out.result.deduction, 100);
    assertEq("estimateOnly false when known", out.estimateOnly, false);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

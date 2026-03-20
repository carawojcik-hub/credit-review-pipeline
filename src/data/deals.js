/**
 * Mock deal data for the credit review pipeline.
 * Kept separate from UI; replace with API/database later.
 */

import {
  getEligibleReviewerIdsForDeal,
  isReviewerEligibleForDeal,
  pickSeededEligibleAssigneeId,
} from "../utils/assignmentLogic.js";
import { reviewers } from "./reviewers.js";

export const DEAL_STATUS = {
  ASSIGNED: "Assigned",
  IN_REVIEW: "In Review",
  APPROVED: "Approved",
  ESCALATED: "Escalated",
};

export const DEAL_STAGE = {
  QUOTED: "Quoted",
  UNDERWRITING: "Underwriting",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
};

// Note: required reviewer level is derived from `amount` + `exceptionRating` in `assignmentLogic.js`.
// `borrowerName` + `propertyName` + `propertyAddress` are derived for prototype realism.
const baseDeals = [
  // D-001..D-036 (30–40 deals)
  {
    id: "D-001",
    borrowerName: "Acme Manufacturing Co.",
    amount: 7_500_000,
    currency: "USD",
    status: DEAL_STATUS.UNASSIGNED,
    stage: DEAL_STAGE.QUOTED,
    submittedAt: "2025-03-10T09:00:00Z",
    industry: "Manufacturing",
    region: "North America",
    exceptionRating: 0,
  },
  {
    id: "D-002",
    borrowerName: "Summit Energy LLC",
    amount: 18_250_000,
    currency: "USD",
    status: DEAL_STATUS.ASSIGNED,
    stage: DEAL_STAGE.UNDERWRITING,
    submittedAt: "2025-03-12T11:30:00Z",
    assignedReviewerId: "R-002",
    isNewAssignment: true,
    industry: "Energy",
    region: "North America",
    exceptionRating: 1,
  },
  {
    id: "D-003",
    borrowerName: "Pacific Logistics Inc.",
    amount: 1_200_000,
    currency: "USD",
    status: DEAL_STATUS.IN_REVIEW,
    stage: DEAL_STAGE.SUBMITTED,
    submittedAt: "2025-03-08T14:00:00Z",
    assignedReviewerId: "R-001",
    industry: "Logistics",
    region: "APAC",
    exceptionRating: 2,
  },
  {
    id: "D-004",
    borrowerName: "Nordic Retail Group",
    amount: 28_000_000,
    currency: "EUR",
    status: DEAL_STATUS.UNASSIGNED,
    stage: DEAL_STAGE.QUOTED,
    submittedAt: "2025-03-17T08:15:00Z",
    industry: "Retail",
    region: "EMEA",
    exceptionRating: 0,
  },
  {
    id: "D-005",
    borrowerName: "TechVentures Ltd.",
    amount: 62_500_000,
    currency: "USD",
    status: DEAL_STATUS.ASSIGNED,
    stage: DEAL_STAGE.SUBMITTED,
    submittedAt: "2025-03-17T16:45:00Z",
    assignedReviewerId: "R-002",
    industry: "Technology",
    region: "North America",
    exceptionRating: 4,
  },
  {
    id: "D-006",
    borrowerName: "Harbor Healthcare Partners",
    amount: 15_000_000,
    currency: "USD",
    status: DEAL_STATUS.UNASSIGNED,
    stage: DEAL_STAGE.UNDERWRITING,
    submittedAt: "2025-03-18T10:05:00Z",
    industry: "Healthcare",
    region: "North America",
    exceptionRating: 5,
  },
  {
    id: "D-007",
    borrowerName: "Orion Chemicals",
    amount: 43_000_000,
    currency: "USD",
    status: DEAL_STATUS.IN_REVIEW,
    stage: DEAL_STAGE.SUBMITTED,
    submittedAt: "2025-03-16T12:10:00Z",
    assignedReviewerId: "R-004",
    industry: "Manufacturing",
    region: "North America",
    exceptionRating: 3,
  },
  {
    id: "D-008",
    borrowerName: "BluePeak Software",
    amount: 22_000_000,
    currency: "USD",
    status: DEAL_STATUS.UNASSIGNED,
    stage: DEAL_STAGE.QUOTED,
    submittedAt: "2025-03-18T13:30:00Z",
    industry: "Technology",
    region: "APAC",
    exceptionRating: 2,
  },
  {
    id: "D-009",
    borrowerName: "Cedar Health Systems",
    amount: 9_500_000,
    currency: "USD",
    status: DEAL_STATUS.ASSIGNED,
    stage: DEAL_STAGE.SUBMITTED,
    submittedAt: "2025-03-15T15:15:00Z",
    assignedReviewerId: "R-003",
    isNewAssignment: true,
    industry: "Healthcare",
    region: "EMEA",
    exceptionRating: 0,
  },
  {
    id: "D-010",
    borrowerName: "Silverline Transport",
    amount: 55_500_000,
    currency: "USD",
    status: DEAL_STATUS.UNASSIGNED,
    stage: DEAL_STAGE.UNDERWRITING,
    submittedAt: "2025-03-14T10:25:00Z",
    industry: "Logistics",
    region: "EMEA",
    exceptionRating: 4,
  },
  {
    id: "D-011",
    borrowerName: "Redwood Retail Group",
    amount: 38_000_000,
    currency: "EUR",
    status: DEAL_STATUS.ASSIGNED,
    stage: DEAL_STAGE.SUBMITTED,
    submittedAt: "2025-03-16T09:45:00Z",
    assignedReviewerId: "R-002",
    industry: "Retail",
    region: "EMEA",
    exceptionRating: 1,
  },
  {
    id: "D-012",
    borrowerName: "MapleGrid Utilities",
    amount: 12_750_000,
    currency: "USD",
    status: DEAL_STATUS.IN_REVIEW,
    stage: DEAL_STAGE.UNDERWRITING,
    submittedAt: "2025-03-11T16:05:00Z",
    assignedReviewerId: "R-004",
    industry: "Energy",
    region: "North America",
    exceptionRating: 0,
  },
  {
    id: "D-013",
    borrowerName: "Saffron Foods Co.",
    amount: 6_250_000,
    currency: "USD",
    status: DEAL_STATUS.UNASSIGNED,
    stage: DEAL_STAGE.QUOTED,
    submittedAt: "2025-03-07T08:20:00Z",
    industry: "Retail",
    region: "North America",
    exceptionRating: 2,
  },
  {
    id: "D-014",
    borrowerName: "Apex Freight Partners",
    amount: 47_000_000,
    currency: "USD",
    status: DEAL_STATUS.ASSIGNED,
    stage: DEAL_STAGE.SUBMITTED,
    submittedAt: "2025-03-13T13:40:00Z",
    assignedReviewerId: "R-004",
    industry: "Logistics",
    region: "EMEA",
    exceptionRating: 3,
  },
  {
    id: "D-015",
    borrowerName: "NovaTech Systems",
    amount: 82_000_000,
    currency: "USD",
    status: DEAL_STATUS.IN_REVIEW,
    stage: DEAL_STAGE.UNDERWRITING,
    submittedAt: "2025-03-18T09:15:00Z",
    assignedReviewerId: "R-001",
    industry: "Technology",
    region: "APAC",
    exceptionRating: 5,
  },
  {
    id: "D-016",
    borrowerName: "Atlas Retail Holdings",
    amount: 25_500_000,
    currency: "EUR",
    status: DEAL_STATUS.UNASSIGNED,
    stage: DEAL_STAGE.QUOTED,
    submittedAt: "2025-03-09T10:10:00Z",
    industry: "Retail",
    region: "EMEA",
    exceptionRating: 2,
  },
  {
    id: "D-017",
    borrowerName: "Helio Energy Group",
    amount: 19_900_000,
    currency: "USD",
    status: DEAL_STATUS.ASSIGNED,
    stage: DEAL_STAGE.UNDERWRITING,
    submittedAt: "2025-03-12T14:20:00Z",
    assignedReviewerId: "R-002",
    industry: "Energy",
    region: "North America",
    exceptionRating: 0,
  },
  {
    id: "D-018",
    borrowerName: "Kestrel Logistics",
    amount: 58_500_000,
    currency: "USD",
    status: DEAL_STATUS.UNASSIGNED,
    stage: DEAL_STAGE.SUBMITTED,
    submittedAt: "2025-03-15T11:40:00Z",
    industry: "Logistics",
    region: "North America",
    exceptionRating: 4,
  },
  {
    id: "D-019",
    borrowerName: "Magenta Manufacturing",
    amount: 41_000_000,
    currency: "USD",
    status: DEAL_STATUS.IN_REVIEW,
    stage: DEAL_STAGE.SUBMITTED,
    submittedAt: "2025-03-16T15:00:00Z",
    assignedReviewerId: "R-004",
    industry: "Manufacturing",
    region: "North America",
    exceptionRating: 2,
  },
  {
    id: "D-020",
    borrowerName: "Pinecone Healthcare Partners",
    amount: 52_250_000,
    currency: "USD",
    status: DEAL_STATUS.UNASSIGNED,
    stage: DEAL_STAGE.UNDERWRITING,
    submittedAt: "2025-03-18T07:50:00Z",
    industry: "Healthcare",
    region: "EMEA",
    exceptionRating: 3,
  },
  {
    id: "D-021",
    borrowerName: "Cobalt Commerce",
    amount: 14_600_000,
    currency: "USD",
    status: DEAL_STATUS.ASSIGNED,
    stage: DEAL_STAGE.SUBMITTED,
    submittedAt: "2025-03-11T09:25:00Z",
    assignedReviewerId: "R-003",
    industry: "Retail",
    region: "APAC",
    // Exception 0 so required level stays Manager — demo assignee Taylor Brooks (R-006) remains valid.
    exceptionRating: 0,
  },
  {
    id: "D-022",
    borrowerName: "Orchard Energy & Renewables",
    amount: 33_750_000,
    currency: "USD",
    status: DEAL_STATUS.IN_REVIEW,
    stage: DEAL_STAGE.UNDERWRITING,
    submittedAt: "2025-03-13T17:10:00Z",
    assignedReviewerId: "R-002",
    industry: "Energy",
    region: "EMEA",
    exceptionRating: 4,
  },
  {
    id: "D-023",
    borrowerName: "Summit Retail Logistics",
    amount: 9_250_000,
    currency: "USD",
    status: DEAL_STATUS.UNASSIGNED,
    stage: DEAL_STAGE.QUOTED,
    submittedAt: "2025-03-06T13:05:00Z",
    industry: "Logistics",
    region: "APAC",
    exceptionRating: 0,
  },
  {
    id: "D-024",
    borrowerName: "VentureWorks Group",
    amount: 27_400_000,
    currency: "USD",
    status: DEAL_STATUS.ASSIGNED,
    stage: DEAL_STAGE.SUBMITTED,
    submittedAt: "2025-03-10T12:45:00Z",
    assignedReviewerId: "R-002",
    isNewAssignment: true,
    industry: "Technology",
    region: "North America",
    exceptionRating: 1,
  },
  {
    id: "D-025",
    borrowerName: "Aurum Manufacturing Partners",
    amount: 6_900_000,
    currency: "USD",
    status: DEAL_STATUS.IN_REVIEW,
    stage: DEAL_STAGE.UNDERWRITING,
    submittedAt: "2025-03-09T15:55:00Z",
    assignedReviewerId: "R-003",
    industry: "Manufacturing",
    region: "North America",
    exceptionRating: 2,
  },
  {
    id: "D-026",
    borrowerName: "Atlas Transport Holdings",
    amount: 64_000_000,
    currency: "USD",
    status: DEAL_STATUS.UNASSIGNED,
    stage: DEAL_STAGE.SUBMITTED,
    submittedAt: "2025-03-14T18:25:00Z",
    industry: "Logistics",
    region: "APAC",
    exceptionRating: 5,
  },
  {
    id: "D-027",
    borrowerName: "Sundial Retail Co.",
    amount: 38_500_000,
    currency: "EUR",
    status: DEAL_STATUS.ASSIGNED,
    stage: DEAL_STAGE.UNDERWRITING,
    submittedAt: "2025-03-15T09:35:00Z",
    assignedReviewerId: "R-002",
    industry: "Retail",
    region: "EMEA",
    exceptionRating: 0,
  },
  {
    id: "D-028",
    borrowerName: "Cedar Valley Manufacturing",
    amount: 21_500_000,
    currency: "USD",
    status: DEAL_STATUS.UNASSIGNED,
    stage: DEAL_STAGE.QUOTED,
    submittedAt: "2025-03-17T12:05:00Z",
    industry: "Manufacturing",
    region: "North America",
    exceptionRating: 2,
  },
  {
    id: "D-029",
    borrowerName: "Blue Horizon Energy",
    amount: 58_000_000,
    currency: "USD",
    status: DEAL_STATUS.IN_REVIEW,
    stage: DEAL_STAGE.SUBMITTED,
    submittedAt: "2025-03-18T15:25:00Z",
    assignedReviewerId: "R-001",
    industry: "Energy",
    region: "North America",
    exceptionRating: 4,
  },
  {
    id: "D-030",
    borrowerName: "Pioneer Technology Labs",
    amount: 16_800_000,
    currency: "USD",
    status: DEAL_STATUS.ASSIGNED,
    stage: DEAL_STAGE.SUBMITTED,
    submittedAt: "2025-03-13T08:55:00Z",
    assignedReviewerId: "R-003",
    industry: "Technology",
    region: "EMEA",
    exceptionRating: 1,
  },
  {
    id: "D-031",
    borrowerName: "Redwood Manufacturing Works",
    amount: 48_500_000,
    currency: "USD",
    status: DEAL_STATUS.UNASSIGNED,
    stage: DEAL_STAGE.UNDERWRITING,
    submittedAt: "2025-03-16T06:35:00Z",
    industry: "Manufacturing",
    region: "North America",
    exceptionRating: 4,
  },
  {
    id: "D-032",
    borrowerName: "Orchid Logistics Group",
    amount: 8_100_000,
    currency: "USD",
    status: DEAL_STATUS.ASSIGNED,
    stage: DEAL_STAGE.QUOTED,
    submittedAt: "2025-03-08T07:15:00Z",
    assignedReviewerId: "R-003",
    industry: "Logistics",
    region: "APAC",
    exceptionRating: 0,
  },
  {
    id: "D-033",
    borrowerName: "Helix Retail & Commerce",
    amount: 33_000_000,
    currency: "EUR",
    status: DEAL_STATUS.IN_REVIEW,
    stage: DEAL_STAGE.SUBMITTED,
    submittedAt: "2025-03-17T14:40:00Z",
    assignedReviewerId: "R-002",
    isNewAssignment: true,
    industry: "Retail",
    region: "EMEA",
    exceptionRating: 2,
  },
  {
    id: "D-034",
    borrowerName: "Crown Manufacturing Holdings",
    amount: 12_200_000,
    currency: "USD",
    status: DEAL_STATUS.UNASSIGNED,
    stage: DEAL_STAGE.UNDERWRITING,
    submittedAt: "2025-03-18T11:20:00Z",
    industry: "Manufacturing",
    region: "EMEA",
    exceptionRating: 3,
  },
  {
    id: "D-035",
    borrowerName: "NovaCare Healthcare Services",
    amount: 91_000_000,
    currency: "USD",
    status: DEAL_STATUS.UNASSIGNED,
    stage: DEAL_STAGE.QUOTED,
    submittedAt: "2025-03-12T10:00:00Z",
    industry: "Healthcare",
    region: "North America",
    exceptionRating: 5,
  },
  {
    id: "D-036",
    borrowerName: "Magellan Transport Network",
    amount: 24_900_000,
    currency: "USD",
    status: DEAL_STATUS.ASSIGNED,
    stage: DEAL_STAGE.APPROVED,
    submittedAt: "2025-03-09T18:30:00Z",
    assignedReviewerId: "R-004",
    industry: "Logistics",
    region: "North America",
    exceptionRating: 2,
  },
];

const STREET_TEMPLATES = [
  "Main St",
  "Market Ave",
  "Broadway",
  "Oak St",
  "Pine St",
  "Lakeview Dr",
  "Cedar Rd",
  "Sunset Blvd",
  "Pearl St",
];

const REGION_TO_ADDRESS = {
  Northeast: { city: "Boston", state: "MA" },
  Southeast: { city: "Atlanta", state: "GA" },
  Central: { city: "Chicago", state: "IL" },
  West: { city: "San Francisco", state: "CA" },
};

function derivePropertyFields(deal) {
  const regionMeta = REGION_TO_ADDRESS[deal.region] ?? REGION_TO_ADDRESS.Northeast;
  const numericId = Number(String(deal.id ?? "").replace(/[^0-9]/g, "")) || 1;
  const streetNo = 100 + (numericId % 850);
  const street = `${streetNo} ${STREET_TEMPLATES[numericId % STREET_TEMPLATES.length]}`;

  return {
    propertyAddress: {
      street,
      city: regionMeta.city,
      state: regionMeta.state,
    },
  };
}

const PRODUCERS = [
  "Rachel Thompson",
  "Michael Brooks",
  "Olivia Martinez",
  "Daniel Kim",
  "Sophia Patel",
  "Ethan Rodriguez",
  "Isabella Nguyen",
  "William Carter",
  "Mia Johnson",
  "Benjamin Lewis",
  "Charlotte Walker",
  "Henry Scott",
];

const UNDERWRITERS = [
  "Priya Desai",
  "Kevin Andrews",
  "Ava Brown",
  "Noah Wilson",
  "Emily Davis",
  "Liam Thompson",
];

// Demo tuning: ensure realistic director rebalancing examples in Northeast.
const DEMO_REGION_OVERRIDES = {
  "D-009": "Northeast",
  "D-021": "Northeast",
  "D-030": "Northeast",
};

const DEMO_ASSIGNEE_OVERRIDES = {
  "D-003": "R-003",
  "D-009": "R-004",
  "D-011": "R-016",
  "D-014": "R-006",
  "D-018": "R-018",
  "D-019": "R-006",
  // Submitted deal on Sam's team assigned to Taylor Brooks (manager under Sam); deal requires Manager.
  "D-021": "R-006",
  "D-026": "R-014",
  "D-029": "R-015",
  // Ensure Drew Patel appears in table with an active assigned submitted deal.
  "D-030": "R-007",
};

function normalizeRegion(legacyRegion, rnd) {
  const region = String(legacyRegion ?? "");
  if (region === "North America") return rnd() < 0.55 ? "Northeast" : "Central";
  if (region === "APAC") return rnd() < 0.7 ? "West" : "Central";
  if (region === "EMEA") return rnd() < 0.65 ? "Southeast" : "Northeast";
  return "Northeast";
}

function hashStringToSeed(str) {
  const s = String(str ?? "");
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function rnd() {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function seededInt(rnd, min, max) {
  const v = Math.floor(rnd() * (max - min + 1)) + min;
  return v;
}

function seededPick(rnd, list) {
  const idx = Math.floor(rnd() * list.length);
  return list[idx] ?? list[0];
}

function pickDeterministicIdFromPool(seedText, idPool) {
  if (!Array.isArray(idPool) || idPool.length === 0) return null;
  const seed = hashStringToSeed(seedText);
  const idx = seed % idPool.length;
  return idPool[idx] ?? null;
}

const MULTIFAMILY_PREFIXES = [
  "Palace Road",
  "Renaissance Gardens",
  "Maple Court",
  "Cedar Pointe",
  "Harbor View",
  "Brookstone",
  "Willow Crest",
  "Parkside",
  "Riverbend",
  "Oak Terrace",
  "Lakeshore",
  "Stonegate",
  "Liberty Place",
  "Grand Oaks",
  "Summit Ridge",
  "Heritage Park",
];

const MULTIFAMILY_TYPES = [
  "Apartments",
  "Senior Living",
  "Residences",
  "Townhomes",
  "Family Housing",
  "Lofts",
];

const BORROWER_INDIVIDUAL_FIRST = [
  "Daniel",
  "Sophia",
  "Michael",
  "Olivia",
  "James",
  "Ava",
  "Lucas",
  "Mia",
  "Ethan",
  "Charlotte",
];

const BORROWER_INDIVIDUAL_LAST = [
  "Parker",
  "Bennett",
  "Sullivan",
  "Hayes",
  "Donovan",
  "Reed",
  "Foster",
  "Coleman",
  "Whitaker",
  "Montgomery",
];

const BORROWER_FIRM_BASE = [
  "Renaissance Gardens",
  "Palace Road",
  "Maple Court",
  "Cedar Pointe",
  "Summit Ridge",
  "Harbor View",
  "Grand Oaks",
  "Willow Crest",
  "Stonegate",
  "Lakeshore",
];

const BORROWER_PARTNERSHIP_BASE = [
  "Riverside Housing",
  "Northbridge Residential",
  "Evergreen Multifamily",
  "Beacon Communities",
  "Metro Living",
  "Parkline Residential",
  "Horizon Apartments",
  "Foundry Housing",
];

const EXCEPTION_REASON_BY_RATING = {
  1: "Extended Time Period for Delivery of Borrower Financials",
  2: "Public REIT or Publicly Held Fund Transfer",
  3: "Revocable Trust Not Signing",
  4: "Insufficient Net Worth/Liquidity",
  5: "Material Litigation",
};

// Keep a few specific deals stable for demo scenarios.
const EXCEPTION_RATING_OVERRIDES = {
  "D-003": 1,
  "D-009": 1,
  "D-011": 1,
  "D-014": 0,
  "D-018": 1,
  "D-019": 0,
  "D-021": 0,
  "D-024": 1,
  "D-026": 2,
  "D-029": 2,
  "D-030": 0,
  "D-033": 2,
};

const AMOUNT_OVERRIDES = {
  "D-011": 18_400_000,
  "D-014": 19_600_000,
  "D-018": 17_900_000,
  "D-019": 16_750_000,
  "D-026": 44_500_000,
  "D-029": 42_200_000,
};

function weightedExceptionRating(rnd) {
  const p = rnd();
  if (p < 0.03) return 5; // very rare
  if (p < 0.08) return 4; // rare
  if (p < 0.35) return 3;
  if (p < 0.68) return 2;
  if (p < 0.93) return 1;
  return 0;
}

const TIMELINE_ANCHOR_UTC_MS = Date.parse("2026-03-20T12:00:00Z");

function derivePropertyName(rnd) {
  const prefix = seededPick(rnd, MULTIFAMILY_PREFIXES);
  const type = seededPick(rnd, MULTIFAMILY_TYPES);
  return `${prefix} ${type}`;
}

function deriveBorrowerName(rnd) {
  const roll = rnd();
  if (roll < 0.34) {
    const first = seededPick(rnd, BORROWER_INDIVIDUAL_FIRST);
    const last = seededPick(rnd, BORROWER_INDIVIDUAL_LAST);
    return `${first} ${last}`;
  }
  if (roll < 0.68) {
    const base = seededPick(rnd, BORROWER_FIRM_BASE);
    return `${base} LLC`;
  }
  const base = seededPick(rnd, BORROWER_PARTNERSHIP_BASE);
  return `${base} Partners, LP`;
}

export const deals = baseDeals.map((d) => {
  const seed = hashStringToSeed(d.id);
  const rnd = mulberry32(seed);

  const loanNumber = seededInt(rnd, 1_000_000, 9_999_999);
  const repeatBorrower = rnd() < 0.32;
  const producer = seededPick(rnd, PRODUCERS);
  const underwriter = d.stage === DEAL_STAGE.QUOTED ? null : seededPick(rnd, UNDERWRITERS);
  const borrowerName = deriveBorrowerName(rnd);
  const propertyName = derivePropertyName(rnd);
  const normalizedRegion = DEMO_REGION_OVERRIDES[d.id] ?? normalizeRegion(d.region, rnd);
  const amount = AMOUNT_OVERRIDES[d.id] ?? d.amount;
  const exceptionRating = EXCEPTION_RATING_OVERRIDES[d.id] ?? weightedExceptionRating(rnd);

  // Keep demo timeline realistic around Mar 2026.
  const submittedBackDays = seededInt(rnd, 1, 45);
  const submitted = new Date(TIMELINE_ANCHOR_UTC_MS - submittedBackDays * 24 * 60 * 60 * 1000);
  const quotedBackDays = seededInt(rnd, 3, 14);
  const quoted = new Date(submitted.getTime() - quotedBackDays * 24 * 60 * 60 * 1000);
  const dueDays = seededInt(rnd, 3, 30);
  const dueFromSubmitted = new Date(submitted.getTime() + dueDays * 24 * 60 * 60 * 1000);
  const dueFutureDays = seededInt(rnd, 3, 30);
  const dueFromAnchor = new Date(TIMELINE_ANCHOR_UTC_MS + dueFutureDays * 24 * 60 * 60 * 1000);
  const due = d.stage === DEAL_STAGE.SUBMITTED ? dueFromAnchor : dueFromSubmitted;
  const dealForRules = { ...d, amount, region: normalizedRegion, exceptionRating };
  const eligibleReviewerIds = getEligibleReviewerIdsForDeal(dealForRules, reviewers);
  const fallbackAssignee = pickSeededEligibleAssigneeId(dealForRules, reviewers, rnd);
  const normalizedStatus =
    d.status === "Unassigned" || d.status == null ? DEAL_STATUS.ASSIGNED : d.status;
  const priorBorrowerReviewerId =
    repeatBorrower && d.stage === DEAL_STAGE.SUBMITTED
      ? pickDeterministicIdFromPool(`${borrowerName}:prior-reviewer`, eligibleReviewerIds)
      : null;

  let assignedReviewerId = null;
  if (d.stage === DEAL_STAGE.SUBMITTED) {
    const preferred = DEMO_ASSIGNEE_OVERRIDES[d.id] ?? d.assignedReviewerId ?? priorBorrowerReviewerId ?? null;
    if (preferred && isReviewerEligibleForDeal(dealForRules, preferred, reviewers)) {
      assignedReviewerId = preferred;
    } else {
      assignedReviewerId = fallbackAssignee;
    }
    if (!assignedReviewerId) {
      const pool = getEligibleReviewerIdsForDeal(dealForRules, reviewers);
      assignedReviewerId = pool[0] ?? null;
    }
  }
  const submittedAt = d.stage === DEAL_STAGE.SUBMITTED ? submitted.toISOString() : null;
  const dueDate =
    d.stage === DEAL_STAGE.SUBMITTED || d.stage === DEAL_STAGE.APPROVED
      ? due.toISOString()
      : null;
  const exceptionReason = EXCEPTION_REASON_BY_RATING[exceptionRating] ?? null;

  return {
    ...d,
    amount,
    currency: "USD",
    region: normalizedRegion,
    borrowerName,
    propertyName,
    ...derivePropertyFields({ ...d, region: normalizedRegion }),
    // Always provide a boolean for UI logic.
    isNewAssignment: Boolean(d.isNewAssignment),
    loanNumber,
    repeatBorrower,
    exceptionRating,
    exceptionReason,
    quotedAt: quoted.toISOString(),
    dueDate,
    submittedAt,
    producer,
    underwriter,
    status: normalizedStatus,
    assignedReviewerId,
    hasBorrowerFamiliarityAssignment:
      Boolean(repeatBorrower) &&
      Boolean(priorBorrowerReviewerId) &&
      assignedReviewerId === priorBorrowerReviewerId,
  };
});

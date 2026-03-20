/**
 * Review-level and capacity logic for the credit review pipeline.
 * All assignment and recommendation logic lives here; UI only consumes results.
 */

export const REVIEWER_LEVEL = {
  MANAGER: "Manager",
  DIRECTOR: "Director",
  VP: "VP",
  PRESIDENT: "President",
};

const LEVEL_RANK = {
  [REVIEWER_LEVEL.MANAGER]: 1,
  [REVIEWER_LEVEL.DIRECTOR]: 2,
  [REVIEWER_LEVEL.VP]: 3,
  [REVIEWER_LEVEL.PRESIDENT]: 4,
};

export function compareLevels(a, b) {
  return (LEVEL_RANK[a] ?? 0) - (LEVEL_RANK[b] ?? 0);
}

export function getLevelRank(level) {
  return LEVEL_RANK[level] ?? 0;
}

export function isLevelAtLeast(reviewerLevel, requiredLevel) {
  return compareLevels(reviewerLevel, requiredLevel) >= 0;
}

export function getAmountBasedRequiredLevel(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return REVIEWER_LEVEL.MANAGER;
  if (amount < 20_000_000) return REVIEWER_LEVEL.MANAGER;
  if (amount < 50_000_000) return REVIEWER_LEVEL.DIRECTOR;
  return REVIEWER_LEVEL.VP;
}

export function getExceptionBasedRequiredLevel(exceptionRating) {
  const r = Math.max(0, Math.min(5, Number(exceptionRating ?? 0)));
  if (r === 0) return REVIEWER_LEVEL.MANAGER;
  if (r <= 2) return REVIEWER_LEVEL.DIRECTOR;
  if (r <= 4) return REVIEWER_LEVEL.VP;
  return REVIEWER_LEVEL.PRESIDENT;
}

export function getDealReviewRequirements(deal) {
  if (!deal) {
    return {
      requiredLevel: REVIEWER_LEVEL.MANAGER,
      amountBasedLevel: REVIEWER_LEVEL.MANAGER,
      exceptionBasedLevel: REVIEWER_LEVEL.MANAGER,
      explanation: "No deal selected.",
    };
  }

  const amountBasedLevel = getAmountBasedRequiredLevel(deal.amount);
  const exceptionBasedLevel = getExceptionBasedRequiredLevel(deal.exceptionRating);
  const requiredLevel =
    compareLevels(amountBasedLevel, exceptionBasedLevel) >= 0 ? amountBasedLevel : exceptionBasedLevel;

  const amountReason =
    deal.amount < 20_000_000
      ? "Amount under 20MM"
      : deal.amount < 50_000_000
        ? "Amount 20MM–<50MM"
        : "Amount 50MM+";

  const exc = Number(deal.exceptionRating ?? 0);
  const riskReason =
    exc === 0 ? "Exception rating 0" : exc <= 2 ? "Exception rating 1–2" : exc <= 4 ? "Exception rating 3–4" : "Exception rating 5";

  const explanation = `${amountReason} ⇒ ${amountBasedLevel}. ${riskReason} ⇒ ${exceptionBasedLevel}. Required is higher of the two ⇒ ${requiredLevel}.`;

  return { requiredLevel, amountBasedLevel, exceptionBasedLevel, explanation };
}

/**
 * Reviewers whose authority meets or exceeds the deal's required level.
 * @param {Object} deal - Deal with at least `amount` and `exceptionRating`
 * @param {Array<{ id: string, level: string }>} reviewers
 * @returns {string[]} Eligible reviewer ids
 */
export function getEligibleReviewerIdsForDeal(deal, reviewers) {
  if (!deal || !Array.isArray(reviewers)) return [];
  const { requiredLevel } = getDealReviewRequirements(deal);
  const eligible = reviewers.filter((r) => isLevelAtLeast(r.level, requiredLevel));
  if (eligible.length > 0) return eligible.map((r) => r.id);
  // Prototype fallback: no one meets the bar — use highest authority available
  const sorted = [...reviewers].sort((a, b) => compareLevels(b.level, a.level));
  return sorted[0] ? [sorted[0].id] : [];
}

/**
 * Whether a reviewer meets the deal's required authority level.
 */
export function isReviewerEligibleForDeal(deal, reviewerId, reviewers) {
  if (!deal || !reviewerId || !Array.isArray(reviewers)) return false;
  const r = reviewers.find((x) => x.id === reviewerId);
  if (!r) return false;
  const { requiredLevel } = getDealReviewRequirements(deal);
  return isLevelAtLeast(r.level, requiredLevel);
}

/**
 * Deterministically pick an assignee from the eligible pool (e.g. mock data seeding).
 * @param {() => number} rnd - Random in [0,1)
 */
export function pickSeededEligibleAssigneeId(deal, reviewers, rnd) {
  const ids = getEligibleReviewerIdsForDeal(deal, reviewers);
  if (!ids.length) return null;
  const idx = Math.floor(rnd() * ids.length);
  return ids[idx];
}

/**
 * Unassigned state is removed in this prototype.
 * This helper is retained for compatibility and always returns an empty list.
 */
export function getUnassignedDeals(deals) {
  void deals;
  return [];
}

/**
 * Whether a reviewer has capacity (current load < max capacity).
 * @param {{ currentLoad: number, maxCapacity: number }} reviewer
 * @returns {boolean}
 */
export function hasCapacity(reviewer) {
  if (!reviewer) return false;
  const { currentLoad = 0, maxCapacity = 0 } = reviewer;
  return currentLoad < maxCapacity;
}

/**
 * Remaining slots for a reviewer.
 * @param {{ currentLoad: number, maxCapacity: number }} reviewer
 * @returns {number}
 */
export function getRemainingCapacity(reviewer) {
  if (!reviewer) return 0;
  const { currentLoad = 0, maxCapacity = 0 } = reviewer;
  return Math.max(0, maxCapacity - currentLoad);
}

/**
 * Score a reviewer for a given deal (higher = better match).
 * Uses capacity first, then region/specialty as secondary factors.
 * @param {Object} deal - Deal with region, industry
 * @param {Object} reviewer - Reviewer with regions, specialties, currentLoad, maxCapacity, level
 * @returns {number} Score 0–100
 */
export function scoreReviewerForDeal(deal, reviewer) {
  if (!deal || !reviewer) return 0;
  let score = 0;
  const remaining = getRemainingCapacity(reviewer);
  if (remaining <= 0) return 0;
  score += Math.min(60, remaining * 10);
  const regionMatch = (reviewer.regions || []).includes(deal.region);
  if (regionMatch) score += 20;
  const specialtyMatch = (reviewer.specialties || []).includes(deal.industry);
  if (specialtyMatch) score += 20;
  return Math.min(100, score);
}

/**
 * Returns reviewers recommended for a deal, sorted by score (best first).
 * Only includes reviewers with capacity and sufficient authority level.
 * Returns explainable reasons for the UI.
 * @param {Object} deal - Deal object
 * @param {Array} reviewers - List of reviewers
 * @returns {Array<{ reviewer: Object, score: number, remainingCapacity: number, reasons: string[] }>}
 */
export function getRecommendedReviewers(deal, reviewers) {
  if (!deal || !Array.isArray(reviewers)) return [];

  const { requiredLevel } = getDealReviewRequirements(deal);

  return reviewers
    .filter((r) => hasCapacity(r))
    .filter((r) => !r.outOfOffice)
    .filter((r) => isLevelAtLeast(r.level, requiredLevel))
    .map((r) => {
      const remainingCapacity = getRemainingCapacity(r);
      const score = scoreReviewerForDeal(deal, r);
      const reasons = buildRecommendationReasons({ deal, reviewer: r, requiredLevel, remainingCapacity });
      return { reviewer: r, score, remainingCapacity, reasons };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);
}

function buildRecommendationReasons({ deal, reviewer, requiredLevel, remainingCapacity }) {
  const reasons = [];
  reasons.push(`Meets required level: ${reviewer.level} ≥ ${requiredLevel}`);

  reasons.push(`Capacity: ${reviewer.currentLoad}/${reviewer.maxCapacity} (${remainingCapacity} open)`);

  if ((reviewer.regions || []).includes(deal.region)) {
    reasons.push(`Region match: ${deal.region}`);
  } else {
    reasons.push(`Region mismatch: deal ${deal.region}`);
  }

  if ((reviewer.specialties || []).includes(deal.industry)) {
    reasons.push(`Specialty match: ${deal.industry}`);
  } else {
    reasons.push(`No specialty match for ${deal.industry}`);
  }

  return reasons;
}

/**
 * Recursively returns all reviewer ids that report (directly or indirectly) to `managerId`.
 * Assumes a `managerId` field on reviewer objects.
 */
export function getSubordinateReviewerIds(managerId, reviewers) {
  if (!managerId || !Array.isArray(reviewers)) return [];

  const result = new Set();
  const stack = [managerId];

  while (stack.length > 0) {
    const currentManagerId = stack.pop();
    for (const r of reviewers) {
      if (r.managerId === currentManagerId && !result.has(r.id)) {
        result.add(r.id);
        stack.push(r.id);
      }
    }
  }

  return Array.from(result);
}

export function getTeamReviewerIds(managerId, reviewers, { includeSelf = true } = {}) {
  const subs = getSubordinateReviewerIds(managerId, reviewers);
  return includeSelf ? [managerId, ...subs] : subs;
}

/**
 * Region team model for visibility/filtering:
 * managers and directors in the current user's region.
 */
export function getRegionalTeamReviewerIds(
  currentUser,
  reviewers,
  { includeSelf = false, levels = [REVIEWER_LEVEL.MANAGER, REVIEWER_LEVEL.DIRECTOR] } = {}
) {
  if (!currentUser || !Array.isArray(reviewers)) return [];
  const region = currentUser.region;
  if (!region) return [];

  const ids = reviewers
    .filter((r) => (r.regions || []).includes(region))
    .filter((r) => levels.includes(r.level))
    .map((r) => r.id);

  if (includeSelf) return Array.from(new Set([currentUser.id, ...ids]));
  return ids.filter((id) => id !== currentUser.id);
}

/**
 * Director permission model for reassignment:
 * direct/indirect reports only (optionally include self).
 */
export function getDirectorSubordinateReviewerIds(
  currentUser,
  reviewers,
  { includeSelf = false, levels = [REVIEWER_LEVEL.MANAGER, REVIEWER_LEVEL.DIRECTOR] } = {}
) {
  if (!currentUser || !Array.isArray(reviewers)) return [];
  const subs = getSubordinateReviewerIds(currentUser.id, reviewers);
  const ids = subs.filter((id) => {
    const r = reviewers.find((x) => x.id === id);
    return r && levels.includes(r.level);
  });
  if (includeSelf) return Array.from(new Set([currentUser.id, ...ids]));
  return ids;
}

/**
 * Directors in the current user's region (peer director coverage pool).
 */
export function getRegionalDirectorPeerIds(currentUser, reviewers, { includeSelf = false } = {}) {
  if (!currentUser || !Array.isArray(reviewers)) return [];
  const region = currentUser.region;
  if (!region) return [];

  const ids = reviewers
    .filter((r) => r.level === REVIEWER_LEVEL.DIRECTOR)
    .filter((r) => (r.regions || []).includes(region))
    .map((r) => r.id);

  if (includeSelf) return Array.from(new Set([currentUser.id, ...ids]));
  return ids.filter((id) => id !== currentUser.id);
}

function getLevelDistanceToRequired(candidateLevel, requiredLevel) {
  const c = getLevelRank(candidateLevel);
  const r = getLevelRank(requiredLevel);
  if (c < r) return Infinity;
  return c - r;
}

/**
 * Returns eligible reassignment candidates for a deal that is currently assigned.
 * - Candidate must be in the director's team.
 * - Candidate must meet required authority level.
 * - Candidate must have capacity and be available (not outOfOffice).
 * Sorted by:
 *  1) closest eligible level (min level distance)
 *  2) lowest current load
 *  3) region match (optional preference)
 */
export function getReassignmentCandidates(deal, reviewers, currentUser) {
  if (!deal || !Array.isArray(reviewers) || !currentUser) return [];
  if (currentUser.level !== REVIEWER_LEVEL.DIRECTOR) return [];

  const { requiredLevel } = getDealReviewRequirements(deal);
  const subordinateIds = getDirectorSubordinateReviewerIds(currentUser, reviewers, { includeSelf: false });
  const peerDirectorIds =
    getLevelRank(requiredLevel) >= getLevelRank(REVIEWER_LEVEL.DIRECTOR)
      ? getRegionalDirectorPeerIds(currentUser, reviewers, { includeSelf: false })
      : [];
  const teamIds = new Set([...subordinateIds, ...peerDirectorIds]);

  return reviewers
    .filter((r) => teamIds.has(r.id))
    .filter((r) => hasCapacity(r))
    .filter((r) => !r.outOfOffice)
    .filter((r) => isLevelAtLeast(r.level, requiredLevel))
    .map((r) => {
      const remainingCapacity = getRemainingCapacity(r);
      const levelDistance = getLevelDistanceToRequired(r.level, requiredLevel);
      const regionMatch = (r.regions || []).includes(deal.region);

      // A UI-friendly score (rank chip in ReviewerRecommendationList)
      const score =
        100 -
        levelDistance * 25 -
        (r.currentLoad ?? 0) * 4 +
        (regionMatch ? 8 : 0) +
        Math.min(remainingCapacity * 3, 12);

      const reasons = [
        `Eligible authority: ${r.level} ≥ ${requiredLevel}`,
        `Capacity: ${r.currentLoad}/${r.maxCapacity} (${remainingCapacity} open)`,
        ...(regionMatch ? [`Region match: ${deal.region}`] : []),
      ];

      return { reviewer: r, score, remainingCapacity, reasons, levelDistance, regionMatch };
    })
    .sort((a, b) => {
      if (a.levelDistance !== b.levelDistance) return a.levelDistance - b.levelDistance;
      if (a.reviewer.currentLoad !== b.reviewer.currentLoad) return a.reviewer.currentLoad - b.reviewer.currentLoad;
      if (a.regionMatch !== b.regionMatch) return a.regionMatch ? -1 : 1;
      return b.remainingCapacity - a.remainingCapacity;
    })
    .map(({ reviewer, score, remainingCapacity, reasons }) => ({
      reviewer,
      score,
      remainingCapacity,
      reasons,
    }));
}

/**
 * Whether the current director is allowed to reassign a deal assigned to `deal.assignedReviewerId`.
 * (Permission rule: director can act on deals assigned to themselves or their team subordinates.)
 */
export function canDirectorReassignAssignedDeal({ deal, currentUser, reviewers }) {
  if (!deal || !currentUser || !Array.isArray(reviewers)) return false;
  if (currentUser.level !== REVIEWER_LEVEL.DIRECTOR) return false;
  if (!deal.assignedReviewerId) return false;
  if (deal.assignedReviewerId === currentUser.id) return true;

  const { requiredLevel } = getDealReviewRequirements(deal);
  const subordinateIds = new Set(getDirectorSubordinateReviewerIds(currentUser, reviewers, { includeSelf: false }));
  if (subordinateIds.has(deal.assignedReviewerId)) return true;

  if (getLevelRank(requiredLevel) < getLevelRank(REVIEWER_LEVEL.DIRECTOR)) return false;
  const regionalDirectorIds = new Set(getRegionalDirectorPeerIds(currentUser, reviewers, { includeSelf: false }));
  return regionalDirectorIds.has(deal.assignedReviewerId);
}

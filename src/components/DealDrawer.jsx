import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";

import { DEAL_STATUS } from "../data/deals.js";
import { getDealReviewRequirements } from "../utils/assignmentLogic.js";

import ReviewerRecommendationList from "./ReviewerRecommendationList.jsx";
import ReviewerReassignmentCandidates from "./ReviewerReassignmentCandidates.jsx";
import { useEffect, useState } from "react";

function formatAmount(amount, currency = "USD") {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(isoString) {
  if (!isoString) return "—";
  try {
    return new Date(isoString).toLocaleDateString("en-US", { dateStyle: "medium" });
  } catch {
    return isoString;
  }
}

function formatAddress(address) {
  if (!address) return "—";
  const street = address.street ?? "";
  const city = address.city ?? "";
  const state = address.state ?? "";
  const base = [city, state].filter(Boolean).join(", ");
  return street && base ? `${street}, ${base}` : street || base || "—";
}

function getExceptionChipColor(exceptionRating) {
  const r = Number(exceptionRating ?? 0);
  if (r === 0) return "default";
  if (r >= 4) return "error";
  return "warning";
}

export default function DealDrawer({
  open,
  onClose,
  deal,
  currentUser,
  canCurrentUserSelfAssign,
  onAssignToMe,
  canReassignDeal,
  reassignmentCandidates,
  onReassignDeal,
  selectedDealRequirements,
  recommendations,
  assignedReviewer,
}) {
  const [showReassign, setShowReassign] = useState(false);
  const [workspaceToastOpen, setWorkspaceToastOpen] = useState(false);
  const [workspaceToastMessage, setWorkspaceToastMessage] = useState("");
  const req = selectedDealRequirements ?? (deal ? getDealReviewRequirements(deal) : null);

  useEffect(() => {
    if (!deal) {
      setShowReassign(false);
      return;
    }
    const isSelf = deal.assignedReviewerId === currentUser.id;
    // For team-assigned (subordinate) deals, show candidates immediately to support reassignment workflow.
    setShowReassign(Boolean(canReassignDeal && !isSelf));
  }, [deal?.id, canReassignDeal, currentUser.id]);

  const isAssignedToMe = Boolean(deal?.assignedReviewerId && deal.assignedReviewerId === currentUser.id);
  const isAssignedToOther = Boolean(deal?.assignedReviewerId && !isAssignedToMe);
  const workspaceCtaLabel = isAssignedToMe ? "Open review workspace" : "View review workspace";
  const workspaceCtaDisabled = !deal?.assignedReviewerId;

  function handleOpenWorkspace() {
    if (!deal?.assignedReviewerId) return;
    setWorkspaceToastMessage(
      `Review workspace would open here for ${isAssignedToMe ? "your" : "assigned"} deal ${deal.id} (placeholder).`
    );
    setWorkspaceToastOpen(true);
  }

  const exceptionLabel = !deal
    ? "—"
    : deal.exceptionRating === 0
      ? "Clean (0)"
      : `Exception ${deal.exceptionRating}`;

  const headerDealName = deal?.propertyName ?? deal?.borrowerName ?? "Deal";
  const headerDealAddress = formatAddress(deal?.propertyAddress);
  const headerDealId = deal?.id ?? "";

  return (
    <Drawer anchor="right" open={open} onClose={onClose} variant="temporary" PaperProps={{ sx: { width: 460 } }}>
      <Box sx={{ height: "100%", overflow: "auto" }}>
        <Paper elevation={0} sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" fontWeight={750} sx={{ lineHeight: 1.2 }}>
                {headerDealName}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {headerDealAddress}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {headerDealId}
              </Typography>
            </Box>

            <IconButton aria-label="close" onClick={onClose} size="small">
              <Typography component="span" sx={{ fontWeight: 700, fontSize: 16, lineHeight: 1 }}>
                X
              </Typography>
            </IconButton>
          </Stack>

          <Divider sx={{ my: 2 }} />

          {!deal ? (
            <Typography variant="body2" color="text.secondary">
              Select a deal to view details.
            </Typography>
          ) : (
            <>
              {/* Deal summary */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Summary
                </Typography>
                <Typography variant="body1" fontWeight={650} sx={{ mt: 0.5 }}>
                  {formatAmount(deal.amount, deal.currency)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                  Borrower: {deal.borrowerName ?? "—"}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                  <Chip label={deal.region ?? "—"} size="small" variant="outlined" />
                  <Chip label={deal.industry ?? "—"} size="small" variant="outlined" />
                  <Chip label={deal.stage ?? "—"} size="small" variant="outlined" />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Submitted: {formatDate(deal.submittedAt)}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Review requirements */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Review requirements
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                  <Chip label={`Required: ${req?.requiredLevel ?? "—"}`} size="small" variant="outlined" color="primary" />
                  <Chip
                    label={exceptionLabel}
                    size="small"
                    variant={deal.exceptionRating === 0 ? "outlined" : "filled"}
                    color={getExceptionChipColor(deal.exceptionRating)}
                  />
                  <Chip label={deal.status ?? "—"} size="small" variant="outlined" />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {req?.explanation ?? "—"}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Actions */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Actions
                </Typography>

                {deal.status === DEAL_STATUS.UNASSIGNED ? (
                  <>
                    {canCurrentUserSelfAssign ? (
                      <Stack spacing={1.25} sx={{ mt: 1 }}>
                        <Typography variant="body2">
                          You are eligible (your level meets the required authority level). Assign this deal to yourself.
                        </Typography>
                        <Button variant="contained" onClick={onAssignToMe}>
                          Assign to me
                        </Button>
                      </Stack>
                    ) : (
                      <Stack spacing={1.25} sx={{ mt: 1 }}>
                        {currentUser.outOfOffice ? (
                          <Alert severity="warning" variant="outlined">
                            You are out of office. New deals will not be assigned to you until you mark yourself available.
                          </Alert>
                        ) : (
                          <>
                            <Typography variant="body2" color="text.secondary">
                              This deal is unassigned. Your level does not meet the required authority level.
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Required: <strong>{req?.requiredLevel ?? "—"}</strong>
                            </Typography>
                          </>
                        )}
                      </Stack>
                    )}
                  </>
                ) : deal.assignedReviewerId === currentUser.id ? (
                  <Stack spacing={1.25} sx={{ mt: 1 }}>
                    {currentUser.outOfOffice ? (
                      <Alert severity="warning" variant="outlined">
                        You are currently out of office. Consider reassigning active deals if needed.
                      </Alert>
                    ) : null}
                    <Typography variant="body2">
                      Assigned to you ({deal.stage} · {deal.status}).
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Button variant="outlined" disabled>
                        Request info
                      </Button>
                      <Button variant="outlined" disabled>
                        Mark in review
                      </Button>
                      <Button variant="contained" disabled>
                        Approve
                      </Button>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      Actions are placeholders in this front-end prototype.
                    </Typography>

                    {canReassignDeal ? (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Alert severity="info" variant="outlined">
                          As a Director, you can rebalance deals across your team.
                        </Alert>
                        <Button
                          variant="contained"
                          onClick={() => setShowReassign((v) => !v)}
                          sx={{ mt: 1 }}
                        >
                          Reassign deal
                        </Button>
                        {showReassign ? (
                          <Box sx={{ mt: 2 }}>
                            <ReviewerReassignmentCandidates
                              candidates={reassignmentCandidates.filter((c) => c?.reviewer?.id !== currentUser.id)}
                              currentAssigneeId={deal.assignedReviewerId}
                              onAssign={(toId) => onReassignDeal?.(toId)}
                            />
                          </Box>
                        ) : null}
                      </>
                    ) : null}
                  </Stack>
                ) : (
                  <Stack spacing={1.25} sx={{ mt: 1 }}>
                    {canReassignDeal ? (
                      <>
                        <Alert severity="info" variant="outlined">
                          As a Director, you can rebalance deals across your team.
                        </Alert>
                        <Typography variant="body2" color="text.secondary">
                          Current assignee:{" "}
                          <strong>{assignedReviewer?.name ?? deal.assignedReviewerId ?? "Unknown"}</strong>{" "}
                          ({assignedReviewer?.level ?? "—"}).
                        </Typography>
                        <Button
                          variant="contained"
                          onClick={() => setShowReassign((v) => !v)}
                          sx={{ mt: 0.5 }}
                        >
                          Reassign deal
                        </Button>
                        {showReassign ? (
                          <Box sx={{ mt: 2 }}>
                            <ReviewerReassignmentCandidates
                              candidates={reassignmentCandidates.filter((c) => c?.reviewer?.id !== assignedReviewer?.id)}
                              currentAssigneeId={deal.assignedReviewerId}
                              onAssign={(toId) => onReassignDeal?.(toId)}
                            />
                          </Box>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <Typography variant="body2" color="text.secondary">
                          Read-only context. Assigned to{" "}
                          <strong>{assignedReviewer?.name ?? deal.assignedReviewerId ?? "Unknown"}</strong>.
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Assignee level: <strong>{assignedReviewer?.level ?? "—"}</strong>
                        </Typography>
                      </>
                    )}
                  </Stack>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Downstream handoff CTA */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Next step
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, flexWrap: "wrap" }} useFlexGap>
                  <Button
                    variant="contained"
                    disabled={workspaceCtaDisabled}
                    onClick={handleOpenWorkspace}
                  >
                    {workspaceCtaLabel}
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    Detailed credit analysis and approval work continue in the linked review workspace.
                  </Typography>
                </Stack>
                {workspaceCtaDisabled ? (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                    Assign the deal to continue to the review workspace.
                  </Typography>
                ) : null}
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Recommended reviewers */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Recommended reviewers
                </Typography>

                {deal.status === DEAL_STATUS.UNASSIGNED ? (
                  <Box sx={{ mt: 1.25 }}>
                    <ReviewerRecommendationList recommendations={recommendations} />
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
                    This deal is already assigned; recommendations are not shown.
                  </Typography>
                )}
              </Box>
            </>
          )}
        </Paper>
      </Box>

      <Snackbar
        open={workspaceToastOpen}
        autoHideDuration={4500}
        onClose={() => setWorkspaceToastOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Alert onClose={() => setWorkspaceToastOpen(false)} severity="info" variant="filled" sx={{ width: "100%" }}>
          {workspaceToastMessage}
        </Alert>
      </Snackbar>
    </Drawer>
  );
}


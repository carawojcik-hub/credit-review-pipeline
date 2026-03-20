import { Alert, Box, Button, Chip, Divider, Drawer, IconButton, Paper, Stack, Typography, Snackbar } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { DEAL_STAGE } from "../data/deals.js";

function formatAmount(amount, currency = "USD") {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatAddress(address) {
  if (!address) return "—";
  const street = address.street ?? "";
  const city = address.city ?? "";
  const state = address.state ?? "";
  const base = [city, state].filter(Boolean).join(", ");
  return street && base ? `${street}, ${base}` : street || base || "—";
}

function formatDate(isoString) {
  if (!isoString) return "—";
  try {
    return new Date(isoString).toLocaleDateString("en-US", { dateStyle: "medium" });
  } catch {
    return isoString;
  }
}

function getExceptionChipVariant(exceptionRating) {
  const r = Number(exceptionRating ?? 0);
  if (r === 0) return { variant: "outlined", color: "default", label: `Clean (${r})` };
  if (r >= 4) return { variant: "filled", color: "error", label: `Exception ${r}` };
  if (r === 3) return { variant: "filled", color: "warning", label: `Exception ${r}` };
  return { variant: "outlined", color: "info", label: `Exception ${r}` };
}

function TimelineCompleteIcon({ complete }) {
  if (complete) {
    return (
      <Typography component="span" sx={{ color: "success.main", fontWeight: 900, lineHeight: 1 }}>
        ✓
      </Typography>
    );
  }

  return (
    <Box
      component="span"
      sx={{
        width: 18,
        height: 18,
        borderRadius: "50%",
        border: "2px solid",
        borderColor: "text.secondary",
        boxSizing: "border-box",
        display: "inline-block",
      }}
    />
  );
}

export default function DealDrawerClean({
  open,
  onClose,
  deal,
  currentUser,
  assignedReviewer,
  canReassignDeal,
  onRequestReassignPopover,
}) {
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    setToastOpen(false);
  }, [deal?.id]);

  const isAssignedToMe = Boolean(deal?.assignedReviewerId && deal.assignedReviewerId === currentUser.id);
  const workspaceButtonLabel = "Open Deal Workspace";

  const excChip = useMemo(() => getExceptionChipVariant(deal?.exceptionRating), [deal?.exceptionRating]);

  const quotedAt = deal?.quotedAt ?? deal?.submittedAt;
  const producer = deal?.producer ?? "—";
  const underwriter = deal?.underwriter ?? "—";
  const approvalDue = deal?.dueDate ?? "—";
  const assignedApproverName = assignedReviewer?.name ?? deal?.assignedReviewerId ?? "—";

  const stageRank = {
    [DEAL_STAGE.QUOTED]: 1,
    [DEAL_STAGE.UNDERWRITING]: 2,
    [DEAL_STAGE.SUBMITTED]: 3,
    [DEAL_STAGE.APPROVED]: 4,
  };
  const stageValue = stageRank[deal?.stage] ?? 0;
  const completeQuoted = stageValue >= 1;
  const completeSubmitted = stageValue >= 3;
  const completeApprovalDue = stageValue >= 4;
  const showReassignButton = deal?.stage !== DEAL_STAGE.APPROVED;

  function handleOpenWorkspace() {
    if (!deal?.assignedReviewerId) return;
    const who = isAssignedToMe ? "your" : "assigned";
    setToastMessage(`Review workspace would open here for ${who} deal ${deal.id} (placeholder).`);
    setToastOpen(true);
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose} variant="temporary" PaperProps={{ sx: { width: 500 } }}>
      <Box sx={{ height: "100%", overflow: "auto" }}>
        <Paper elevation={0} sx={{ p: 2 }}>
          {/* Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                {deal?.propertyName ?? "Deal"}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {formatAddress(deal?.propertyAddress)}
              </Typography>
            </Box>

            <IconButton aria-label="close" onClick={onClose} size="small">
              <Typography component="span" sx={{ fontWeight: 700, fontSize: 16, lineHeight: 1 }}>
                X
              </Typography>
            </IconButton>
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* Metadata row */}
          {deal ? (
            <Box>
              <Typography variant="subtitle1" color="text.secondary">
                Overview
              </Typography>
              <Stack spacing={0.75} sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Loan Amount: <Typography component="span" variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>{formatAmount(deal.amount, deal.currency)}</Typography>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Exception Level: <Typography component="span" variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>{deal.exceptionRating ?? 0}</Typography>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Loan number: <Typography component="span" variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>{deal.loanNumber != null ? String(deal.loanNumber).padStart(7, "0") : "—"}</Typography>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Borrower: <Typography component="span" variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>{deal.borrowerName ?? "—"}</Typography>
                </Typography>
              </Stack>

              <Divider sx={{ my: 2 }} />

              {/* Primary CTA */}
              <Button
                variant="contained"
                fullWidth
                disabled={!deal.assignedReviewerId}
                onClick={handleOpenWorkspace}
              >
                {workspaceButtonLabel}
              </Button>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Select a deal to view details.
            </Typography>
          )}

          {/* Timeline */}
          {deal ? (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" color="text.secondary">
                Timeline
              </Typography>

              <Stack spacing={1.5} sx={{ mt: 1 }}>
                {/* Approval due row */}
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  spacing={1}
                  flexWrap="wrap"
                  useFlexGap
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TimelineCompleteIcon complete={completeApprovalDue} />
                    <Typography variant="body2" color="text.secondary">
                      Approval due on {formatDate(deal.dueDate)} by Reviewer: {assignedApproverName}
                    </Typography>
                  </Stack>
                  {showReassignButton ? (
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={!canReassignDeal}
                      onClick={() => onRequestReassignPopover?.(deal.id)}
                    >
                      Reassign deal
                    </Button>
                  ) : null}
                </Stack>

                {/* Submitted row */}
                <Stack direction="row" spacing={1} alignItems="center">
                  <TimelineCompleteIcon complete={completeSubmitted} />
                  <Typography variant="body2" color="text.secondary">
                    Submitted on {formatDate(deal.submittedAt)} by Underwriter: {underwriter}
                  </Typography>
                </Stack>

                {/* Quoted row */}
                <Stack direction="row" spacing={1} alignItems="center">
                  <TimelineCompleteIcon complete={completeQuoted} />
                  <Typography variant="body2" color="text.secondary">
                    Quoted on {formatDate(quotedAt)} by Producer: {producer}
                  </Typography>
                </Stack>
              </Stack>

              {currentUser.outOfOffice ? (
                <Alert severity="warning" variant="outlined" sx={{ mt: 2 }}>
                  You are currently out of office.
                </Alert>
              ) : null}
            </>
          ) : null}
        </Paper>

        <Snackbar
          open={toastOpen}
          autoHideDuration={4500}
          onClose={() => setToastOpen(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        >
          <Alert onClose={() => setToastOpen(false)} severity="info" variant="filled" sx={{ width: "100%" }}>
            {toastMessage}
          </Alert>
        </Snackbar>
      </Box>
    </Drawer>
  );
}


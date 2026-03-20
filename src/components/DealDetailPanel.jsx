import {
  Box,
  Paper,
  Typography,
  Chip,
  Stack,
  Divider,
} from "@mui/material";

import { getDealReviewRequirements } from "../utils/assignmentLogic.js";

/**
 * Displays details for the selected deal. Shows empty state when none selected.
 */
export default function DealDetailPanel({ deal }) {
  if (!deal) {
    return (
      <Paper variant="outlined" sx={{ p: 3, height: "100%", minHeight: 200 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Deal details
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Select a deal from the queue to view details and reviewer recommendations.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, height: "100%", minHeight: 200 }}>
      <Typography variant="subtitle2" color="text.secondary">
        Deal details
      </Typography>
      <Typography variant="h6" sx={{ mt: 1 }}>
        {deal.borrowerName}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {deal.id}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
        <Chip label={deal.stage ?? "—"} size="small" variant="outlined" />
        <Chip label={deal.status ?? "—"} size="small" variant="outlined" />
        {deal.assignedReviewerId ? (
          <Chip label={`Assignee: ${deal.assignedReviewerId}`} size="small" variant="outlined" />
        ) : (
          <Chip label="Unassigned" size="small" variant="outlined" />
        )}
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
        <Chip label={deal.industry} size="small" variant="outlined" />
        <Chip label={deal.region} size="small" variant="outlined" />
      </Stack>
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Amount
        </Typography>
        <Typography variant="body1" fontWeight={500}>
          {formatAmount(deal.amount, deal.currency)}
        </Typography>
      </Box>
      <Box sx={{ mt: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Submitted
        </Typography>
        <Typography variant="body2">
          {formatDate(deal.submittedAt)}
        </Typography>
      </Box>

      <Divider sx={{ my: 2 }} />

      <ReviewRequirements deal={deal} />
    </Paper>
  );
}

function ReviewRequirements({ deal }) {
  const req = getDealReviewRequirements(deal);

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary">
        Review requirements
      </Typography>

      <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center" flexWrap="wrap" useFlexGap>
        <Chip label={`Required: ${req.requiredLevel}`} color="primary" />
        <Chip
          label={deal.exceptionRating === 0 ? "Exception: Clean (0)" : `Exception: ${deal.exceptionRating}`}
          color={deal.exceptionRating >= 4 ? "error" : deal.exceptionRating >= 1 ? "warning" : "default"}
          variant={deal.exceptionRating === 0 ? "outlined" : "filled"}
        />
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {req.explanation}
      </Typography>
    </Box>
  );
}

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
    return new Date(isoString).toLocaleDateString("en-US", {
      dateStyle: "medium",
    });
  } catch {
    return isoString;
  }
}

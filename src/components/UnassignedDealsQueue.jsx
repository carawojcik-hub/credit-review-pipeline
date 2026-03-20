import {
  Box,
  CardActionArea,
  Chip,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import { getDealReviewRequirements } from "../utils/assignmentLogic.js";
import { reviewers } from "../data/reviewers.js";
import { DEAL_STATUS } from "../data/deals.js";

/**
 * Displays the pipeline list. Each item is clickable to select a deal.
 */
export default function UnassignedDealsQueue({
  deals,
  selectedDealId,
  onSelectDeal,
  title = "Pipeline",
  showAssignee = true,
}) {
  if (!deals?.length) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          No deals to show.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="subtitle2" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {deals.length} deal{deals.length !== 1 ? "s" : ""}
        </Typography>
      </Box>
      <List disablePadding>
        {deals.map((deal) => (
          <ListItem key={deal.id} disablePadding divider>
            <CardActionArea
              onClick={() => onSelectDeal?.(deal.id)}
              sx={{
                bgcolor: selectedDealId === deal.id ? "action.selected" : "transparent",
                outline: selectedDealId === deal.id ? "2px solid" : "none",
                outlineColor: selectedDealId === deal.id ? "primary.main" : "transparent",
                outlineOffset: selectedDealId === deal.id ? "-2px" : 0,
                px: 2,
                py: 1.5,
              }}
            >
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="body2" fontWeight={600}>
                      {deal.borrowerName}
                    </Typography>
                    <Chip
                      label={getDealReviewRequirements(deal).requiredLevel}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                    <Chip
                      label={deal.exceptionRating === 0 ? "Clean" : `Exception ${deal.exceptionRating}`}
                      size="small"
                      variant={deal.exceptionRating === 0 ? "outlined" : "filled"}
                      color={deal.exceptionRating === 0 ? "default" : deal.exceptionRating >= 4 ? "error" : "warning"}
                    />
                  </Stack>
                }
                secondary={
                  <Stack spacing={0.25}>
                    <Typography variant="caption" color="text.secondary">
                      {deal.id} · {formatAmount(deal.amount, deal.currency)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Status: {deal.status}
                      {showAssignee ? renderAssignee(deal) : null}
                    </Typography>
                  </Stack>
                }
              />
            </CardActionArea>
          </ListItem>
        ))}
      </List>
    </Paper>
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

function renderAssignee(deal) {
  if (!deal.assignedReviewerId || deal.status === DEAL_STATUS.UNASSIGNED) return "";
  const assignee = reviewers.find((r) => r.id === deal.assignedReviewerId);
  if (!assignee) return " · Assignee: Unknown";
  return ` · Assignee: ${assignee.name}`;
}

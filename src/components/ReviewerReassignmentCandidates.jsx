import {
  Box,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

/**
 * Shows eligible reassignment candidates with a short "why" and an Assign action.
 */
export default function ReviewerReassignmentCandidates({ candidates, currentAssigneeId, onAssign }) {
  if (!candidates?.length) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Eligible reviewers
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          No eligible reviewers found for reassignment in your team (capacity/authority/availability constraints).
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="subtitle2" color="text.secondary">
          Eligible reviewers
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {candidates.length} candidate{candidates.length !== 1 ? "s" : ""}
        </Typography>
      </Box>

      <List disablePadding>
        {candidates
          .filter((c) => c?.reviewer?.id)
          .map(({ reviewer, remainingCapacity, reasons }, index) => {
            const isCurrentAssignee = reviewer.id === currentAssigneeId;
            return (
              <ListItem
                key={reviewer.id}
                divider={index < candidates.length - 1}
                sx={{ py: 1.5, px: 2, alignItems: "flex-start" }}
              >
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography variant="body2" fontWeight={700}>
                        {reviewer.name}
                      </Typography>
                      <Chip label={reviewer.level} size="small" variant="outlined" />
                      <Chip
                        label={`Load ${reviewer.currentLoad}/${reviewer.maxCapacity}`}
                        size="small"
                        variant="outlined"
                        color={remainingCapacity > 0 ? "default" : "error"}
                      />
                    </Stack>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Stack spacing={0.5}>
                        {(reasons || []).slice(0, 3).map((r) => (
                          <Typography key={r} variant="caption" color="text.secondary">
                            {r}
                          </Typography>
                        ))}
                      </Stack>
                    </Box>
                  }
                />

                <Box sx={{ ml: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    disabled={isCurrentAssignee}
                    onClick={() => onAssign?.(reviewer.id)}
                  >
                    Assign
                  </Button>
                </Box>
              </ListItem>
            );
          })}
      </List>
    </Paper>
  );
}


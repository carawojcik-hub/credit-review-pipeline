import {
  Box,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
  Chip,
  Stack,
  Divider,
} from "@mui/material";

/**
 * Displays recommended reviewers for the selected deal, with reasons.
 */
export default function ReviewerRecommendationList({ recommendations }) {
  if (!recommendations?.length) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Recommended reviewers
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Select a deal to see recommendations.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="subtitle2" color="text.secondary">
          Recommended reviewers
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {recommendations.length} with capacity
        </Typography>
      </Box>
      <List disablePadding>
        {recommendations.map(({ reviewer, score, remainingCapacity, reasons }, index) => (
          <ListItem
            key={reviewer.id}
            divider={index < recommendations.length - 1}
            sx={{ py: 1.5, px: 2 }}
          >
            <ListItemText
              primary={
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="body2" fontWeight={600}>
                    {reviewer.name}
                  </Typography>
                  <Chip label={reviewer.level} size="small" variant="outlined" />
                </Stack>
              }
              secondary={
                <Box sx={{ mt: 0.75 }}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      label={`Capacity ${reviewer.currentLoad}/${reviewer.maxCapacity}`}
                      size="small"
                      variant="outlined"
                      color={remainingCapacity > 0 ? "default" : "error"}
                    />
                    <Chip
                      label={`${remainingCapacity} slot${remainingCapacity !== 1 ? "s" : ""} free`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={`Rank ${score}`}
                      size="small"
                      variant="filled"
                      color={score >= 70 ? "primary" : "default"}
                    />
                  </Stack>
                  <Divider sx={{ my: 1 }} />
                  <Stack spacing={0.5}>
                    {(reasons || []).map((r) => (
                      <Typography key={r} variant="caption" color="text.secondary">
                        {r}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}

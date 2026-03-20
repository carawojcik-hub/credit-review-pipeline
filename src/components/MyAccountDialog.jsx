import { useMemo } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Typography,
} from "@mui/material";

function initials(name) {
  const parts = String(name ?? "")
    .split(" ")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return "U";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

export default function MyAccountDialog({ open, onClose, user, onToggleOutOfOffice }) {
  const availabilityLabel = user?.outOfOffice ? "Out of Office" : "Available";

  const currentLoadLabel = useMemo(() => {
    if (typeof user?.currentLoad !== "number" || typeof user?.maxCapacity !== "number") return "— / —";
    return `${user.currentLoad} / ${user.maxCapacity} deals`;
  }, [user?.currentLoad, user?.maxCapacity]);

  const calendarView = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const first = new Date(year, month, 1);
    const startWeekday = first.getDay(); // Sun=0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const leading = Array.from({ length: startWeekday }, () => null);
    const cells = [...leading, ...days];
    while (cells.length % 7 !== 0) cells.push(null);
    return {
      monthLabel,
      today: now.getDate(),
      cells,
    };
  }, []);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          border: "1px solid",
          borderColor: "divider",
        },
      }}
    >
      <DialogTitle sx={{ bgcolor: "action.hover" }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "primary.light",
              border: "1px solid",
              borderColor: "primary.main",
              color: "primary.contrastText",
              fontWeight: 800,
            }}
          >
            {initials(user?.name)}
          </Box>
          <Box>
            <Typography variant="h6" sx={{ lineHeight: 1.2, color: "text.primary" }}>
              My Account
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.name} · {user?.level} · {user?.region}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              User Info
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
              <Chip label={user?.level ?? "—"} size="small" variant="outlined" color="primary" />
              <Chip label={user?.region ?? "—"} size="small" variant="outlined" />
            </Stack>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Reviewer Context
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Current load: <strong>{currentLoadLabel}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Max capacity: <strong>{user?.maxCapacity ?? "—"}</strong>
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Availability
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
              <Chip
                label={availabilityLabel}
                size="small"
                variant={user?.outOfOffice ? "filled" : "outlined"}
                color={user?.outOfOffice ? "warning" : "primary"}
              />
              <FormControlLabel
                sx={{ ml: "auto" }}
                control={<Switch checked={!user?.outOfOffice} onChange={(e) => onToggleOutOfOffice?.(!e.target.checked)} />}
                label={user?.outOfOffice ? "Mark available" : "Mark out of office"}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              Availability affects whether new deals can be assigned to you.
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Calendar Integration
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Connected calendar: <strong>Microsoft Outlook</strong>
            </Typography>
            <Button variant="outlined" size="small" sx={{ mt: 1 }}>
              Connect calendar
            </Button>
            <Paper variant="outlined" sx={{ mt: 1.25, p: 1.25, borderColor: "divider" }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {calendarView.monthLabel}
              </Typography>
              <Box
                sx={{
                  mt: 0.75,
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: 0.5,
                }}
              >
                {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
                  <Typography
                    key={`dow-${d}`}
                    variant="caption"
                    color="text.secondary"
                    sx={{ textAlign: "center", fontWeight: 700 }}
                  >
                    {d}
                  </Typography>
                ))}
                {calendarView.cells.map((day, idx) => (
                  <Box
                    key={`cell-${idx}`}
                    sx={{
                      height: 24,
                      borderRadius: 0.75,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor:
                        day == null
                          ? "transparent"
                          : day === calendarView.today
                            ? "primary.main"
                            : "background.default",
                      color:
                        day == null
                          ? "text.disabled"
                          : day === calendarView.today
                            ? "primary.contrastText"
                            : "text.primary",
                    }}
                  >
                    <Typography variant="caption">{day ?? ""}</Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              Availability can be synced from your calendar so out-of-office periods auto-update (visual preview only).
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              System impact
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              When marked out of office, new deals will not be assigned to you and you may be prompted to reassign active deals.
            </Typography>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}


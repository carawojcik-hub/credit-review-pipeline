import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Alert,
  Button,
  Chip,
  Checkbox,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Popover,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  TextField,
  Tooltip,
  Typography,
  ListItemText,
  FormControl,
  Divider,
} from "@mui/material";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import {
  getDealReviewRequirements,
  getReassignmentCandidates,
  canDirectorReassignAssignedDeal,
} from "../utils/assignmentLogic.js";
import { DEAL_STAGE } from "../data/deals.js";
import ReviewerReassignmentCandidates from "./ReviewerReassignmentCandidates.jsx";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import { alpha } from "@mui/material/styles";
import { useTheme } from "@mui/material/styles";

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

function formatCapacityTooltip(reviewer) {
  if (!reviewer) return "Capacity unavailable";
  const current = Number(reviewer.currentLoad ?? 0);
  const max = Number(reviewer.maxCapacity ?? 0);
  const open = Math.max(0, max - current);
  const status = reviewer.outOfOffice ? "Out of office" : "Available";
  return `${status} — Capacity: ${current}/${max} (${open} open)`;
}

function getCapacityColor(reviewer) {
  if (!reviewer) return "text.disabled";
  if (reviewer.outOfOffice) return "text.disabled";
  const current = Number(reviewer.currentLoad ?? 0);
  const max = Number(reviewer.maxCapacity ?? 0);
  if (max <= 0) return "text.disabled";
  if (current >= max) return "error.main";
  const utilization = current / max;
  if (utilization >= 0.85) return "warning.main";
  return "success.main";
}

function getExceptionChipProps(exceptionRating) {
  const r = Number(exceptionRating ?? 0);
  if (r === 0) return { label: "Clean (0)", variant: "outlined", color: "default" };
  if (r >= 4) return { label: `Exception ${r}`, variant: "filled", color: "error" };
  if (r === 3) return { label: `Exception ${r}`, variant: "filled", color: "warning" };
  return { label: `Exception ${r}`, variant: "outlined", color: "info" };
}

function FilterGlyph({ active }) {
  const theme = useTheme();
  const stroke = active ? "currentColor" : theme.palette.text.secondary;
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 6h16l-6 7v5l-4 1v-6L4 6Z"
        stroke={stroke}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function toLower(s) {
  return String(s ?? "").toLowerCase();
}

const REQUIRED_LEVELS = ["Manager", "Director", "VP", "President"];
const EXCEPTION_OPTIONS = [0, 1, 2, 3, 4, 5];
const PROTOTYPE_TODAY_TS = Date.parse("2026-03-20T12:00:00Z");

function getDaysToDue(dueDate) {
  const dueTs = new Date(dueDate ?? 0).getTime();
  if (!Number.isFinite(dueTs) || dueTs <= 0) return null;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((dueTs - PROTOTYPE_TODAY_TS) / msPerDay);
}

function getSlaBucket(daysToDue) {
  if (daysToDue == null) return null;
  if (daysToDue < 0) return "Overdue";
  if (daysToDue === 0) return "Due today";
  if (daysToDue <= 3) return "Due soon";
  if (daysToDue <= 7) return "Upcoming";
  return "On track";
}

function getSlaChipProps(bucket) {
  if (bucket === "Overdue") return { color: "error", variant: "filled" };
  if (bucket === "Due today") return { color: "warning", variant: "filled" };
  if (bucket === "Due soon") return { color: "warning", variant: "outlined" };
  if (bucket === "Upcoming") return { color: "info", variant: "outlined" };
  return { color: "success", variant: "outlined" };
}

function requiredSortRank(level) {
  // Higher rank means higher authority
  const rankMap = {
    Manager: 1,
    Director: 2,
    VP: 3,
    President: 4,
  };
  return rankMap[level] ?? 0;
}

export default function PipelineTable({
  deals,
  selectedDealId,
  onSelectDeal,
  currentUser,
  reviewers,
  teamReviewerIds = [],
  oooReviewerIds = [],
  oooWorkflowActive = false,
  quickFilterRequest,
  quickFilterNonce,
  assignmentPopoverDealId,
  assignmentPopoverNonce,
  onAssignmentPopoverClose,
  onAssignDeal,
  onReassignSelectedOOODeals,
  onCancelOOOWorkflow,
}) {
  const reviewerById = useMemo(() => {
    return reviewers.reduce((acc, r) => {
      acc[r.id] = r;
      return acc;
    }, {});
  }, [reviewers]);

  const teamReviewerIdSet = useMemo(() => new Set(teamReviewerIds), [teamReviewerIds]);
  const oooReviewerIdSet = useMemo(() => new Set(oooReviewerIds), [oooReviewerIds]);

  const dealMeta = useMemo(() => {
    return deals.map((deal) => ({
      deal,
      ...getDealReviewRequirements(deal),
    }));
  }, [deals]);

  const stageOptions = useMemo(() => {
    const set = new Set(deals.map((d) => d.stage ?? "—"));
    return Array.from(set);
  }, [deals]);

  // Sorting (single active column)
  const [sort, setSort] = useState({ key: "submittedAt", dir: "desc" }); // key: submittedAt | amount | requiredLevel | property | borrower | ...

  // Column filters (AND logic)
  const [filters, setFilters] = useState({
    propertyText: "",
    borrowerText: "",
    repeatBorrowersOnly: false,
    amountMin: "",
    amountMax: "",
    exceptionRatings: [],
    requiredLevels: [],
    stages: [],
    assignedReviewerFilter: "any", // any | assignedToMe | team | <reviewerId>
    submittedMin: "", // YYYY-MM-DD
    submittedMax: "", // YYYY-MM-DD
    highRiskShortcut: false, // OR-based computed shortcut
    dueSoonShortcut: false, // due within next 3 days
    oooImpactedShortcut: false, // assigned to out-of-office team member
  });
  const [selectedOOODealIds, setSelectedOOODealIds] = useState([]);

  const [popover, setPopover] = useState({ key: null, anchorEl: null });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const filterAnchorOpen = Boolean(popover.anchorEl);
  const closePopover = () => setPopover({ key: null, anchorEl: null });

  // Deal assignment popover (anchored to the "Assigned reviewer" cell).
  const assignedCellRefs = useRef({});
  const [assignmentAnchorEl, setAssignmentAnchorEl] = useState(null);
  const [assignmentDealId, setAssignmentDealId] = useState(null);
  const assignmentOpen = Boolean(assignmentAnchorEl);

  const assignmentDeal = useMemo(() => {
    if (!assignmentDealId) return null;
    return deals.find((d) => d.id === assignmentDealId) ?? null;
  }, [assignmentDealId, deals]);

  function openAssignmentPopover(dealId, anchorEl) {
    setAssignmentDealId(dealId);
    setAssignmentAnchorEl(anchorEl);
  }

  function closeAssignmentPopover() {
    setAssignmentAnchorEl(null);
    setAssignmentDealId(null);
    onAssignmentPopoverClose?.();
  }

  useEffect(() => {
    if (!assignmentPopoverDealId) {
      setAssignmentAnchorEl(null);
      setAssignmentDealId(null);
      return;
    }

    const el = assignedCellRefs.current[assignmentPopoverDealId];
    if (el) {
      openAssignmentPopover(assignmentPopoverDealId, el);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentPopoverDealId, assignmentPopoverNonce]);

  function requestSort(key) {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
    });
  }

  function isFilterActive(key) {
    if (key === "propertyText") return filters.propertyText.trim().length > 0;
    if (key === "borrowerText") return filters.borrowerText.trim().length > 0 || filters.repeatBorrowersOnly;
    if (key === "amount") return Boolean(filters.amountMin) || Boolean(filters.amountMax);
    if (key === "exception") return filters.exceptionRatings.length > 0;
    if (key === "requiredLevel") return filters.requiredLevels.length > 0;
    if (key === "stage") return filters.stages.length > 0;
    if (key === "assignedReviewer") return filters.assignedReviewerFilter !== "any";
    if (key === "submittedAt") return Boolean(filters.submittedMin) || Boolean(filters.submittedMax);
    return false;
  }

  function clearFilter(key) {
    setFilters((prev) => {
      const next = { ...prev };
      if (key === "propertyText") next.propertyText = "";
      else if (key === "borrowerText") {
        next.borrowerText = "";
        next.repeatBorrowersOnly = false;
      }
      else if (key === "amount") {
        next.amountMin = "";
        next.amountMax = "";
      } else if (key === "exception") next.exceptionRatings = [];
      else if (key === "requiredLevel") next.requiredLevels = [];
      else if (key === "stage") next.stages = [];
      else if (key === "assignedReviewer") next.assignedReviewerFilter = "any";
      else if (key === "submittedAt") {
        next.submittedMin = "";
        next.submittedMax = "";
      }
      return next;
    });
  }

  const filteredSortedDeals = useMemo(() => {
    const parsedAmountMin = filters.amountMin === "" ? null : Number(filters.amountMin);
    const parsedAmountMax = filters.amountMax === "" ? null : Number(filters.amountMax);
    const parsedSubmittedMin = filters.submittedMin ? new Date(filters.submittedMin).getTime() : null;
    const parsedSubmittedMax = filters.submittedMax ? new Date(filters.submittedMax).getTime() : null;

    const filtered = dealMeta.filter(({ deal, requiredLevel }) => {
      if (filters.propertyText.trim()) {
        const q = filters.propertyText.trim().toLowerCase();
        if (!toLower(deal.propertyName ?? deal.borrowerName).includes(q)) return false;
      }

      if (filters.borrowerText.trim()) {
        const q = filters.borrowerText.trim().toLowerCase();
        if (!toLower(deal.borrowerName).includes(q)) return false;
      }
      if (filters.repeatBorrowersOnly && !deal.repeatBorrower) return false;

      const exc = Number(deal.exceptionRating ?? 0);

      if (parsedAmountMin != null && Number(deal.amount ?? 0) < parsedAmountMin) return false;
      if (parsedAmountMax != null && Number(deal.amount ?? 0) > parsedAmountMax) return false;

      if (filters.exceptionRatings.length > 0 && !filters.exceptionRatings.includes(exc)) return false;
      if (filters.requiredLevels.length > 0 && !filters.requiredLevels.includes(requiredLevel)) return false;
      if (filters.stages.length > 0 && !filters.stages.includes(deal.stage ?? "—")) return false;

      if (filters.assignedReviewerFilter === "assignedToMe") {
        if (deal.assignedReviewerId !== currentUser.id) return false;
      } else if (filters.assignedReviewerFilter === "team") {
        if (!teamReviewerIdSet.has(deal.assignedReviewerId)) return false;
      } else if (filters.assignedReviewerFilter !== "any") {
        if (deal.assignedReviewerId !== filters.assignedReviewerFilter) return false;
      }

      if (parsedSubmittedMin != null) {
        const t = new Date(deal.submittedAt ?? 0).getTime();
        if (t < parsedSubmittedMin) return false;
      }
      if (parsedSubmittedMax != null) {
        const t = new Date(deal.submittedAt ?? 0).getTime();
        if (t > parsedSubmittedMax) return false;
      }

      if (filters.highRiskShortcut) {
        const highRiskRequired = requiredLevel === "VP" || requiredLevel === "President";
        if (!(exc >= 4 || highRiskRequired)) return false;
      }

      if (filters.dueSoonShortcut) {
        const dueTs = new Date(deal.dueDate ?? 0).getTime();
        if (!Number.isFinite(dueTs) || dueTs <= 0) return false;
        const anchorTs = PROTOTYPE_TODAY_TS;
        const upperTs = anchorTs + 3 * 24 * 60 * 60 * 1000;
        if (dueTs < anchorTs || dueTs > upperTs) return false;
      }

      if (filters.oooImpactedShortcut) {
        if (!oooReviewerIdSet.has(deal.assignedReviewerId)) return false;
      }

      return true;
    });

    const dir = sort.dir === "asc" ? 1 : -1;

    filtered.sort((a, b) => {
      const da = a.deal;
      const db = b.deal;
      if (sort.key === "property") return dir * String(da.propertyName ?? da.borrowerName).localeCompare(String(db.propertyName ?? db.borrowerName));
      if (sort.key === "borrower") return dir * String(da.borrowerName ?? "").localeCompare(String(db.borrowerName ?? ""));
      if (sort.key === "loanNumber") return dir * ((Number(da.loanNumber ?? 0) || 0) - (Number(db.loanNumber ?? 0) || 0));
      if (sort.key === "producer") return dir * String(da.producer ?? "").localeCompare(String(db.producer ?? ""));
      if (sort.key === "underwriter") return dir * String(da.underwriter ?? "").localeCompare(String(db.underwriter ?? ""));
      if (sort.key === "region") return dir * String(da.region ?? "").localeCompare(String(db.region ?? ""));
      if (sort.key === "amount") return dir * ((Number(da.amount ?? 0) || 0) - (Number(db.amount ?? 0) || 0));
      if (sort.key === "exception") return dir * (Number(da.exceptionRating ?? 0) - Number(db.exceptionRating ?? 0));
      if (sort.key === "requiredLevel") return dir * (requiredSortRank(a.requiredLevel) - requiredSortRank(b.requiredLevel));
      if (sort.key === "stage") return dir * String(da.stage ?? "—").localeCompare(String(db.stage ?? "—"));
      if (sort.key === "assignedReviewer") {
        const nameA = da.assignedReviewerId ? reviewerById[da.assignedReviewerId]?.name ?? "" : "";
        const nameB = db.assignedReviewerId ? reviewerById[db.assignedReviewerId]?.name ?? "" : "";
        return dir * nameA.localeCompare(nameB);
      }
      // Default date sorts by submittedAt (new fallback)
      const tA = new Date(da.submittedAt ?? 0).getTime();
      const tB = new Date(db.submittedAt ?? 0).getTime();
      if (sort.key === "dueDate") {
        const dA = new Date(da.dueDate ?? 0).getTime();
        const dB = new Date(db.dueDate ?? 0).getTime();
        return dir * (dA - dB);
      }
      return dir * (tA - tB);
    });

    return filtered;
  }, [dealMeta, filters, currentUser.id, reviewerById, sort.dir, sort.key, oooReviewerIdSet]);

  const filteredDealIds = useMemo(
    () => filteredSortedDeals.map(({ deal }) => deal.id),
    [filteredSortedDeals]
  );

  const pagedDeals = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredSortedDeals.slice(start, end);
  }, [filteredSortedDeals, page, rowsPerPage]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredSortedDeals.length / rowsPerPage) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [filteredSortedDeals.length, rowsPerPage, page]);

  useEffect(() => {
    setSelectedOOODealIds((prev) => prev.filter((id) => filteredDealIds.includes(id)));
  }, [filteredDealIds]);

  function openFilterPopover(key, event) {
    setPopover({ key, anchorEl: event.currentTarget });
  }

  function quickChipApply(next) {
    // Reset all column filters and apply the shortcut as a single coherent preset.
    if (next === "all") {
      setFilters({
        propertyText: "",
        borrowerText: "",
        repeatBorrowersOnly: false,
        amountMin: "",
        amountMax: "",
        exceptionRatings: [],
        requiredLevels: [],
        stages: [],
        assignedReviewerFilter: "any",
        submittedMin: "",
        submittedMax: "",
        highRiskShortcut: false,
        dueSoonShortcut: false,
        oooImpactedShortcut: false,
      });
      return;
    }

    if (next === "assignedToMe") {
      setFilters({
        propertyText: "",
        borrowerText: "",
        repeatBorrowersOnly: false,
        amountMin: "",
        amountMax: "",
        exceptionRatings: [],
        requiredLevels: [],
        stages: [],
        assignedReviewerFilter: "assignedToMe",
        submittedMin: "",
        submittedMax: "",
        highRiskShortcut: false,
        dueSoonShortcut: false,
        oooImpactedShortcut: false,
      });
      return;
    }

    if (next === "teamDeals") {
      setFilters({
        propertyText: "",
        borrowerText: "",
        repeatBorrowersOnly: false,
        amountMin: "",
        amountMax: "",
        exceptionRatings: [],
        requiredLevels: [],
        stages: [],
        assignedReviewerFilter: "team",
        submittedMin: "",
        submittedMax: "",
        highRiskShortcut: false,
        dueSoonShortcut: false,
        oooImpactedShortcut: false,
      });
      return;
    }

    if (next === "highRisk") {
      setFilters({
        propertyText: "",
        borrowerText: "",
        repeatBorrowersOnly: false,
        amountMin: "",
        amountMax: "",
        exceptionRatings: [],
        requiredLevels: [],
        stages: [],
        assignedReviewerFilter: "any",
        submittedMin: "",
        submittedMax: "",
        highRiskShortcut: true,
        dueSoonShortcut: false,
        oooImpactedShortcut: false,
      });
      return;
    }

    if (next === "readyForReview") {
      setFilters({
        propertyText: "",
        borrowerText: "",
        repeatBorrowersOnly: false,
        amountMin: "",
        amountMax: "",
        exceptionRatings: [],
        requiredLevels: [],
        stages: [DEAL_STAGE.SUBMITTED],
        assignedReviewerFilter: "any",
        submittedMin: "",
        submittedMax: "",
        highRiskShortcut: false,
        dueSoonShortcut: false,
        oooImpactedShortcut: false,
      });
      return;
    }

    if (next === "dueSoon") {
      setFilters({
        propertyText: "",
        borrowerText: "",
        repeatBorrowersOnly: false,
        amountMin: "",
        amountMax: "",
        exceptionRatings: [],
        requiredLevels: [],
        stages: [],
        assignedReviewerFilter: "any",
        submittedMin: "",
        submittedMax: "",
        highRiskShortcut: false,
        dueSoonShortcut: true,
        oooImpactedShortcut: false,
      });
      return;
    }

    if (next === "oooImpacted") {
      setFilters({
        propertyText: "",
        borrowerText: "",
        repeatBorrowersOnly: false,
        amountMin: "",
        amountMax: "",
        exceptionRatings: [],
        requiredLevels: [],
        stages: [],
        assignedReviewerFilter: "any",
        submittedMin: "",
        submittedMax: "",
        highRiskShortcut: false,
        dueSoonShortcut: false,
        oooImpactedShortcut: true,
      });
      return;
    }
  }

  useEffect(() => {
    if (!quickFilterRequest) return;
    // Only act when App requests the filter change (nonce-based).
    quickChipApply(quickFilterRequest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickFilterNonce]);

  return (
    <Paper
      variant="outlined"
      sx={{
        overflow: "hidden",
        borderColor: (theme) => alpha(theme.palette.primary.main, 0.18),
        boxShadow: (theme) => `0 1px 6px ${alpha(theme.palette.primary.main, 0.08)}`,
      }}
    >
      {/* Optional quick chips */}
      <Stack direction="row" spacing={1} sx={{ p: 1.25, pb: 0.5 }} alignItems="center" flexWrap="wrap">
        <Chip
          label="Assigned to me"
          clickable
          onClick={() => quickChipApply("assignedToMe")}
          color="primary"
          variant={filters.assignedReviewerFilter === "assignedToMe" ? "filled" : "outlined"}
        />
        {teamReviewerIds.length > 0 ? (
          <Chip
            label="Team deals"
            clickable
            onClick={() => quickChipApply("teamDeals")}
            color="primary"
            variant={filters.assignedReviewerFilter === "team" ? "filled" : "outlined"}
          />
        ) : null}
        <Chip
          label="High risk"
          clickable
          onClick={() => quickChipApply("highRisk")}
          color="error"
          variant={filters.highRiskShortcut ? "filled" : "outlined"}
        />
        <Chip
          label="Ready for Review"
          clickable
          onClick={() => quickChipApply("readyForReview")}
          color="success"
          variant={filters.stages.length === 1 && filters.stages[0] === DEAL_STAGE.SUBMITTED ? "filled" : "outlined"}
        />
        <Chip
          label="Due Soon"
          clickable
          onClick={() => quickChipApply("dueSoon")}
          color="warning"
          variant={filters.dueSoonShortcut ? "filled" : "outlined"}
        />

        <Box sx={{ flex: 1 }} />
        <Typography variant="body2" color="text.secondary">
          {filteredSortedDeals.length} deal{filteredSortedDeals.length === 1 ? "" : "s"}
        </Typography>
        <Button
          size="small"
          onClick={() =>
            setFilters({
              propertyText: "",
              borrowerText: "",
              repeatBorrowersOnly: false,
              amountMin: "",
              amountMax: "",
              exceptionRatings: [],
              requiredLevels: [],
              stages: [],
              assignedReviewerFilter: "any",
              submittedMin: "",
              submittedMax: "",
              highRiskShortcut: false,
              dueSoonShortcut: false,
              oooImpactedShortcut: false,
            })
          }
        >
          Reset filters
        </Button>
        {oooWorkflowActive ? (
          <>
            <Button
              size="small"
              variant="contained"
              color="warning"
              disabled={selectedOOODealIds.length === 0}
              onClick={() => {
                onReassignSelectedOOODeals?.(selectedOOODealIds);
                setSelectedOOODealIds([]);
              }}
            >
              Reassign selected deals
            </Button>
            <Button
              size="small"
              onClick={() => {
                setSelectedOOODealIds([]);
                onCancelOOOWorkflow?.();
              }}
            >
              Cancel
            </Button>
          </>
        ) : null}
      </Stack>

      <TableContainer sx={{ maxHeight: 560, overflow: "auto" }}>
        <Table
          size="small"
          stickyHeader
          aria-label="pipeline deals table"
          sx={{
            "& .MuiTableCell-head": {
              backgroundColor: (theme) => (theme.palette.mode === "light" ? "#f1f5fa" : theme.palette.grey[900]),
              backgroundImage: "none",
            },
          }}
        >
          <TableHead>
            <TableRow>
              {oooWorkflowActive ? <TableCell padding="checkbox" sx={{ minWidth: 40 }} /> : null}
              <TableCell
                sx={{
                  minWidth: 300,
                  position: "sticky",
                  left: 0,
                  zIndex: 4,
                  backgroundColor: (theme) => (theme.palette.mode === "light" ? "#f1f5fa" : theme.palette.grey[900]),
                  backgroundImage: "none",
                  boxShadow: (theme) => `2px 0 0 ${theme.palette.divider}`,
                }}
              >
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <TableSortLabel
                    active={sort.key === "property"}
                    direction={sort.dir}
                    onClick={() => requestSort("property")}
                  >
                    Property
                  </TableSortLabel>
                  <IconButton
                    size="small"
                    onClick={(e) => openFilterPopover("propertyText", e)}
                    color={isFilterActive("propertyText") ? "primary" : "default"}
                  >
                    <FilterGlyph active={isFilterActive("propertyText")} />
                  </IconButton>
                </Stack>
              </TableCell>

              <TableCell align="right" sx={{ minWidth: 140 }}>
                <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                  <TableSortLabel active={sort.key === "amount"} direction={sort.dir} onClick={() => requestSort("amount")}>
                    Loan Amount
                  </TableSortLabel>
                  <IconButton size="small" onClick={(e) => openFilterPopover("amount", e)} color={isFilterActive("amount") ? "primary" : "default"}>
                    <FilterGlyph active={isFilterActive("amount")} />
                  </IconButton>
                </Stack>
              </TableCell>

              <TableCell sx={{ minWidth: 150 }}>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <TableSortLabel active={sort.key === "exception"} direction={sort.dir} onClick={() => requestSort("exception")}>
                    Policy Exception
                  </TableSortLabel>
                  <IconButton
                    size="small"
                    onClick={(e) => openFilterPopover("exception", e)}
                    color={isFilterActive("exception") ? "primary" : "default"}
                  >
                    <FilterGlyph active={isFilterActive("exception")} />
                  </IconButton>
                </Stack>
              </TableCell>

              <TableCell sx={{ minWidth: 170 }}>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <TableSortLabel
                    active={sort.key === "requiredLevel"}
                    direction={sort.dir}
                    onClick={() => requestSort("requiredLevel")}
                  >
                    Required Reviewer
                  </TableSortLabel>
                  <IconButton
                    size="small"
                    onClick={(e) => openFilterPopover("requiredLevel", e)}
                    color={isFilterActive("requiredLevel") ? "primary" : "default"}
                  >
                    <FilterGlyph active={isFilterActive("requiredLevel")} />
                  </IconButton>
                </Stack>
              </TableCell>

              <TableCell sx={{ minWidth: 190 }}>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <TableSortLabel
                    active={sort.key === "assignedReviewer"}
                    direction={sort.dir}
                    onClick={() => requestSort("assignedReviewer")}
                  >
                    Assigned Reviewer
                  </TableSortLabel>
                  <IconButton
                    size="small"
                    onClick={(e) => openFilterPopover("assignedReviewer", e)}
                    color={isFilterActive("assignedReviewer") ? "primary" : "default"}
                  >
                    <FilterGlyph active={isFilterActive("assignedReviewer")} />
                  </IconButton>
                </Stack>
              </TableCell>

              <TableCell sx={{ minWidth: 150 }}>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <TableSortLabel active={sort.key === "dueDate"} direction={sort.dir} onClick={() => requestSort("dueDate")}>
                    Approval Due Date
                  </TableSortLabel>
                </Stack>
              </TableCell>

              <TableCell sx={{ minWidth: 220 }}>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <TableSortLabel active={sort.key === "borrower"} direction={sort.dir} onClick={() => requestSort("borrower")}>
                    Borrower
                  </TableSortLabel>
                  <IconButton
                    size="small"
                    onClick={(e) => openFilterPopover("borrowerText", e)}
                    color={isFilterActive("borrowerText") ? "primary" : "default"}
                  >
                    <FilterGlyph active={isFilterActive("borrowerText")} />
                  </IconButton>
                </Stack>
              </TableCell>

              <TableCell sx={{ minWidth: 140 }}>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <TableSortLabel active={sort.key === "loanNumber"} direction={sort.dir} onClick={() => requestSort("loanNumber")}>
                    Loan #
                  </TableSortLabel>
                </Stack>
              </TableCell>

              <TableCell sx={{ minWidth: 200 }}>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <TableSortLabel active={sort.key === "producer"} direction={sort.dir} onClick={() => requestSort("producer")}>
                    Producer
                  </TableSortLabel>
                </Stack>
              </TableCell>

              <TableCell sx={{ minWidth: 200 }}>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <TableSortLabel
                    active={sort.key === "underwriter"}
                    direction={sort.dir}
                    onClick={() => requestSort("underwriter")}
                  >
                    Underwriter
                  </TableSortLabel>
                </Stack>
              </TableCell>

              <TableCell sx={{ minWidth: 140 }}>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <TableSortLabel active={sort.key === "region"} direction={sort.dir} onClick={() => requestSort("region")}>
                    Region
                  </TableSortLabel>
                </Stack>
              </TableCell>

              <TableCell sx={{ minWidth: 150 }}>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <TableSortLabel active={sort.key === "stage"} direction={sort.dir} onClick={() => requestSort("stage")}>
                    Stage
                  </TableSortLabel>
                  <IconButton size="small" onClick={(e) => openFilterPopover("stage", e)} color={isFilterActive("stage") ? "primary" : "default"}>
                    <FilterGlyph active={isFilterActive("stage")} />
                  </IconButton>
                </Stack>
              </TableCell>

            </TableRow>
          </TableHead>

          <TableBody>
            {pagedDeals.map(({ deal, requiredLevel, explanation }) => {
              const isMine = Boolean(deal.assignedReviewerId && deal.assignedReviewerId === currentUser.id);
              const isNewAssignment = Boolean(deal.isNewAssignment);
              const exc = Number(deal.exceptionRating ?? 0);
              const isHighRisk = exc >= 4 || requiredLevel === "VP" || requiredLevel === "President";
              const daysToDue = getDaysToDue(deal.dueDate);
              const slaBucket = getSlaBucket(daysToDue);
              const isOverdue = slaBucket === "Overdue";
              const selected = deal.id === selectedDealId;
              const assignee = deal.assignedReviewerId ? reviewerById[deal.assignedReviewerId] : null;

              const exceptionProps = getExceptionChipProps(deal.exceptionRating);

              return (
                <TableRow
                  key={deal.id}
                  hover
                  selected={selected}
                  onClick={() => onSelectDeal?.(deal.id)}
                  sx={{
                    cursor: "pointer",
                    bgcolor: isOverdue
                      ? (theme) => alpha(theme.palette.error.main, 0.08)
                      : isMine
                        ? "rgba(25, 118, 210, 0.08)"
                        : undefined,
                    outline: selected ? "2px solid" : undefined,
                    outlineColor: selected ? "primary.main" : undefined,
                    outlineOffset: selected ? "-2px" : undefined,
                    borderLeft: isHighRisk ? "6px solid" : isNewAssignment ? "4px solid" : undefined,
                    borderLeftColor: isHighRisk ? "error.main" : isNewAssignment ? "primary.main" : undefined,
                  }}
                >
                  {oooWorkflowActive ? (
                    <TableCell
                      padding="checkbox"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        size="small"
                        checked={selectedOOODealIds.includes(deal.id)}
                        disabled={!oooReviewerIdSet.has(deal.assignedReviewerId)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSelectedOOODealIds((prev) =>
                            checked ? [...prev, deal.id] : prev.filter((id) => id !== deal.id)
                          );
                        }}
                      />
                    </TableCell>
                  ) : null}
                  <TableCell
                    sx={{
                      position: "sticky",
                      left: 0,
                      zIndex: 2,
                      bgcolor: (theme) =>
                        selected
                          ? theme.palette.mode === "light"
                            ? theme.palette.grey[100]
                            : theme.palette.grey[900]
                          : theme.palette.background.paper,
                      boxShadow: (theme) => `2px 0 0 ${theme.palette.divider}`,
                    }}
                  >
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography variant="body2" sx={{ fontWeight: 850, lineHeight: 1.25 }}>
                          {deal.propertyName ?? deal.borrowerName}
                        </Typography>
                        {isNewAssignment ? (
                          <Chip label="NEW" size="small" variant="outlined" color="primary" />
                        ) : null}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {formatAddress(deal.propertyAddress)}
                      </Typography>
                    </Box>
                  </TableCell>

                  <TableCell align="right">{formatAmount(deal.amount, deal.currency)}</TableCell>

                  <TableCell>
                    <Tooltip
                      title={deal.exceptionReason ?? "No policy exception."}
                      arrow
                    >
                      <Chip
                        size="small"
                        label={exceptionProps.label}
                        variant={exceptionProps.variant}
                        color={exceptionProps.color}
                      />
                    </Tooltip>
                  </TableCell>

                  <TableCell>
                    <Tooltip title={explanation} arrow>
                      <Chip size="small" label={requiredLevel} variant="outlined" color="primary" />
                    </Tooltip>
                  </TableCell>

                  <TableCell>
                    <Box
                      ref={(el) => {
                        assignedCellRefs.current[deal.id] = el;
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!deal.assignedReviewerId) return;
                        openAssignmentPopover(deal.id, e.currentTarget);
                      }}
                      sx={{ cursor: deal.assignedReviewerId ? "pointer" : "default" }}
                    >
                      {assignee ? (
                        <Box>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.25 }}>
                              {assignee.name}
                            </Typography>
                            <Tooltip title={formatCapacityTooltip(assignee)} arrow>
                              <FiberManualRecordIcon
                                sx={{
                                  fontSize: 10,
                                  color: getCapacityColor(assignee),
                                }}
                              />
                            </Tooltip>
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {assignee.level}
                          </Typography>
                          {deal.hasBorrowerFamiliarityAssignment ? (
                            <Tooltip
                              title="Assigned for repeat borrower continuity: reviewer has prior borrower familiarity."
                              arrow
                            >
                              <HandshakeOutlinedIcon
                                sx={{ fontSize: 14, color: "info.main", verticalAlign: "middle", ml: 0.5 }}
                              />
                            </Tooltip>
                          ) : null}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Stack spacing={0.35}>
                      <Typography variant="body2">{formatDate(deal.dueDate)}</Typography>
                      {slaBucket ? (
                        <Tooltip
                          title={daysToDue < 0 ? `${Math.abs(daysToDue)}d overdue` : `${daysToDue}d to due`}
                          arrow
                        >
                          <Chip
                            size="small"
                            label={slaBucket}
                            variant={getSlaChipProps(slaBucket).variant}
                            color={getSlaChipProps(slaBucket).color}
                          />
                        </Tooltip>
                      ) : null}
                    </Stack>
                  </TableCell>

                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.25 }}>
                        {deal.borrowerName}
                      </Typography>
                      {deal.repeatBorrower ? (
                        <Tooltip title="Repeat Borrower" arrow>
                          <AutorenewRoundedIcon
                            sx={{ fontSize: 16, color: "info.main", verticalAlign: "middle" }}
                          />
                        </Tooltip>
                      ) : null}
                    </Stack>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {String(deal.loanNumber ?? "").padStart(7, "0")}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.25 }}>
                      {deal.producer ?? "—"}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.25 }}>
                      {deal.underwriter ?? "—"}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {deal.region ?? "—"}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Chip size="small" label={deal.stage ?? "—"} variant="outlined" />
                      {deal.stage === DEAL_STAGE.SUBMITTED ? (
                        <Tooltip title={`Submitted on ${formatDate(deal.submittedAt)}`} arrow>
                          <CalendarMonthOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                        </Tooltip>
                      ) : null}
                    </Stack>
                  </TableCell>

                </TableRow>
              );
            })}

            {filteredSortedDeals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={oooWorkflowActive ? 14 : 13}>
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                    No deals match the current filters.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={filteredSortedDeals.length}
        page={page}
        onPageChange={(event, newPage) => {
          void event;
          setPage(newPage);
        }}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => {
          const next = Number(event.target.value);
          setRowsPerPage(next);
          setPage(0);
        }}
        rowsPerPageOptions={[15, 25, 50]}
      />

      {/* Deal assignment popover */}
      <Popover
        open={assignmentOpen}
        anchorEl={assignmentAnchorEl}
        onClose={closeAssignmentPopover}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{ sx: { p: 2, width: 420, maxWidth: "90vw" } }}
      >
        {assignmentDeal ? (
          (() => {
            const effectiveReviewersForPopover = reviewers.map((r) =>
              r.id === currentUser.id
                ? { ...r, currentLoad: currentUser.currentLoad, maxCapacity: currentUser.maxCapacity, outOfOffice: currentUser.outOfOffice }
                : { ...r, outOfOffice: r.outOfOffice ?? false }
            );

            const assignedId = assignmentDeal.assignedReviewerId ?? null;
            const assignedObj = assignedId ? reviewerById[assignedId] : null;
            const canReassign = canDirectorReassignAssignedDeal({
              deal: assignmentDeal,
              currentUser,
              reviewers: effectiveReviewersForPopover,
            });

            if (!assignedId) {
              return (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Assigned reviewer
                  </Typography>
                  <Alert severity="info" variant="outlined">
                    Reviewer assignment is available only when a deal reaches the Submitted stage.
                  </Alert>
                </Box>
              );
            }

            // Assigned deals
            if (!canReassign) {
              return (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Assigned reviewer
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Assigned to{" "}
                    <strong>{assignedObj?.name ?? assignmentDeal.assignedReviewerId ?? "Unknown"}</strong>.
                  </Typography>
                  <Alert severity="info" variant="outlined">
                    You don’t have permission to reassign this deal.
                  </Alert>
                </Box>
              );
            }

            const candidates = getReassignmentCandidates(assignmentDeal, effectiveReviewersForPopover, currentUser).filter(
              (c) => c?.reviewer?.id !== assignedId
            );

            return (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Reassign deal
                </Typography>
                <Alert severity="info" variant="outlined">
                  As a Director, you can rebalance deals across your team.
                </Alert>
                <Typography variant="body2" color="text.secondary">
                  Current assignee:{" "}
                  <strong>{assignedObj?.name ?? assignmentDeal.assignedReviewerId ?? "Unknown"}</strong>.
                </Typography>
                <ReviewerReassignmentCandidates
                  candidates={candidates}
                  currentAssigneeId={assignedId}
                  onAssign={(toId) => {
                    onAssignDeal?.(assignmentDeal.id, toId);
                    closeAssignmentPopover();
                  }}
                />
              </Box>
            );
          })()
        ) : (
          <Typography variant="body2" color="text.secondary">
            Select a deal row to assign.
          </Typography>
        )}
      </Popover>

      {/* Column filter popover */}
      <Popover
        open={filterAnchorOpen}
        anchorEl={popover.anchorEl}
        onClose={closePopover}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{ sx: { p: 2, width: 360, maxWidth: "90vw" } }}
      >
        {popover.key === "propertyText" ? (
          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Property contains
            </Typography>
            <TextField
              value={filters.propertyText}
              onChange={(e) => setFilters((p) => ({ ...p, propertyText: e.target.value }))}
              placeholder="e.g., Acme"
              size="small"
              fullWidth
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ pt: 1 }}>
              <Button size="small" onClick={() => clearFilter("propertyText")}>
                Clear
              </Button>
              <Button size="small" variant="contained" onClick={closePopover}>
                Done
              </Button>
            </Stack>
          </Stack>
        ) : popover.key === "borrowerText" ? (
          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Borrower contains
            </Typography>
            <TextField
              value={filters.borrowerText}
              onChange={(e) => setFilters((p) => ({ ...p, borrowerText: e.target.value }))}
              placeholder="e.g., Logistics"
              size="small"
              fullWidth
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={filters.repeatBorrowersOnly}
                  onChange={(e) => setFilters((p) => ({ ...p, repeatBorrowersOnly: e.target.checked }))}
                />
              }
              label="Repeat borrowers only"
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ pt: 1 }}>
              <Button size="small" onClick={() => clearFilter("borrowerText")}>
                Clear
              </Button>
              <Button size="small" variant="contained" onClick={closePopover}>
                Done
              </Button>
            </Stack>
          </Stack>
        ) : popover.key === "amount" ? (
          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Loan amount (min/max)
            </Typography>
            <TextField
              label="Min"
              value={filters.amountMin}
              onChange={(e) => setFilters((p) => ({ ...p, amountMin: e.target.value }))}
              size="small"
              type="number"
              fullWidth
            />
            <TextField
              label="Max"
              value={filters.amountMax}
              onChange={(e) => setFilters((p) => ({ ...p, amountMax: e.target.value }))}
              size="small"
              type="number"
              fullWidth
            />
            <Divider />
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip
                size="small"
                label="&lt; 20MM"
                clickable
                onClick={() =>
                  setFilters((p) => ({
                    ...p,
                    amountMin: "",
                    amountMax: "20000000",
                  }))
                }
                variant="outlined"
              />
              <Chip
                size="small"
                label="20–<50MM"
                clickable
                onClick={() =>
                  setFilters((p) => ({
                    ...p,
                    amountMin: "20000000",
                    amountMax: "49999999",
                  }))
                }
                variant="outlined"
              />
              <Chip
                size="small"
                label="50MM+"
                clickable
                onClick={() =>
                  setFilters((p) => ({
                    ...p,
                    amountMin: "50000000",
                    amountMax: "",
                  }))
                }
                variant="outlined"
              />
            </Stack>
            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ pt: 1 }}>
              <Button size="small" onClick={() => clearFilter("amount")}>
                Clear
              </Button>
              <Button size="small" variant="contained" onClick={closePopover}>
                Done
              </Button>
            </Stack>
          </Stack>
        ) : popover.key === "exception" ? (
          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Exception rating (0–5)
            </Typography>
            <FormControl size="small" fullWidth>
              <Select
                multiple
                value={filters.exceptionRatings}
                onChange={(e) =>
                  setFilters((p) => ({
                    ...p,
                    exceptionRatings: Array.isArray(e.target.value) ? e.target.value.map(Number) : [],
                  }))
                }
                renderValue={(selected) =>
                  selected.length ? `Exceptions: ${selected.join(", ")}` : "All"
                }
              >
                {EXCEPTION_OPTIONS.map((v) => (
                  <MenuItem key={v} value={v}>
                    <Checkbox checked={filters.exceptionRatings.indexOf(v) !== -1} />
                    <ListItemText primary={v} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ pt: 1 }}>
              <Button size="small" onClick={() => clearFilter("exception")}>
                Clear
              </Button>
              <Button size="small" variant="contained" onClick={closePopover}>
                Done
              </Button>
            </Stack>
          </Stack>
        ) : popover.key === "requiredLevel" ? (
          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Required reviewer level
            </Typography>
            <FormControl size="small" fullWidth>
              <Select
                multiple
                value={filters.requiredLevels}
                onChange={(e) => setFilters((p) => ({ ...p, requiredLevels: e.target.value }))}
                renderValue={(selected) => (selected.length ? selected.join(", ") : "All")}
              >
                {REQUIRED_LEVELS.map((v) => (
                  <MenuItem key={v} value={v}>
                    <Checkbox checked={filters.requiredLevels.indexOf(v) !== -1} />
                    <ListItemText primary={v} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ pt: 1 }}>
              <Button size="small" onClick={() => clearFilter("requiredLevel")}>
                Clear
              </Button>
              <Button size="small" variant="contained" onClick={closePopover}>
                Done
              </Button>
            </Stack>
          </Stack>
        ) : popover.key === "stage" ? (
          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Stage
            </Typography>
            <FormControl size="small" fullWidth>
              <Select
                multiple
                value={filters.stages}
                onChange={(e) => setFilters((p) => ({ ...p, stages: e.target.value }))}
                renderValue={(selected) => (selected.length ? selected.join(", ") : "All")}
              >
                {stageOptions.map((v) => (
                  <MenuItem key={v} value={v}>
                    <Checkbox checked={filters.stages.indexOf(v) !== -1} />
                    <ListItemText primary={v} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ pt: 1 }}>
              <Button size="small" onClick={() => clearFilter("stage")}>
                Clear
              </Button>
              <Button size="small" variant="contained" onClick={closePopover}>
                Done
              </Button>
            </Stack>
          </Stack>
        ) : popover.key === "assignedReviewer" ? (
          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Assigned reviewer
            </Typography>
            <FormControl size="small" fullWidth>
              <Select
                value={filters.assignedReviewerFilter}
                onChange={(e) => setFilters((p) => ({ ...p, assignedReviewerFilter: e.target.value }))}
              >
                <MenuItem value="any">Any</MenuItem>
                <MenuItem value="assignedToMe">Assigned to me</MenuItem>
                  {teamReviewerIds.length > 0 ? <MenuItem value="team">Team deals</MenuItem> : null}
                {reviewers.map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    {r.name} · {r.level}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ pt: 1 }}>
              <Button size="small" onClick={() => clearFilter("assignedReviewer")}>
                Clear
              </Button>
              <Button size="small" variant="contained" onClick={closePopover}>
                Done
              </Button>
            </Stack>
          </Stack>
        ) : popover.key === "submittedAt" ? (
          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Submitted date (min/max)
            </Typography>
            <TextField
              label="From"
              value={filters.submittedMin}
              onChange={(e) => setFilters((p) => ({ ...p, submittedMin: e.target.value }))}
              size="small"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="To"
              value={filters.submittedMax}
              onChange={(e) => setFilters((p) => ({ ...p, submittedMax: e.target.value }))}
              size="small"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ pt: 1 }}>
              <Button size="small" onClick={() => clearFilter("submittedAt")}>
                Clear
              </Button>
              <Button size="small" variant="contained" onClick={closePopover}>
                Done
              </Button>
            </Stack>
          </Stack>
        ) : null}
      </Popover>
    </Paper>
  );
}


# Matyka Capital Deal Pipeline (Prototype)

Frontend-only React + Vite + MUI prototype for a deal lifecycle and credit review assignment workflow.

This project is designed for demo workflows and product exploration. All data is local mock data (no backend, no auth service, no database).

## What this demo includes

- Login landing page for Sam Rivera (prefilled prototype credentials)
- Full-width pipeline table with filters, sorting, sticky property column, and contextual chips/tooltips
- Role-based workflow from a Director perspective:
  - My new assignments banner
  - Team new assignments banner
  - Out-of-office (OOO) team impact workflow with bulk reassignment
- Assignment and reassignment logic with:
  - reviewer authority levels (Manager / Director / VP / President)
  - deal required reviewer level from amount + policy exception
  - capacity checks and OOO handling
  - region/team visibility rules
- Drawer with deal timeline, workspace CTA, and reassignment trigger
- Account modal with availability controls and static calendar integration preview

## Core demo workflows

1. Director logs in, sees newly assigned team deals, filters to team pipeline, and reassigns based on capacity.
2. Director handles an out-of-office team member:
   - click banner to view impacted deals
   - select deals with checkboxes
   - bulk reassign
   - confirm/update reassignment choices in modal

## Tech stack

- React 19
- Vite 8
- MUI 7 (`@mui/material`, `@mui/icons-material`)

## Local development

```bash
npm install
npm run dev
```

Open the local URL shown by Vite (typically `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

## Deploy (Vercel)

Recommended Vercel settings:

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

No environment variables are required for this prototype.

## Project structure

- `src/App.jsx` - app shell, banners, top-level state orchestration
- `src/components/` - table, drawer, account modal, reassignment UI
- `src/data/` - mock deals, reviewers, current user
- `src/utils/assignmentLogic.js` - authority/capacity/team assignment rules

## Notes

- This is a prototype; all persistence is in-memory/local state.
- Reloading resets state to seeded mock data.

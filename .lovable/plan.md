## Add "Export PDF" button to Coaching Engine

Add a button next to the existing "Copy Plan" in `src/routes/_authenticated/coach.tsx` that downloads the current AI response as a branded PDF.

### Implementation
- Install `jspdf` (client-side, no server roundtrip; works with the existing Resp shape).
- New helper `src/lib/export-pdf.ts` with `exportCoachingPlanPDF(prompt, mode, response)`:
  - Branded header: "Prima Donna AI™ — Strategic Plan", mode label, date.
  - Sections: Your Question, Diagnosis, Impact, Strategic Move, Elevation, Action Steps (numbered).
  - Auto wrap text with `splitTextToSize`, paginate when y exceeds page height.
  - Crimson/rose accent for headings using existing palette hexes.
  - Filename: `prima-donna-plan-{mode}-{YYYY-MM-DD}.pdf`.
- In `coach.tsx`: add `<Button variant="outline" size="sm" onClick={exportPDF}>Export PDF</Button>` next to "Copy Plan", disabled when no `response`.

### Out of scope
- No server function, no storage upload, no history export (only currently displayed plan).
- No design changes beyond the new button.

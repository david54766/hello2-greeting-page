import jsPDF from "jspdf";

type Resp = {
  diagnosis: string;
  impact: string;
  strategic_move: string;
  elevation: string;
  action_steps: string[];
};

const MODE_LABELS: Record<string, string> = {
  ceo: "CEO Mode",
  revenue: "Revenue Mode",
  marketing: "Marketing Mode",
  compliance: "Compliance Mode",
  systems: "Systems Mode",
};

const CRIMSON: [number, number, number] = [159, 18, 57]; // rose-900-ish
const INK: [number, number, number] = [24, 24, 27];
const MUTED: [number, number, number] = [113, 113, 122];

export function exportCoachingPlanPDF(prompt: string, mode: string, response: Resp) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 56;
  const contentW = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Header
  doc.setTextColor(...CRIMSON);
  doc.setFont("times", "italic");
  doc.setFontSize(20);
  doc.text("Prima Donna AI\u2122", margin, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const dateStr = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  doc.text(`Strategic Plan  \u00B7  ${MODE_LABELS[mode] ?? mode}  \u00B7  ${dateStr}`, margin, y);
  y += 14;

  // Divider
  doc.setDrawColor(...CRIMSON);
  doc.setLineWidth(1);
  doc.line(margin, y, margin + contentW, y);
  y += 22;

  const writeSection = (label: string, body: string) => {
    if (!body) return;
    ensureSpace(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...CRIMSON);
    doc.text(label.toUpperCase(), margin, y);
    y += 14;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(body, contentW);
    for (const line of lines) {
      ensureSpace(16);
      doc.text(line, margin, y);
      y += 15;
    }
    y += 10;
  };

  writeSection("Your Question", prompt);
  writeSection("Diagnosis", response.diagnosis);
  writeSection("Impact", response.impact);
  writeSection("Strategic Move", response.strategic_move);
  writeSection("Elevation", response.elevation);

  if (response.action_steps?.length) {
    ensureSpace(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...CRIMSON);
    doc.text("ACTION STEPS", margin, y);
    y += 14;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    response.action_steps.forEach((step, i) => {
      const lines = doc.splitTextToSize(`${i + 1}.  ${step}`, contentW - 16);
      for (const line of lines) {
        ensureSpace(16);
        doc.text(line, margin, y);
        y += 15;
      }
      y += 4;
    });
  }

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Prima Donna AI\u2122  \u00B7  Confidential strategic plan", margin, pageH - 24);
    doc.text(`${i} / ${pageCount}`, pageW - margin, pageH - 24, { align: "right" });
  }

  const iso = new Date().toISOString().slice(0, 10);
  doc.save(`prima-donna-plan-${mode}-${iso}.pdf`);
}

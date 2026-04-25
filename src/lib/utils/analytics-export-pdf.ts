/**
 * Capture an existing DOM element to a multi-page A4 PDF. We keep
 * the implementation deliberately small: render the analytics page
 * itself (any element by id) to canvas, then slice that canvas into
 * page-height chunks. Avoids maintaining a separate "PDF layout"
 * component that drifts from the actual UI.
 *
 * jspdf + html2canvas are both ~250kb; both lazy-loaded so they only
 * ship when the operator clicks "Laporan PDF".
 */
export async function exportAnalyticsPDF(
  elementId: string,
  coupleName: string,
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element #${elementId} tidak ditemukan.`);
  }

  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  // Force the dark background colour explicitly — html2canvas otherwise
  // picks up `transparent` and the export looks washed out on print.
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#06060B",
    logging: false,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Compute how many CSS pixels of the source canvas correspond to one
  // A4 page's worth of vertical space at our chosen ratio.
  const ratio = pageWidth / canvas.width;
  const sliceHeightPx = pageHeight / ratio;

  let y = 0;
  let pageNo = 0;
  while (y < canvas.height) {
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = Math.min(sliceHeightPx, canvas.height - y);
    const ctx = sliceCanvas.getContext("2d");
    if (!ctx) break;
    // Fill background so any padding at the bottom of the last page
    // matches the dashboard chrome rather than turning white.
    ctx.fillStyle = "#06060B";
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(
      canvas,
      0,
      y,
      canvas.width,
      sliceCanvas.height,
      0,
      0,
      sliceCanvas.width,
      sliceCanvas.height,
    );

    if (pageNo > 0) pdf.addPage();
    pdf.addImage(
      sliceCanvas.toDataURL("image/jpeg", 0.92),
      "JPEG",
      0,
      0,
      pageWidth,
      sliceCanvas.height * ratio,
    );

    y += sliceHeightPx;
    pageNo++;
  }

  pdf.save(fileName(coupleName, "pdf"));
}

function fileName(coupleName: string, ext: string): string {
  const safe = coupleName
    .replace(/[^\p{L}\p{N}\s&]/gu, "")
    .trim()
    .replace(/\s+/g, "_");
  return `Laporan_UWU_${safe || "Acara"}.${ext}`;
}

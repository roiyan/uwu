/**
 * Render the off-screen InfographicTemplate (1200×1500) to PNG and
 * trigger a download. The template element must already be mounted
 * — we don't create it here so the styling is fully controlled by
 * the React tree.
 *
 * html2canvas is dynamically imported (~250kb) so it only ships when
 * the operator clicks "Infografis PNG".
 */
export async function exportAnalyticsInfographic(
  elementId: string,
  coupleName: string,
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element #${elementId} tidak ditemukan.`);
  }
  const html2canvas = (await import("html2canvas")).default;
  const { buildOnClone } = await import("./html2canvas-onclone");

  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }
  // Allow one paint frame so newly-mounted templates settle into their
  // computed styles before we walk them.
  await new Promise((r) => requestAnimationFrame(() => r(null)));

  const canvas = await html2canvas(element, {
    // 1200×1500 at 2× scale = 2400×3000 source PNG, sharp enough for
    // sharing on Instagram Story or as a wallpaper-like keepsake.
    // We let height auto-size from the element so a long template
    // (e.g. expanded guest table) doesn't get cropped.
    scale: 2,
    useCORS: true,
    backgroundColor: "#06060B",
    width: 1200,
    height: element.scrollHeight,
    windowWidth: 1200,
    windowHeight: Math.max(1500, element.scrollHeight),
    logging: false,
    onclone: buildOnClone(element),
  });

  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName(coupleName);
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function fileName(coupleName: string): string {
  const safe = coupleName
    .replace(/[^\p{L}\p{N}\s&]/gu, "")
    .trim()
    .replace(/\s+/g, "_");
  return `Infografis_UWU_${safe || "Acara"}.png`;
}

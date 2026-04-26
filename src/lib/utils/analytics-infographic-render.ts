/**
 * Capture the off-screen InfographicTemplate to a PNG data URL.
 * Sibling to `analytics-export-png.ts` which downloads directly — this
 * variant returns the URL so the share modal can preview + offer
 * Download / Web Share / WA fallback in a single flow.
 */
export async function renderInfographicDataUrl(
  elementId: string,
): Promise<string> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element #${elementId} tidak ditemukan.`);
  }
  const html2canvas = (await import("html2canvas")).default;
  const { buildOnClone } = await import("./html2canvas-onclone");

  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }
  await new Promise((r) => requestAnimationFrame(() => r(null)));

  const canvas = await html2canvas(element, {
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

  return canvas.toDataURL("image/png");
}

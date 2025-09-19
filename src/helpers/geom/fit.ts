export function computeFitScale(
  imgW: number,
  imgH: number,
  viewportW: number,
  viewportH: number,
  margin = 50
): number {
  const usableW = Math.max(0, viewportW - margin * 2);
  const usableH = Math.max(0, viewportH - margin * 2);
  if (!imgW || !imgH || !usableW || !usableH) return 1;
  return Math.min(usableW / imgW, usableH / imgH);
}

export function centerOffsets(
  scaledW: number,
  scaledH: number,
  canvasW: number,
  canvasH: number
): { dx: number; dy: number } {
  const dx = Math.floor((canvasW - scaledW) / 2);
  const dy = Math.floor((canvasH - scaledH) / 2);
  return { dx: Math.max(0, dx), dy: Math.max(0, dy) };
}

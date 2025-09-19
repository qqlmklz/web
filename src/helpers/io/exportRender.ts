export async function renderForExport(
  drawAllLayers: (
    ctx: CanvasRenderingContext2D,
    opts?: { scale?: number; panX?: number; panY?: number; showChecker?: boolean }
  ) => void,
  baseWidth: number,
  baseHeight: number
): Promise<ImageData> {
  const off = document.createElement('canvas');
  off.width = baseWidth;
  off.height = baseHeight;
  const ctx = off.getContext('2d', { willReadFrequently: true })!;

  drawAllLayers(ctx, { scale: 1, panX: 0, panY: 0, showChecker: false });
  return ctx.getImageData(0, 0, baseWidth, baseHeight);
}

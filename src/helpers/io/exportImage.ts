import { downloadGB7 } from './exportGB7';
import { downloadJPG, downloadPNG } from './exportRaster';
import { renderForExport } from './exportRender';

type ExportFormat = 'png' | 'jpg' | 'gb7';

export async function exportFlattened(
  format: ExportFormat,
  filenameBase: string,
  baseW: number,
  baseH: number,
  drawAllLayers: (
    ctx: CanvasRenderingContext2D,
    opts?: { scale?: number; panX?: number; panY?: number; showChecker?: boolean }
  ) => void
) {
  const img = await renderForExport(drawAllLayers, baseW, baseH);

  switch (format) {
    case 'png':
      return downloadPNG(img, `${filenameBase}.png`);
    case 'jpg':
      return downloadJPG(img, `${filenameBase}.jpg`, 0.92);
    case 'gb7':
      return downloadGB7(img, `${filenameBase}.gb7`, { alphaOpaqueThreshold: 128 });
  }
}

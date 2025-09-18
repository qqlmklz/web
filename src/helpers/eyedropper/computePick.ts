import type { PickInfo, RGB } from '../../types/Color';
import { gb7ToRgb, rgbToOKLch, rgbToXyz, xyzToLab } from '../../utils/color';

/** Возвращает информацию пипетки по координатам и источнику. */
export function computePick(
  canvas: HTMLCanvasElement,
  kind: 'RGB' | 'GB7',
  scale: number,
  imgW: number,
  imgH: number,
  gb7px?: Uint8Array,
  srcXY?: { x: number; y: number }
): PickInfo {
  const ctx = canvas.getContext('2d')!;
  const x = srcXY ? srcXY.x * scale : 0;
  const y = srcXY ? srcXY.y * scale : 0;
  const d = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;

  let rgb: RGB = { r: d[0], g: d[1], b: d[2] };
  let gb7: number | undefined;

  if (kind === 'GB7' && gb7px && srcXY) {
    const idx =
      Math.max(0, Math.min(imgH - 1, srcXY.y)) * imgW + Math.max(0, Math.min(imgW - 1, srcXY.x));
    gb7 = gb7px[idx];
    if (typeof gb7 === 'number') rgb = gb7ToRgb(gb7);
  }
  const xyz = rgbToXyz(rgb);
  const lab = xyzToLab(xyz);
  const oklch = rgbToOKLch(rgb);
  return { xy: srcXY ?? { x: 0, y: 0 }, rgb, xyz, lab, oklch, gb7 };
}

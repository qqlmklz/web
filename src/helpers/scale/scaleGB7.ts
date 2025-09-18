/** Масштабирует 7-битный буфер GB7 (nearest/bilinear), результат 0..127. */
export function scaleGB7(
  src: Uint8Array,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
  method: 'nearest' | 'bilinear'
): Uint8Array {
  const dst = new Uint8Array(dw * dh);
  if (method === 'nearest') {
    for (let y = 0; y < dh; y++) {
      const sy = Math.min(sh - 1, Math.round((y * sh) / dh));
      for (let x = 0; x < dw; x++) {
        const sx = Math.min(sw - 1, Math.round((x * sw) / dw));
        dst[y * dw + x] = src[sy * sw + sx];
      }
    }
    return dst;
  }
  const scaleX = (sw - 1) / Math.max(1, dw - 1);
  const scaleY = (sh - 1) / Math.max(1, dh - 1);
  for (let y = 0; y < dh; y++) {
    const fy = y * scaleY;
    const y0 = Math.floor(fy);
    const y1 = Math.min(sh - 1, y0 + 1);
    const wy = fy - y0;
    for (let x = 0; x < dw; x++) {
      const fx = x * scaleX;
      const x0 = Math.floor(fx);
      const x1 = Math.min(sw - 1, x0 + 1);
      const wx = fx - x0;
      const p00 = src[y0 * sw + x0],
        p10 = src[y0 * sw + x1],
        p01 = src[y1 * sw + x0],
        p11 = src[y1 * sw + x1];
      const top = p00 * (1 - wx) + p10 * wx;
      const bot = p01 * (1 - wx) + p11 * wx;
      const val = Math.round(top * (1 - wy) + bot * wy);
      dst[y * dw + x] = val < 0 ? 0 : val > 127 ? 127 : val;
    }
  }
  return dst;
}

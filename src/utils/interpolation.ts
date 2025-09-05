export type InterpolationMethod = 'nearest' | 'bilinear';

/**
 * Масштабирует ImageData в новые размеры с использованием выбранного метода.
 * Возвращает НОВЫЙ ImageData (без мутаций исходного).
 */
export function scaleImageData(
  src: ImageData,
  newW: number,
  newH: number,
  method: InterpolationMethod = 'bilinear'
): ImageData {
  const srcW = src.width;
  const srcH = src.height;
  const srcData = src.data;
  const dst = new Uint8ClampedArray(newW * newH * 4);

  const sxRatio = srcW / newW;
  const syRatio = srcH / newH;

  const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

  if (method === 'nearest') {
    for (let y = 0; y < newH; y++) {
      const srcY = (y + 0.5) * syRatio - 0.5;
      const sy = clamp(Math.round(srcY), 0, srcH - 1);
      for (let x = 0; x < newW; x++) {
        const srcX = (x + 0.5) * sxRatio - 0.5;
        const sx = clamp(Math.round(srcX), 0, srcW - 1);

        const si = (sy * srcW + sx) * 4;
        const di = (y * newW + x) * 4;
        dst[di] = srcData[si];
        dst[di + 1] = srcData[si + 1];
        dst[di + 2] = srcData[si + 2];
        dst[di + 3] = srcData[si + 3];
      }
    }
  } else {
    // bilinear
    for (let y = 0; y < newH; y++) {
      const srcY = (y + 0.5) * syRatio - 0.5;
      const y0 = clamp(Math.floor(srcY), 0, srcH - 1);
      const y1 = clamp(y0 + 1, 0, srcH - 1);
      const dy = srcY - y0;

      for (let x = 0; x < newW; x++) {
        const srcX = (x + 0.5) * sxRatio - 0.5;
        const x0 = clamp(Math.floor(srcX), 0, srcW - 1);
        const x1 = clamp(x0 + 1, 0, srcW - 1);
        const dx = srcX - x0;

        const i00 = (y0 * srcW + x0) * 4;
        const i10 = (y0 * srcW + x1) * 4;
        const i01 = (y1 * srcW + x0) * 4;
        const i11 = (y1 * srcW + x1) * 4;

        const w00 = (1 - dx) * (1 - dy);
        const w10 = dx * (1 - dy);
        const w01 = (1 - dx) * dy;
        const w11 = dx * dy;

        const di = (y * newW + x) * 4;

        for (let c = 0; c < 4; c++) {
          dst[di + c] =
            srcData[i00 + c] * w00 +
            srcData[i10 + c] * w10 +
            srcData[i01 + c] * w01 +
            srcData[i11 + c] * w11;
        }
      }
    }
  }

  return new ImageData(dst, newW, newH);
}

export function getInterpolationHint(m: InterpolationMethod): string {
  return m === 'nearest'
    ? 'Ближайший сосед: максимально быстрый, «ступенчатые» края при увеличении, полезен для пиксель-арта.'
    : 'Билинейная: сглаживает и даёт более «мягкое» изображение, хороша для 12–300% масштабов по умолчанию.';
}

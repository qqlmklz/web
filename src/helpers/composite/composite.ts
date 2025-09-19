import type { AppLayer } from '../../types/layers';
import { applyBlend, flattenAlphaToWhite } from './blend';

export function compositeLayers(layers: AppLayer[], width: number, height: number): ImageData {
  const out = new ImageData(width, height);
  const dst = out.data;
  // очистим dst (прозрачно)
  for (let i = 0; i < dst.length; i += 4) {
    dst[i] = 0;
    dst[i + 1] = 0;
    dst[i + 2] = 0;
    dst[i + 3] = 0;
  }

  // слои уже отфильтрованы по visible/opacity у тебя в App.tsx, но на всякий:
  for (const l of layers) {
    if (!l.visible || (l.opacity ?? 1) <= 0) continue;

    // ↓ ключевая строка: берём imageData и для image-, и для color-слоя
    const srcImg =
      l.type === 'image'
        ? l.imageData
        : l.type === 'color'
          ? l.imageData /* то, что ты положил в App.tsx */
          : undefined;

    if (!srcImg || srcImg.width !== width || srcImg.height !== height) continue;

    const src = srcImg.data;
    const opacity = l.opacity ?? 1;
    const mode = l.blendMode ?? 'normal';

    applyBlend(dst, src, mode, opacity); // твой существующий блендер
  }

  return out;
}

export function removeLayerAlphaToWhite(layer: AppLayer) {
  if (layer.type !== 'image') return;
  const copy = new Uint8ClampedArray(layer.imageData.data);
  flattenAlphaToWhite(copy);
  layer.imageData = new ImageData(copy, layer.imageData.width, layer.imageData.height);
  layer.hasAlpha = false;
  layer.alphaHidden = false;
}

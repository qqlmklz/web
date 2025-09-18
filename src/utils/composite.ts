import type { AppLayer, ImageLayer } from '../types/layers';
import { blendPixel, flattenAlphaToWhite } from './blend';

export function compositeLayers(layers: AppLayer[], width: number, height: number): ImageData {
  const out = new ImageData(width, height);
  const od = out.data;
  od.fill(0);

  for (const layer of layers) {
    if (!layer.visible || layer.opacity <= 0) continue;

    let src: ImageData;

    if (layer.type === 'image') {
      const imgLayer = layer as ImageLayer;
      src = imgLayer.imageData;
    } else {
      continue;
    }

    const sd = src.data;
    for (let i = 0; i < sd.length; i += 4) {
      const s: [number, number, number, number] = [sd[i], sd[i + 1], sd[i + 2], sd[i + 3]];
      const d: [number, number, number, number] = [od[i], od[i + 1], od[i + 2], od[i + 3]];
      const res = blendPixel(layer.blendMode, s, d, layer.opacity, (layer as any).alphaHidden);
      od[i] = res[0];
      od[i + 1] = res[1];
      od[i + 2] = res[2];
      od[i + 3] = res[3];
    }
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

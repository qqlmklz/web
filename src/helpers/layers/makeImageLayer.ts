import { getColorDepth } from '../../canvas/getColorDepth';
import { renderGrayBit7 } from '../../canvas/renderGrayBit7';
import type { AppImageData } from '../../types/ImageData';
import type { BlendMode, ImageLayer } from '../../types/layers';

/** Создаёт слой-изображение из HTMLImageElement (в натуральном размере). */
export function makeBaseLayerFromImg(img: HTMLImageElement): ImageLayer {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const off = document.createElement('canvas');
  off.width = iw;
  off.height = ih;
  const ctx = off.getContext('2d')!;
  ctx.drawImage(img, 0, 0, iw, ih);
  const rgba = ctx.getImageData(0, 0, iw, ih);

  return {
    id: 'base_' + crypto.randomUUID().slice(0, 7),
    name: 'Image',
    type: 'image',
    visible: true,
    opacity: 1,
    blendMode: 'normal' as BlendMode,
    hasAlpha: getColorDepth(img) >= 32,
    alphaHidden: false,
    imageData: rgba,
  };
}

/** Создаёт слой-изображение из GB7-структуры (imageData с маской + превью без маски). */
export function makeBaseLayerFromGB7(data: any): ImageLayer {
  const iw = data.width!,
    ih = data.height!;
  const c = document.createElement('canvas');
  c.width = iw;
  c.height = ih;
  renderGrayBit7(c, data);
  const rgba = c.getContext('2d')!.getImageData(0, 0, iw, ih);

  const px7: Uint8Array = (data as any).pixels;
  const prevRaw = new ImageData(iw, ih);
  for (let i = 0, j = 0; i < px7.length; i++, j += 4) {
    const g7 = px7[i] & 0x7f;
    const g = (g7 << 1) | (g7 >> 6);
    prevRaw.data[j] = g;
    prevRaw.data[j + 1] = g;
    prevRaw.data[j + 2] = g;
    prevRaw.data[j + 3] = 255;
  }

  return {
    id: 'base_' + crypto.randomUUID().slice(0, 7),
    name: 'Image',
    type: 'image',
    visible: true,
    opacity: 1,
    blendMode: 'normal',
    hasAlpha: (data.depth ?? 7) >= 8,
    alphaHidden: false,
    imageData: rgba,
    previewRaw: prevRaw,
  };
}

/** Создаёт слой-изображение с вписыванием в заданную базовую область. */
export function makeImageLayerFittedFromImg(
  img: HTMLImageElement,
  baseW: number,
  baseH: number
): ImageLayer {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const k = Math.min(baseW / iw, baseH / ih);
  const dw = Math.max(1, Math.round(iw * k));
  const dh = Math.max(1, Math.round(ih * k));
  const dx = Math.floor((baseW - dw) / 2);
  const dy = Math.floor((baseH - dh) / 2);

  const off = document.createElement('canvas');
  off.width = baseW;
  off.height = baseH;
  const ctx = off.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, iw, ih, dx, dy, dw, dh);

  return {
    id: 'layer_' + crypto.randomUUID().slice(0, 8),
    name: 'Image',
    type: 'image',
    visible: true,
    opacity: 1,
    blendMode: 'normal',
    hasAlpha: getColorDepth(img) >= 32,
    alphaHidden: false,
    imageData: ctx.getImageData(0, 0, baseW, baseH),
  };
}

/** Создаёт слой-изображение из GB7 с вписыванием в заданную область. */
export function makeImageLayerFittedFromGB7(
  data: AppImageData & { width: number; height: number; depth?: number; pixels: Uint8Array },
  baseW: number,
  baseH: number
): ImageLayer {
  const src = document.createElement('canvas');
  src.width = data.width;
  src.height = data.height;
  renderGrayBit7(src, data);

  const k = Math.min(baseW / data.width, baseH / data.height);
  const dw = Math.max(1, Math.round(data.width * k));
  const dh = Math.max(1, Math.round(data.height * k));
  const dx = Math.floor((baseW - dw) / 2);
  const dy = Math.floor((baseH - dh) / 2);

  const off = document.createElement('canvas');
  off.width = baseW;
  off.height = baseH;
  const ctx = off.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, data.width, data.height, dx, dy, dw, dh);

  const rawCanvas = document.createElement('canvas');
  rawCanvas.width = data.width;
  rawCanvas.height = data.height;
  const pr = new ImageData(data.width, data.height);
  for (let i = 0, j = 0; i < data.pixels.length; i++, j += 4) {
    const g7 = data.pixels[i] & 0x7f;
    const g = (g7 << 1) | (g7 >> 6);
    pr.data[j] = g;
    pr.data[j + 1] = g;
    pr.data[j + 2] = g;
    pr.data[j + 3] = 255;
  }
  rawCanvas.getContext('2d')!.putImageData(pr, 0, 0);

  const prevOff = document.createElement('canvas');
  prevOff.width = baseW;
  prevOff.height = baseH;
  prevOff.getContext('2d')!.drawImage(rawCanvas, 0, 0, data.width, data.height, dx, dy, dw, dh);
  const previewRaw = prevOff.getContext('2d')!.getImageData(0, 0, baseW, baseH);

  return {
    id: 'layer_' + crypto.randomUUID().slice(0, 8),
    name: 'Image',
    type: 'image',
    visible: true,
    opacity: 1,
    blendMode: 'normal',
    hasAlpha: (data.depth ?? 7) === 8,
    alphaHidden: false,
    imageData: ctx.getImageData(0, 0, baseW, baseH),
    previewRaw,
  };
}

import { getColorDepth } from '../../canvas/getColorDepth';
import { renderGrayBit7 } from '../../canvas/renderGrayBit7';

/** Возвращает текущий кадр в виде ImageData из HTMLImageElement или GB7. */
export function currentImageToImageData(
  kind: 'RGB' | 'GB7',
  srcImg: HTMLImageElement | null,
  gb7Data: any | null
): ImageData | null {
  if (kind === 'RGB' && srcImg) {
    const iw = srcImg.naturalWidth || srcImg.width;
    const ih = srcImg.naturalHeight || srcImg.height;
    const off = document.createElement('canvas');
    off.width = iw;
    off.height = ih;
    const ctx = off.getContext('2d')!;
    ctx.drawImage(srcImg, 0, 0, iw, ih);
    return ctx.getImageData(0, 0, iw, ih);
  }
  if (kind === 'GB7' && gb7Data) {
    const off = document.createElement('canvas');
    off.width = gb7Data.width;
    off.height = gb7Data.height;
    renderGrayBit7(off, gb7Data);
    return off.getContext('2d')!.getImageData(0, 0, off.width, off.height);
  }
  return null;
}

/** Эвристика наличия альфа-канала для текущего изображения. */
export function hasAlphaForCurrentImage(
  kind: 'RGB' | 'GB7',
  srcImg: HTMLImageElement | null,
  gb7Data: any | null,
  defaultDepth = 24
): boolean {
  if (kind === 'GB7') return (gb7Data?.depth ?? 7) >= 8;
  return (srcImg ? getColorDepth(srcImg) : defaultDepth) >= 32;
}

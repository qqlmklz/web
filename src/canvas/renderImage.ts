import { fitCanvasToContainer } from '../utils/fitCanvas';

export const renderImage = (canvas: HTMLCanvasElement, img: HTMLImageElement) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;

  const { cssW, cssH } = fitCanvasToContainer(canvas, iw, ih);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.drawImage(img, 0, 0, iw, ih, 0, 0, cssW, cssH);
};

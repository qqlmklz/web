import { AppImageData } from '../types/ImageData';
import drawFittedImage from './drawFittedImage';

export const renderGrayBit7 = (canvas: HTMLCanvasElement, imageData: AppImageData) => {
  const ctx = canvas.getContext('2d');
  if (!ctx || !imageData.pixels) return;

  const { width, height, depth, pixels } = imageData;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = width;
  tmpCanvas.height = height;

  const tmpCtx = tmpCanvas.getContext('2d');
  const imgData = tmpCtx!.createImageData(width, height);
  const hasMask = depth === 8;

  for (let i = 0; i < pixels.length; i++) {
    const byte = pixels[i];
    const gray7 = byte & 0b01111111;
    const gray8 = Math.floor((gray7 / 127) * 255);
    let alpha = 255;

    if (hasMask) alpha = byte & 0b10000000 ? 255 : 0;

    const idx = i * 4;
    imgData.data[idx + 0] = gray8;
    imgData.data[idx + 1] = gray8;
    imgData.data[idx + 2] = gray8;
    imgData.data[idx + 3] = alpha;
  }

  tmpCtx!.putImageData(imgData, 0, 0);
  drawFittedImage(ctx, tmpCanvas, canvas);
};

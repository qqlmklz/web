import { AppImageData } from '../types/ImageData';

export const renderGrayBit7 = (canvas: HTMLCanvasElement, image: AppImageData) => {
  const ctx = canvas.getContext('2d');
  if (!ctx || !image?.pixels || !image.width || !image.height) return;

  const { width, height, depth, pixels } = image;

  canvas.width = width;
  canvas.height = height;

  const imgData = ctx.createImageData(width, height);
  const hasMask = depth === 8;

  for (let i = 0; i < pixels.length; i++) {
    const byte = pixels[i];
    const g7 = byte & 0b0111_1111; // 0..127
    const g = Math.round((g7 / 127) * 255); // 0..255
    const a = hasMask ? (byte & 0b1000_0000 ? 255 : 0) : 255;

    const idx = i * 4;
    imgData.data[idx + 0] = g;
    imgData.data[idx + 1] = g;
    imgData.data[idx + 2] = g;
    imgData.data[idx + 3] = a;
  }

  ctx.putImageData(imgData, 0, 0);
};

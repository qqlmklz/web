import { AppImageData } from '../types/ImageData';

export function renderGrayBit7(canvas: HTMLCanvasElement, data: AppImageData) {
  const ctx = canvas.getContext('2d');
  if (!ctx || !data?.width || !data?.height) return;

  const w = data.width!;
  const h = data.height!;
  canvas.width = w;
  canvas.height = h;

  const px = (data as any).pixels as Uint8Array | undefined;
  if (!px || px.length !== w * h) {
    ctx.clearRect(0, 0, w, h);
    return;
  }

  const hasMask = (data.depth ?? 7) === 8;

  const img = ctx.createImageData(w, h);
  let di = 0;
  for (let i = 0; i < px.length; i++) {
    const b = px[i];
    const g7 = b & 0x7f;
    const g = (g7 << 1) | (g7 >> 6);

    img.data[di++] = g; // R
    img.data[di++] = g; // G
    img.data[di++] = g; // B
    img.data[di++] = hasMask ? (b & 0x80 ? 255 : 0) : 255;
  }

  ctx.putImageData(img, 0, 0);
}

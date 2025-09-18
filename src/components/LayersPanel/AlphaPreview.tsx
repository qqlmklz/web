import { useEffect, useRef } from 'react';
import type { ImageLayer } from '../../types/layers';

const W = 96; // ширина превью
const H = 56; // высота превью
const CELL = 8; // размер клетки шахматки

function drawChecker(ctx: CanvasRenderingContext2D, w: number, h: number) {
  for (let y = 0; y < h; y += CELL) {
    for (let x = 0; x < w; x += CELL) {
      const on = ((x / CELL) | 0) % 2 === ((y / CELL) | 0) % 2;
      ctx.fillStyle = on ? '#e5e7eb' : '#cbd5e1';
      ctx.fillRect(x, y, CELL, CELL);
    }
  }
}

function fit(srcW: number, srcH: number, boxW: number, boxH: number) {
  const k = Math.min(boxW / srcW, boxH / srcH);
  const dw = Math.max(1, Math.floor(srcW * k));
  const dh = Math.max(1, Math.floor(srcH * k));
  const dx = Math.floor((boxW - dw) / 2);
  const dy = Math.floor((boxH - dh) / 2);
  return { dw, dh, dx, dy };
}

type Props = { layer: ImageLayer };

export default function AlphaPreview({ layer }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, W, H);
    drawChecker(ctx, W, H);

    if (!layer.hasAlpha) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('нет альфы', W / 2, H / 2 + 4);
      return;
    }

    const src = layer.imageData;
    const off = document.createElement('canvas');
    off.width = src.width;
    off.height = src.height;
    const octx = off.getContext('2d')!;
    octx.putImageData(src, 0, 0);

    const alphaOnly = new ImageData(src.width, src.height);
    for (let i = 0, j = 0; i < src.data.length; i += 4, j += 4) {
      const a = src.data[i + 3];
      alphaOnly.data[j + 0] = 255;
      alphaOnly.data[j + 1] = 255;
      alphaOnly.data[j + 2] = 255;
      alphaOnly.data[j + 3] = a;
    }

    const aCanvas = document.createElement('canvas');
    aCanvas.width = src.width;
    aCanvas.height = src.height;
    aCanvas.getContext('2d')!.putImageData(alphaOnly, 0, 0);

    const { dw, dh, dx, dy } = fit(src.width, src.height, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(aCanvas, 0, 0, src.width, src.height, dx, dy, dw, dh);

    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
  }, [layer]);

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ fontSize: 12, color: '#64748b' }}>Альфа-канал</div>
      <canvas
        ref={ref}
        width={W}
        height={H}
        style={{
          display: 'block',
          width: W,
          height: H,
          borderRadius: 8,
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)',
          background: '#f1f5f9',
        }}
      />
    </div>
  );
}

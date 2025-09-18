import { useEffect, useRef } from 'react';
import type { AppLayer, ImageLayer } from '../../types/layers';
import { flattenAlphaToWhite } from '../../utils/blend';

const PREV_W = 44;
const PREV_H = 28;

function fit(w: number, h: number, boxW: number, boxH: number) {
  const k = Math.min(boxW / w, boxH / h);
  const dw = Math.max(1, Math.floor(w * k));
  const dh = Math.max(1, Math.floor(h * k));
  const dx = Math.floor((boxW - dw) / 2);
  const dy = Math.floor((boxH - dh) / 2);
  return { dw, dh, dx, dy };
}

type Props = { layer: AppLayer };

export default function LayerPreview({ layer }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, PREV_W, PREV_H);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, PREV_W, PREV_H);

    if (layer.type === 'color') {
      const { r, g, b } = layer.color;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, 0, PREV_W, PREV_H);
      return;
    }

    const imgLayer = layer as ImageLayer;

    const src = imgLayer.previewRaw ?? imgLayer.imageData;

    const copy = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
    flattenAlphaToWhite(copy.data);

    const off = document.createElement('canvas');
    off.width = copy.width;
    off.height = copy.height;
    off.getContext('2d')!.putImageData(copy, 0, 0);

    const k = Math.min(PREV_W / off.width, PREV_H / off.height);
    const dw = Math.max(1, Math.floor(off.width * k));
    const dh = Math.max(1, Math.floor(off.height * k));
    const dx = Math.floor((PREV_W - dw) / 2);
    const dy = Math.floor((PREV_H - dh) / 2);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(off, 0, 0, off.width, off.height, dx, dy, dw, dh);
  }, [layer]);

  return (
    <canvas
      ref={ref}
      width={PREV_W}
      height={PREV_H}
      style={{ display: 'block', width: PREV_W, height: PREV_H }}
    />
  );
}

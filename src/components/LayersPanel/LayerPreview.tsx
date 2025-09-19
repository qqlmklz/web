import { useEffect, useRef } from 'react';
import { flattenAlphaToWhite } from '../../helpers/composite/blend';
import type { AppLayer, ImageLayer } from '../../types/layers';

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
    const draw = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
    flattenAlphaToWhite(draw.data);

    const off = document.createElement('canvas');
    off.width = draw.width;
    off.height = draw.height;
    off.getContext('2d')!.putImageData(draw, 0, 0);

    const { dw, dh, dx, dy } = fit(off.width, off.height, PREV_W, PREV_H);
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

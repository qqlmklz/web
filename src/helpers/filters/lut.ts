export type LUT = Uint8Array;

export function buildLUTPiecewise({
  max,
  p1,
  p2,
}: {
  max: number;
  p1: { x: number; y: number };
  p2: { x: number; y: number };
}): LUT {
  const size = max + 1;
  const lut = new Uint8Array(size);

  const clamp = (v: number) => Math.max(0, Math.min(max, v));
  const x1 = clamp(Math.min(p1.x, p2.x));
  const y1 = clamp(p1.x <= p2.x ? p1.y : p2.y);
  const x2 = clamp(Math.max(p1.x, p2.x));
  const y2 = clamp(p1.x <= p2.x ? p2.y : p1.y);

  for (let x = 0; x <= max; x++) {
    let y: number;
    if (x <= x1) {
      y = y1;
    } else if (x >= x2) {
      y = y2;
    } else {
      const t = (x - x1) / (x2 - x1);
      y = y1 + t * (y2 - y1);
    }
    lut[x] = clamp(Math.round(y));
  }
  return lut;
}

/** Применение LUT к ImageData в режимах RGB / ALPHA / GRAY. */
export function applyLUTToImageData(
  src: ImageData,
  lut: LUT,
  mode: 'RGB' | 'ALPHA' | 'GRAY'
): ImageData {
  const out = new ImageData(src.width, src.height);
  const s = src.data;
  const d = out.data;

  const map = (v: number) => lut[v < 0 ? 0 : v > lut.length - 1 ? lut.length - 1 : v];

  for (let i = 0; i < s.length; i += 4) {
    if (mode === 'RGB') {
      d[i] = map(s[i]);
      d[i + 1] = map(s[i + 1]);
      d[i + 2] = map(s[i + 2]);
      d[i + 3] = s[i + 3];
    } else if (mode === 'ALPHA') {
      d[i] = s[i];
      d[i + 1] = s[i + 1];
      d[i + 2] = s[i + 2];
      d[i + 3] = map(s[i + 3]);
    } else {
      const y = map(Math.round(0.2126 * s[i] + 0.7152 * s[i + 1] + 0.0722 * s[i + 2]));
      d[i] = y;
      d[i + 1] = y;
      d[i + 2] = y;
      d[i + 3] = s[i + 3];
    }
  }
  return out;
}

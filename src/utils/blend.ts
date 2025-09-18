import type { BlendMode } from '../types/layers';

const clamp255 = (x: number) => (x < 0 ? 0 : x > 255 ? 255 : x | 0);

function blendChannel(mode: BlendMode, s: number, d: number): number {
  switch (mode) {
    case 'normal':
      return s;
    case 'multiply':
      return (d * s) / 255;
    case 'screen':
      return 255 - ((255 - d) * (255 - s)) / 255;
    case 'overlay':
      return d < 128 ? (2 * d * s) / 255 : 255 - (2 * (255 - d) * (255 - s)) / 255;
  }
}

export function blendPixel(
  mode: BlendMode,
  src: [number, number, number, number],
  dst: [number, number, number, number],
  opacity01: number,
  alphaHidden: boolean
): [number, number, number, number] {
  const [sr, sg, sb, sa0] = src;
  const [dr, dg, db, da0] = dst;

  const sa = alphaHidden ? 255 : sa0;
  const aS = (sa / 255) * opacity01;
  const aD = da0 / 255;
  const outA = aS + aD * (1 - aS);

  if (outA <= 0) return [dr, dg, db, 0];

  const br = blendChannel(mode, sr, dr);
  const bg = blendChannel(mode, sg, dg);
  const bb = blendChannel(mode, sb, db);

  const or = (br * aS + dr * aD * (1 - aS)) / outA;
  const og = (bg * aS + dg * aD * (1 - aS)) / outA;
  const ob = (bb * aS + db * aD * (1 - aS)) / outA;

  return [clamp255(or), clamp255(og), clamp255(ob), clamp255(outA * 255)];
}

export function flattenAlphaToWhite(data: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] / 255;
    data[i + 0] = clamp255(data[i + 0] * a + 255 * (1 - a));
    data[i + 1] = clamp255(data[i + 1] * a + 255 * (1 - a));
    data[i + 2] = clamp255(data[i + 2] * a + 255 * (1 - a));
    data[i + 3] = 255;
  }
}

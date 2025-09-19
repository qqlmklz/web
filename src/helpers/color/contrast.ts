import type { RGB } from '../types/Color';

// относительная яркость для sRGB (WCAG 2.x)
function relLum({ r, g, b }: RGB): number {
  const L = (u: number) => {
    const s = u / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const R = L(r),
    G = L(g),
    B = L(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function wcagContrast(a: RGB, b: RGB): number {
  const L1 = relLum(a),
    L2 = relLum(b);
  const [hi, lo] = L1 >= L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}

// упрощенная оценка APCA (не для строгих проверок)
export function apcaContrast(a: RGB, b: RGB): number {
  const Y = (c: RGB) => 0.2126 * (c.r / 255) + 0.7152 * (c.g / 255) + 0.0722 * (c.b / 255);
  return 1.14 * (Y(a) - Y(b));
}

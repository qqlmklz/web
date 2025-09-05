import type { Lab, LCH, OKLab, OKLch, RGB, XYZ } from '../types/Color';

// ===== sRGB <-> XYZ (D65)
const M_RGB_TO_XYZ = [
  [0.4124564, 0.3575761, 0.1804375],
  [0.2126729, 0.7151522, 0.072175],
  [0.0193339, 0.119192, 0.9503041],
];
const M_XYZ_TO_RGB = [
  [3.2404542, -1.5371385, -0.4985314],
  [-0.969266, 1.8760108, 0.041556],
  [0.0556434, -0.2040259, 1.0572252],
];

const Xn = 0.95047,
  Yn = 1.0,
  Zn = 1.08883;

const srgbToLinear = (u: number) => (u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (u: number) => (u <= 0.0031308 ? 12.92 * u : 1.055 * u ** (1 / 2.4) - 0.055);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// RGB(0..255) -> XYZ
export function rgbToXyz({ r, g, b }: RGB): XYZ {
  const R = srgbToLinear(r / 255),
    G = srgbToLinear(g / 255),
    B = srgbToLinear(b / 255);
  return {
    X: M_RGB_TO_XYZ[0][0] * R + M_RGB_TO_XYZ[0][1] * G + M_RGB_TO_XYZ[0][2] * B,
    Y: M_RGB_TO_XYZ[1][0] * R + M_RGB_TO_XYZ[1][1] * G + M_RGB_TO_XYZ[1][2] * B,
    Z: M_RGB_TO_XYZ[2][0] * R + M_RGB_TO_XYZ[2][1] * G + M_RGB_TO_XYZ[2][2] * B,
  };
}

// XYZ -> RGB(0..255)
export function xyzToRgb({ X, Y, Z }: XYZ): RGB {
  const rL = M_XYZ_TO_RGB[0][0] * X + M_XYZ_TO_RGB[0][1] * Y + M_XYZ_TO_RGB[0][2] * Z;
  const gL = M_XYZ_TO_RGB[1][0] * X + M_XYZ_TO_RGB[1][1] * Y + M_XYZ_TO_RGB[1][2] * Z;
  const bL = M_XYZ_TO_RGB[2][0] * X + M_XYZ_TO_RGB[2][1] * Y + M_XYZ_TO_RGB[2][2] * Z;
  return {
    r: Math.round(clamp01(linearToSrgb(rL)) * 255),
    g: Math.round(clamp01(linearToSrgb(gL)) * 255),
    b: Math.round(clamp01(linearToSrgb(bL)) * 255),
  };
}

// ===== XYZ <-> Lab
const delta = 6 / 29;
const f = (t: number) => (t > delta ** 3 ? Math.cbrt(t) : t / (3 * delta * delta) + 4 / 29);
const finv = (ft: number) => (ft > delta ? ft ** 3 : 3 * delta * delta * (ft - 4 / 29));

export function xyzToLab({ X, Y, Z }: XYZ): Lab {
  const fx = f(X / Xn),
    fy = f(Y / Yn),
    fz = f(Z / Zn);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

export function labToXyz({ L, a, b }: Lab): XYZ {
  const fy = (L + 16) / 116,
    fx = fy + a / 500,
    fz = fy - b / 200;
  return { X: Xn * finv(fx), Y: Yn * finv(fy), Z: Zn * finv(fz) };
}

// ===== Lab <-> LCH
export function labToLch({ L, a, b }: Lab): LCH {
  const C = Math.hypot(a, b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { L, C, h };
}

export function lchToLab({ L, C, h }: LCH): Lab {
  const hr = (h * Math.PI) / 180;
  return { L, a: C * Math.cos(hr), b: C * Math.sin(hr) };
}

// ===== OKLab / OKLch (Björn Ottosson)
export function rgbToOKLab({ r, g, b }: RGB): OKLab {
  const rl = srgbToLinear(r / 255),
    gl = srgbToLinear(g / 255),
    bl = srgbToLinear(b / 255);
  const l_ = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
  const m_ = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
  const s_ = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;
  const l = Math.cbrt(l_),
    m = Math.cbrt(m_),
    s = Math.cbrt(s_);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

export function okLabToOKLch({ L, a, b }: OKLab): OKLch {
  const C = Math.hypot(a, b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { L, C, h };
}

export function rgbToOKLch(rgb: RGB): OKLch {
  return okLabToOKLch(rgbToOKLab(rgb));
}

// ===== GB7 =====
// Для вычислений: sRGB 0..1 = v / 127; для отображения: round(v*255/127)
export function gb7ToRgb(v: number): RGB {
  const val = Math.min(127, Math.max(0, v));
  const u = Math.round((val * 255) / 127);
  return { r: u, g: u, b: u };
}

export function rgbToGb7(rgb: RGB): number {
  return Math.round((rgb.r / 255) * 127);
}

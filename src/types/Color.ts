export type Tool = 'hand' | 'eyedropper';

export type RGB = { r: number; g: number; b: number };
export type XYZ = { X: number; Y: number; Z: number };
export type Lab = { L: number; a: number; b: number };
export type LCH = { L: number; C: number; h: number };
export type OKLab = { L: number; a: number; b: number };
export type OKLch = { L: number; C: number; h: number };

export type PickInfo = {
  xy: { x: number; y: number }; // координаты пикселя внутри исходника
  rgb: RGB;
  xyz: XYZ;
  lab: Lab;
  oklch: OKLch;
  gb7?: number; // 0..127
};

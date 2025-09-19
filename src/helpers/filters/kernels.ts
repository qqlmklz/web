// src/utils/kernels.ts
import type { Kernel3x3 } from '../helpers/filters/convolution';

export const Kernels: Record<string, Kernel3x3> = {
  Identity: [0, 0, 0, 0, 1, 0, 0, 0, 0],
  Sharpen: [0, -1, 0, -1, 5, -1, 0, -1, 0],
  Gaussian3x3: [
    // σ≈1, нормализуем автоматически
    1, 2, 1, 2, 4, 2, 1, 2, 1,
  ],
  BoxBlur3x3: [1, 1, 1, 1, 1, 1, 1, 1, 1],
  PrewittX: [
    // горизонтальные границы
    -1, 0, 1, -1, 0, 1, -1, 0, 1,
  ],
  PrewittY: [
    // вертикальные границы
    1, 1, 1, 0, 0, 0, -1, -1, -1,
  ],
};
export type KernelName = keyof typeof Kernels;

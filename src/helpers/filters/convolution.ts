// src/utils/convolution.ts
export type Kernel3x3 = number[]; // длина 9: [k00,k01,k02, k10,k11,k12, k20,k21,k22]
type Target = 'rgb' | 'alpha' | 'rgba';

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function convolve3x3(
  src: ImageData,
  kernel: Kernel3x3,
  opts?: { target?: Target; normalize?: boolean; preserveAlpha?: boolean }
): ImageData {
  const { width, height, data } = src;
  const target: Target = opts?.target ?? 'rgb';
  const preserveAlpha = opts?.preserveAlpha ?? true;

  // auto-normalize для “смягчающих” ядер (Gaussian/Box)
  const sum = kernel.reduce((a, b) => a + b, 0);
  const normalize = opts?.normalize ?? sum !== 0; // если сумма 0 (edge/ sharpen) — НЕ нормализуем
  const k = normalize ? kernel.map((v) => v / (sum || 1)) : kernel;

  const out = new ImageData(width, height);
  const dst = out.data;

  // helper: "extend" края — берём ближайший пиксель
  function sample(x: number, y: number, c: 0 | 1 | 2 | 3) {
    const xx = clamp(x, 0, width - 1);
    const yy = clamp(y, 0, height - 1);
    const i = (yy * width + xx) * 4 + c;
    return data[i];
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      // каналы
      if (target === 'rgb' || target === 'rgba') {
        for (let c: 0 | 1 | 2 = 0 as any; c < 3; c = (c + 1) as 0 | 1 | 2) {
          let acc = 0;
          let idx = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++, idx++) {
              acc += sample(x + kx, y + ky, c) * k[idx];
            }
          }
          dst[i + c] = clamp(Math.round(acc), 0, 255);
        }
      } else {
        // rgb untouched
        dst[i] = data[i];
        dst[i + 1] = data[i + 1];
        dst[i + 2] = data[i + 2];
      }

      if (target === 'alpha' || (target === 'rgba' && !preserveAlpha)) {
        let accA = 0;
        let idxA = 0;
        for (let ky = -1; ky <= 1; ky++)
          for (let kx = -1; kx <= 1; kx++, idxA++) {
            accA += sample(x + kx, y + ky, 3) * k[idxA];
          }
        dst[i + 3] = clamp(Math.round(accA), 0, 255);
      } else {
        dst[i + 3] = data[i + 3];
      }
    }
  }
  return out;
}

/** Генерирует сплошной RGBA-буфер заданного цвета на всю область. */
export function makeFillBuffer(
  width: number,
  height: number,
  color: { r: number; g: number; b: number; a?: number }
): Uint8ClampedArray {
  const { r, g, b, a = 1 } = color;
  const A = Math.round(a * 255);
  const out = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < out.length; i += 4) {
    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
    out[i + 3] = A;
  }
  return out;
}

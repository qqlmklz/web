/** Жжёт альфу в белый фон (RGBA → RGBA непрозрачный). */
export function burnAlphaToWhite(src: ImageData): ImageData {
  const out = new ImageData(src.width, src.height);
  const s = src.data,
    d = out.data;
  for (let i = 0; i < s.length; i += 4) {
    const a = s[i + 3] / 255;
    d[i] = Math.round(s[i] * a + 255 * (1 - a));
    d[i + 1] = Math.round(s[i + 1] * a + 255 * (1 - a));
    d[i + 2] = Math.round(s[i + 2] * a + 255 * (1 - a));
    d[i + 3] = 255;
  }
  return out;
}

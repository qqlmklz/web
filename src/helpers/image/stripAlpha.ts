/** Делаёт альфу непрозрачной (A=255) без изменения RGB. */
export function stripAlpha(img: ImageData): ImageData {
  const out = new ImageData(img.width, img.height);
  const s = img.data,
    d = out.data;
  for (let i = 0; i < s.length; i += 4) {
    d[i] = s[i];
    d[i + 1] = s[i + 1];
    d[i + 2] = s[i + 2];
    d[i + 3] = 255;
  }
  return out;
}

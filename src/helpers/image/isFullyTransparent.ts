/** Проверяет, что изображение полностью прозрачно. */
export function isFullyTransparent(img: ImageData): boolean {
  const d = img.data;
  for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) return false;
  return true;
}

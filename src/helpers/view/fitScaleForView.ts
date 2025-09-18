/** Возвращает масштаб, вписывающий изображение в контейнер с запасом 100px. */
export function fitScaleForView(view: HTMLDivElement | null, imgW: number, imgH: number): number {
  if (!view) return 1;
  const maxW = Math.max(1, view.clientWidth - 100);
  const maxH = Math.max(1, view.clientHeight - 100);
  return Math.min(maxW / imgW, maxH / imgH, 1);
}

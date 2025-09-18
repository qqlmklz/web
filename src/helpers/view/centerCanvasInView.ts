/** Центрирует канвас внутри скроллируемого контейнера. */
export function centerCanvasInView(
  view: HTMLDivElement | null,
  canvas: HTMLCanvasElement | null
): void {
  if (!view || !canvas) return;
  const left = Math.max(0, (canvas.scrollWidth - view.clientWidth) / 2);
  const top = Math.max(0, (canvas.scrollHeight - view.clientHeight) / 2);
  view.scrollLeft = left;
  view.scrollTop = top;
}

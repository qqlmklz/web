// Преобразование координаты курсора -> координата пикселя canvas.
export function eventToCanvasXY(evt: MouseEvent, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const cx = evt.clientX - rect.left;
  const cy = evt.clientY - rect.top;
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return { x: Math.floor(cx * scaleX), y: Math.floor(cy * scaleY) };
}

export function clampXY(x: number, y: number, w: number, h: number) {
  return { x: Math.min(w - 1, Math.max(0, x)), y: Math.min(h - 1, Math.max(0, y)) };
}

export function fitCanvasToContainer(
  canvas: HTMLCanvasElement,
  imgW: number,
  imgH: number,
  padding = 50
) {
  const container = canvas.parentElement as HTMLElement;
  const rect = container.getBoundingClientRect();

  const maxW = Math.max(1, rect.width - padding * 0);
  const maxH = Math.max(1, rect.height - padding * 0);

  const scale = Math.min(maxW / imgW, maxH / imgH, 1);
  const cssW = Math.floor(imgW * scale);
  const cssH = Math.floor(imgH * scale);

  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.max(1, Math.floor(cssW * dpr));
  canvas.height = Math.max(1, Math.floor(cssH * dpr));

  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  return { cssW, cssH, scale };
}

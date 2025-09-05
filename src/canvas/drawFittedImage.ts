const drawFittedImage = (
  ctx: CanvasRenderingContext2D,
  imgCanvas: HTMLCanvasElement,
  canvas: HTMLCanvasElement,
  padding = 50
) => {
  const availableWidth = canvas.width - padding * 2;
  const availableHeight = canvas.height - padding * 2;

  const scale = Math.min(availableWidth / imgCanvas.width, availableHeight / imgCanvas.height);

  const drawWidth = imgCanvas.width * scale;
  const drawHeight = imgCanvas.height * scale;
  const offsetX = (canvas.width - drawWidth) / 2;
  const offsetY = (canvas.height - drawHeight) / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(imgCanvas, offsetX, offsetY, drawWidth, drawHeight);
};

export default drawFittedImage;

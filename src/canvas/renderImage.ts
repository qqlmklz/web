import drawFittedImage from './drawFittedImage';

export const renderImage = (canvas: HTMLCanvasElement, img: HTMLImageElement) => {
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = img.width;
  tmpCanvas.height = img.height;

  const tmpCtx = tmpCanvas.getContext('2d');
  tmpCtx?.drawImage(img, 0, 0);

  drawFittedImage(ctx!, tmpCanvas, canvas);
};

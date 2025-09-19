export function downloadPNG(img: ImageData, filename = 'image.png') {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  c.getContext('2d')!.putImageData(img, 0, 0);
  c.toBlob((blob) => triggerDownload(blob!, filename), 'image/png');
}

export function downloadJPG(img: ImageData, filename = 'image.jpg', quality = 0.92) {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;

  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.putImageData(img, 0, 0);
  c.toBlob((blob) => triggerDownload(blob!, filename), 'image/jpeg', quality);
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

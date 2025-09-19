export function bytesToBlob(bytes: Uint8Array, type = 'application/octet-stream'): Blob {
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  return new Blob([ab], { type });
}

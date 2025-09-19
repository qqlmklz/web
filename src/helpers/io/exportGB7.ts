import { bytesToBlob } from './bytesToBlob';

const MAGIC = [0x47, 0x42, 0x37, 0x00];
const VERSION = 1;

type GB7EncodeOptions = {
  forceAlphaMask?: boolean;
  alphaOpaqueThreshold?: number;
};

export function downloadGB7(img: ImageData, filename = 'image.gb7', opts?: GB7EncodeOptions) {
  const bytes = encodeGB7(img, opts);
  const blob = bytesToBlob(bytes, 'application/octet-stream');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function encodeGB7(img: ImageData, opts: GB7EncodeOptions = {}): Uint8Array {
  const { data, width, height } = img;
  const alphaThreshold = opts.alphaOpaqueThreshold ?? 128;

  const gray = new Uint8Array(width * height);
  let hasAlpha = false;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2],
      a = data[i + 3];
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const v = Math.round((y * 127) / 255);
    gray[p] = v < 0 ? 0 : v > 127 ? 127 : v;
    if (a < 255) hasAlpha = true;
  }
  if (!opts.forceAlphaMask) {
    hasAlpha = hasAlpha;
  } else {
    hasAlpha = true;
  }

  let alphaMask: Uint8Array | null = null;
  if (hasAlpha) {
    const bytesPerRow = Math.ceil(width / 8);
    alphaMask = new Uint8Array(bytesPerRow * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = y * width + x;
        const a = data[p * 4 + 3];
        const opaque = a >= alphaThreshold ? 1 : 0;
        const byteIndex = y * bytesPerRow + (x >> 3);
        const bitIndex = 7 - (x & 7); // MSB first
        alphaMask[byteIndex] |= opaque << bitIndex;
      }
    }
  }

  const headerSize = 4 + 1 + 1 + 4 + 4;
  const graySize = width * height;
  const alphaSize = alphaMask ? alphaMask.length : 0;
  const total = headerSize + graySize + alphaSize;

  const out = new Uint8Array(total);
  let off = 0;
  out.set(MAGIC, off);
  off += 4;
  out[off++] = VERSION;
  out[off++] = hasAlpha ? 0b00000001 : 0;
  writeU32LE(out, off, width);
  off += 4;
  writeU32LE(out, off, height);
  off += 4;
  out.set(gray, off);
  off += graySize;
  if (alphaMask) out.set(alphaMask, off);

  return out;
}

function writeU32LE(buf: Uint8Array, off: number, val: number) {
  buf[off] = val & 0xff;
  buf[off + 1] = (val >>> 8) & 0xff;
  buf[off + 2] = (val >>> 16) & 0xff;
  buf[off + 3] = (val >>> 24) & 0xff;
}

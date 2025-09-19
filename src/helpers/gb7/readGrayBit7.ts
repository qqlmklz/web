import { AppImageData } from '../types/ImageData';

export function readGrayBit7(buf: ArrayBuffer): AppImageData | null {
  const dv = new DataView(buf);
  if (dv.byteLength < 12) return null;

  if (
    dv.getUint8(0) !== 0x47 ||
    dv.getUint8(1) !== 0x42 ||
    dv.getUint8(2) !== 0x37 ||
    dv.getUint8(3) !== 0x1d
  ) {
    return null;
  }

  const version = dv.getUint8(4);
  const flags = dv.getUint8(5);
  const width = dv.getUint16(6, false);
  const height = dv.getUint16(8, false);

  const count = width * height;
  if (12 + count > dv.byteLength) return null;

  const hasMask = (flags & 0x01) === 0x01;

  const pixels = new Uint8Array(buf, 12, count);

  const out: AppImageData = { width, height, depth: hasMask ? 8 : 7 } as AppImageData;
  (out as any).pixels = pixels;

  return out;
}

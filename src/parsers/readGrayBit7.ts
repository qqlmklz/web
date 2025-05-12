import { AppImageData } from "../types/ImageData";

export const readGrayBit7 = (arrayBuffer: ArrayBuffer): AppImageData | null => {
  const dataView = new DataView(arrayBuffer);
  const signature = String.fromCharCode(
    dataView.getUint8(0),
    dataView.getUint8(1),
    dataView.getUint8(2),
    dataView.getUint8(3)
  );

  if (signature !== "GB7\x1D") return null;

  const flag = dataView.getUint8(5);
  const width = dataView.getUint16(6);
  const height = dataView.getUint16(8);
  const reserved = dataView.getUint16(10);

  if (reserved !== 0x0000) return null;

  const useMask = (flag & 0b00000001) === 1;
  const depth = useMask ? 8 : 7;
  const pixelData = new Uint8Array(arrayBuffer, 12, width * height);

  return {
    width,
    height,
    depth,
    format: "gb7",
    pixels: pixelData,
  };
};

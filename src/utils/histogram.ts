export type HistRGB = { r: number[]; g: number[]; b: number[] };

/** Расчёт гистограмм RGB. bins: 128 (для max=127) или 256 (для max=255). */
export function computeHistRGB(img: ImageData, bins: number): HistRGB {
  const r = new Array(bins).fill(0);
  const g = new Array(bins).fill(0);
  const b = new Array(bins).fill(0);

  const { data } = img;
  const step = 4;
  const scale = 256 / bins;

  for (let i = 0; i < data.length; i += step) {
    r[(data[i] / scale) | 0]++;
    g[(data[i + 1] / scale) | 0]++;
    b[(data[i + 2] / scale) | 0]++;
  }
  return { r, g, b };
}

/** Гистограмма альфа-канала. */
export function computeHistAlpha(img: ImageData, bins: number): number[] {
  const a = new Array(bins).fill(0);
  const { data } = img;
  const step = 4;
  const scale = 256 / bins;

  for (let i = 0; i < data.length; i += step) {
    a[(data[i + 3] / scale) | 0]++;
  }
  return a;
}

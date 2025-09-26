import React, { useEffect, useState } from 'react';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import { AppLayer } from '../../types/layers';
import './CurvesPanel.css';

type Channel = 'R' | 'G' | 'B' | 'A' | 'Gray';
type CurvePoint = { inVal: number; outVal: number };
type CurvePair = { p1: CurvePoint; p2: CurvePoint };
type LUT = Uint8Array;
type LUTs = { r?: LUT; g?: LUT; b?: LUT; a?: LUT };

type Props = {
  layer: AppLayer | null;
  isGB7?: boolean;
  onApply: (luts: LUTs, target: 'rgb' | 'alpha') => void;
  onCommit: (luts: LUTs, target: 'rgb' | 'alpha') => void;
  onClose: () => void;
  onPreviewChange?: (enabled: boolean, luts?: LUTs, target?: 'rgb' | 'alpha') => void;
};

const clamp = (n: number, lo: number, hi: number) =>
  Number.isNaN(n) ? lo : Math.max(lo, Math.min(hi, Math.round(n)));

const clamp255 = (n: number) => (Number.isNaN(n) ? 0 : Math.max(0, Math.min(255, Math.round(n))));
const detectGB7 = (layer: AppLayer | null) => {
  const any = layer as any;
  return Boolean(
    any?.isGB7 ||
      any?.gb7 ||
      any?.colorModel === 'GB7' ||
      any?.mode === 'gb7' ||
      any?.imageData?.kind === 'GB7' ||
      (typeof any?.name === 'string' && /\.gb7$/i.test(any.name))
  );
};
function makeLUT(p1: CurvePoint, p2: CurvePoint): LUT {
  const lut = new Uint8Array(256);
  for (let x = 0; x < 256; x++) {
    let y: number;
    if (x <= p1.inVal) {
      const k = p1.outVal / Math.max(1, p1.inVal);
      y = k * x;
    } else if (x >= p2.inVal) {
      const k = (255 - p2.outVal) / Math.max(1, 255 - p2.inVal);
      y = p2.outVal + (x - p2.inVal) * k;
    } else {
      const t = (x - p1.inVal) / Math.max(1, p2.inVal - p1.inVal);
      y = p1.outVal + (p2.outVal - p1.outVal) * t;
    }
    lut[x] = Math.min(255, Math.max(0, Math.round(y)));
  }
  return lut;
}
function identity(): CurvePair {
  return { p1: { inVal: 0, outVal: 0 }, p2: { inVal: 255, outVal: 255 } };
}
const targetFor = (c: Channel): 'rgb' | 'alpha' => (c === 'A' ? 'alpha' : 'rgb');
function buildAllLUTs(state: Record<Channel, CurvePair>, isGB7: boolean): LUTs {
  if (isGB7) {
    const lg = makeLUT(state.Gray.p1, state.Gray.p2);
    const la = makeLUT(state.A.p1, state.A.p2);
    return { r: lg, g: lg, b: lg, a: la };
  }
  return {
    r: makeLUT(state.R.p1, state.R.p2),
    g: makeLUT(state.G.p1, state.G.p2),
    b: makeLUT(state.B.p1, state.B.p2),
    a: makeLUT(state.A.p1, state.A.p2),
  };
}

function buildChHist(img: ImageData, ch: 0 | 1 | 2 | 3): number[] {
  const bins = new Array(256).fill(0);
  for (let i = ch; i < img.data.length; i += 4) bins[img.data[i]]++;
  return bins;
}
function buildGrayHist(img: ImageData): number[] {
  const bins = new Array(256).fill(0);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const g = Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
    bins[g]++;
  }
  return bins;
}

function HistogramWithCurve({
  hist,
  p1,
  p2,
  label,
}: {
  hist: number[];
  p1: CurvePoint;
  p2: CurvePoint;
  label: string;
}) {
  const W = 360,
    H = 240,
    pad = 16;
  const plotW = W - pad * 2,
    plotH = H - pad * 2;
  const maxV = Math.max(1, ...hist);

  const toX = (x: number) => pad + (x / 255) * plotW;
  const toY = (y: number) => pad + plotH - (y / 255) * plotH;

  const pts = hist.map((v, i) => `${toX(i)},${pad + plotH - (v / maxV) * plotH}`).join(' ');

  const A = { x: toX(p1.inVal), y: toY(p1.outVal) };
  const B = { x: toX(p2.inVal), y: toY(p2.outVal) };
  const L = { x: toX(0), y: A.y };
  const R = { x: toX(255), y: B.y };

  return (
    <div className="hist-wrap">
      <div className="hist-title">{label}</div>
      <svg className="hist-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        <rect x={pad} y={pad} width={plotW} height={plotH} className="hist-frame" />
        {hist.length > 0 && <polyline points={pts} className="hist-line" />}
        <polyline points={`${L.x},${L.y} ${A.x},${A.y}`} className="curve-line" />
        <polyline points={`${A.x},${A.y} ${B.x},${B.y}`} className="curve-line" />
        <polyline points={`${B.x},${B.y} ${R.x},${R.y}`} className="curve-line" />
        <circle cx={A.x} cy={A.y} r={4} className="curve-point" />
        <circle cx={B.x} cy={B.y} r={4} className="curve-point" />
      </svg>
    </div>
  );
}

const CurvesPanel: React.FC<Props> = ({
  layer,
  isGB7: isGB7Prop,
  onApply,
  onCommit,
  onClose,
  onPreviewChange,
}) => {
  const isGB7 = isGB7Prop ?? detectGB7(layer);
  const tabs: Channel[] = isGB7 ? ['Gray', 'A'] : ['R', 'G', 'B', 'A'];

  const [chan, setChan] = useState<Channel>(isGB7 ? 'Gray' : 'R');
  useEffect(() => {
    if (!tabs.includes(chan)) setChan(tabs[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGB7]);

  const [state, setState] = useState<Record<Channel, CurvePair>>({
    R: identity(),
    G: identity(),
    B: identity(),
    A: identity(),
    Gray: identity(),
  });
  const cur = state[chan];
  const setCur = (patch: Partial<CurvePair>) =>
    setState((p) => ({ ...p, [chan]: { ...p[chan], ...patch } as CurvePair }));

  const [preview, setPreview] = useState(false);

  const hists = React.useMemo(() => {
    const empty = { R: [], G: [], B: [], A: [], Gray: [] as number[] };
    if (!layer || (layer as any).type !== 'image') return empty;

    const img = (layer as any).imageData as ImageData;
    if (!img || !img.data || img.data.length === 0) return empty;

    if (isGB7) {
      return {
        ...empty,
        Gray: buildGrayHist(img),
        A: buildChHist(img, 3),
      };
    }
    return {
      ...empty,
      R: buildChHist(img, 0),
      G: buildChHist(img, 1),
      B: buildChHist(img, 2),
      A: buildChHist(img, 3),
    };
  }, [isGB7, (layer as any)?.imageData]);

  const debouncedApply = useDebouncedCallback(() => {
    if (!layer || (layer as any).type !== 'image' || !preview) return;
    const luts = buildAllLUTs(state, isGB7);
    onApply(luts, targetFor(chan));
  }, 180);

  useEffect(() => {
    debouncedApply();
  }, [state, preview, chan, isGB7, debouncedApply]);

  const title = chan === 'A' ? 'Альфа-канал' : chan === 'Gray' ? 'Серый канал' : `Канал ${chan}`;

  return (
    <div className="curves-panel panel-card">
      <div className="panel-header curves-header">
        <div>Градационная коррекция</div>
        <button className="icon-btn close-btn" onClick={onClose} aria-label="Закрыть">
          ×
        </button>
      </div>

      <div className="tabs">
        {tabs.map((c) => (
          <button
            key={c}
            className={`tab ${chan === c ? 'active' : ''}`}
            onClick={() => setChan(c)}
          >
            {c === 'A' ? 'Alpha' : c}
          </button>
        ))}
      </div>

      <div className="panel-body wide">
        <HistogramWithCurve hist={hists[chan] || []} p1={cur.p1} p2={cur.p2} label={title} />
        <div className="grid-2x2 full">
          <label className="field">
            <span>In1:</span>
            <input
              type="number"
              min={0}
              max={255}
              step={1}
              value={cur.p1.inVal}
              onChange={(e) => {
                const v = clamp(+e.target.value, 0, 255);
                const fixed = v > cur.p2.inVal ? cur.p2.inVal : v;
                setCur({ p1: { ...cur.p1, inVal: fixed } });
              }}
              onBlur={(e) =>
                (e.currentTarget.value = String(clamp(+e.currentTarget.value, 0, 255)))
              }
            />
          </label>
          <label className="field">
            <span>Out1:</span>
            <input
              type="number"
              min={0}
              max={255}
              step={1}
              value={cur.p1.outVal}
              onChange={(e) => setCur({ p1: { ...cur.p1, outVal: clamp255(+e.target.value) } })}
              onBlur={(e) => (e.currentTarget.value = String(clamp255(+e.currentTarget.value)))}
            />
          </label>
          <label className="field">
            <span>In2:</span>
            <input
              type="number"
              min={0}
              max={255}
              step={1}
              value={cur.p2.inVal}
              onChange={(e) => {
                const v = clamp(+e.target.value, 0, 255);
                const fixed = v < cur.p1.inVal ? cur.p1.inVal : v;
                setCur({ p2: { ...cur.p2, inVal: fixed } });
              }}
              onBlur={(e) =>
                (e.currentTarget.value = String(clamp(+e.currentTarget.value, 0, 255)))
              }
            />
          </label>
          <label className="field">
            <span>Out2:</span>
            <input
              type="number"
              min={0}
              max={255}
              step={1}
              value={cur.p2.outVal}
              onChange={(e) => setCur({ p2: { ...cur.p2, outVal: clamp255(+e.target.value) } })}
              onBlur={(e) => (e.currentTarget.value = String(clamp255(+e.currentTarget.value)))}
            />
          </label>
        </div>

        <label className="chk">
          <input
            type="checkbox"
            checked={preview}
            onChange={(e) => {
              const enabled = e.target.checked;
              setPreview(enabled);
              const luts = buildAllLUTs(state, isGB7);
              if (enabled) onPreviewChange?.(true, luts, targetFor(chan));
              else onPreviewChange?.(false);
            }}
          />
          Предпросмотр
        </label>

        <div className="footer-actions">
          <button className="btn" onClick={onClose}>
            Закрыть
          </button>
          <button className="btn ghost" onClick={() => setCur(identity())}>
            Сбросить
          </button>
          <button
            className="btn primary"
            onClick={() => {
              const luts = buildAllLUTs(state, isGB7);
              onCommit(luts, targetFor(chan));

              onPreviewChange?.(false);
              setPreview(false);
              setState((s) => ({ ...s, [chan]: identity() }));
            }}
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  );
};

export default CurvesPanel;

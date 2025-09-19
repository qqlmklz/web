import { useEffect, useMemo, useRef, useState } from 'react';
import { convolve3x3, Kernel3x3 } from '../../helpers/filters/convolution';
import { KernelName, Kernels } from '../../helpers/filters/kernels';
import './KernelModal.css';

type Props = {
  open: boolean;
  onClose: () => void;
  src: ImageData | null;
  onApply: (result: ImageData, target: 'rgb' | 'alpha') => void;
};

export default function KernelModal({ open, onClose, src, onApply }: Props) {
  const dlgRef = useRef<HTMLDialogElement>(null);
  const [preset, setPreset] = useState<KernelName>('Identity');
  const [cells, setCells] = useState<number[]>(Kernels.Identity.slice());
  const [preview, setPreview] = useState<boolean>(true);
  const [target, setTarget] = useState<'rgb' | 'alpha'>('rgb');

  useEffect(() => {
    const dlg = dlgRef.current;
    if (!dlg) return;
    if (open) {
      dlg.showModal();
      reset();
    } else if (dlg.open) dlg.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function reset() {
    setPreset('Identity');
    setCells(Kernels.Identity.slice());
    setPreview(true);
  }

  function applyPreset(name: KernelName) {
    setPreset(name);
    setCells(Kernels[name].slice());
  }

  function setCell(i: number, v: number) {
    setCells((prev) => {
      const next = prev.slice();
      next[i] = v;
      return next;
    });
  }

  const previewData = useMemo(() => {
    if (!src || !preview) return null;
    return convolve3x3(src, cells as Kernel3x3, { target, normalize: undefined });
  }, [src, cells, preview, target]);

  return (
    <dialog ref={dlgRef} className="kernelDialog">
      <div className="kernelWrap">
        <h3 className="kernelTitle">Kernel filter</h3>

        <div className="kernelTargetRow">
          <label className="kernelTargetHint">Target:</label>
          <label className="kernelRadioLbl">
            <input
              type="radio"
              name="tgt"
              checked={target === 'rgb'}
              onChange={() => setTarget('rgb')}
            />{' '}
            RGB
          </label>
          <label className="kernelRadioLbl">
            <input
              type="radio"
              name="tgt"
              checked={target === 'alpha'}
              onChange={() => setTarget('alpha')}
            />{' '}
            Alpha
          </label>
        </div>

        <div className="kernelGrid">
          <div>
            <label className="kernelSubLabel">Preset</label>
            <select
              value={preset}
              onChange={(e) => applyPreset(e.target.value as KernelName)}
              className="kernelSelect"
            >
              {Object.keys(Kernels).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            <div className="kernelCellsGrid">
              {cells.map((v, i) => (
                <input
                  key={i}
                  type="number"
                  step="0.1"
                  value={v}
                  onChange={(e) => setCell(i, parseFloat(e.target.value || '0'))}
                  className="kernelCellInput"
                />
              ))}
            </div>

            <label className="kernelPreviewToggle">
              <input
                type="checkbox"
                checked={preview}
                onChange={(e) => setPreview(e.target.checked)}
              />
              Preview
            </label>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <label className="kernelSubLabel">
              Preview ({target === 'alpha' ? 'Alpha' : 'RGB'})
            </label>
            <div className="kernelPreviewBox">
              <canvas
                ref={(node) => {
                  if (!node) return;
                  const ctx = node.getContext('2d');
                  if (!ctx) return;
                  const w = 240,
                    h = 240;
                  node.width = w;
                  node.height = h;
                  if (!src) {
                    ctx.clearRect(0, 0, w, h);
                    return;
                  }
                  const img = preview && previewData ? previewData : src;
                  (ctx as any).imageSmoothingEnabled = false;
                  const off = document.createElement('canvas');
                  off.width = img.width;
                  off.height = img.height;
                  off.getContext('2d')!.putImageData(img, 0, 0);
                  ctx.clearRect(0, 0, w, h);
                  ctx.drawImage(off, 0, 0, w, h);
                }}
              />
            </div>
          </div>
        </div>

        <div className="kernelActions">
          <button onClick={reset} className="btn">
            Reset
          </button>
          <button onClick={onClose} className="btn btnSecondary">
            Close
          </button>
          <button
            className="btn btnPrimary"
            onClick={() => {
              if (!src) return;
              const result = convolve3x3(src, cells as Kernel3x3, {
                target,
                normalize: undefined,
              });
              onApply(result, target);
              onClose();
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </dialog>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { InterpolationMethod, getInterpolationHint } from '../../helpers/resample/interpolation';
import './ScaleModal.css';

type Units = 'pixels' | 'percent';

interface Props {
  open: boolean;
  onClose: () => void;
  originW: number;
  originH: number;
  defaultMethod?: InterpolationMethod;
  onApply: (nextW: number, nextH: number, method: InterpolationMethod) => void;
}

export default function ScaleModal({
  open,
  onClose,
  originW,
  originH,
  defaultMethod = 'bilinear',
  onApply,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  const [units, setUnits] = useState<Units>('pixels');
  const [lockRatio, setLockRatio] = useState<boolean>(true);
  const [method, setMethod] = useState<InterpolationMethod>(defaultMethod);

  const [wPx, setWPx] = useState<number>(originW);
  const [hPx, setHPx] = useState<number>(originH);
  const [wPct, setWPct] = useState<number>(100);
  const [hPct, setHPct] = useState<number>(100);

  const ratio = useMemo(() => (originH ? originW / originH : 1), [originW, originH]);

  useEffect(() => {
    if (!ref.current) return;
    if (open && !ref.current.open) ref.current.showModal();
    if (!open && ref.current.open) ref.current.close();
  }, [open]);

  useEffect(() => {
    if (!lockRatio) return;
    if (units === 'pixels') {
      const nextHPx = Math.max(1, Math.round(wPx / ratio));
      if (nextHPx !== hPx) setHPx(nextHPx);
    } else {
      const nextHPct = Math.max(1, Math.round((hPx / originH) * 100));
      const nextWPct = Math.max(1, Math.round((wPx / originW) * 100));

      if (wPct !== nextWPct) setWPct(nextWPct);
      if (hPct !== nextHPct) setHPct(nextHPct);
    }
  }, [wPx, lockRatio, ratio]); // eslint-disable-line

  const beforeMP = (originW * originH) / 1_000_000;
  const [afterW, afterH] = useMemo(() => {
    return units === 'pixels'
      ? [wPx, hPx]
      : [
          Math.max(1, Math.round((originW * wPct) / 100)),
          Math.max(1, Math.round((originH * hPct) / 100)),
        ];
  }, [units, wPx, hPx, wPct, hPct, originW, originH]);
  const afterMP = (afterW * afterH) / 1_000_000;

  const validate = (): string | null => {
    if (afterW < 1 || afterH < 1) return 'Ширина/высота должны быть ≥ 1';
    if (afterW > 20000 || afterH > 20000) return 'Слишком большие значения (макс. 20000 px)';
    if (units === 'percent' && (wPct < 12 || hPct < 12 || wPct > 300 || hPct > 300))
      return 'Для процентов допустимо 12–300%';
    return null;
  };

  const error = validate();

  return (
    <dialog ref={ref} className="scale-modal" onClose={onClose}>
      <form method="dialog" className="scale-modal__content" onSubmit={(e) => e.preventDefault()}>
        <header className="scale-modal__header">
          <h3>Изменение размера изображения</h3>
          <button
            type="button"
            className="scale-modal__close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </header>

        <section className="scale-modal__grid">
          <div className="scale-row">
            <div className="scale-label">Пикселей ДО:</div>
            <div className="scale-value">
              {beforeMP.toFixed(2)} МП ({originW}×{originH})
            </div>
          </div>
          <div className="scale-row">
            <div className="scale-label">Пикселей ПОСЛЕ:</div>
            <div className="scale-value">
              {afterMP.toFixed(2)} МП ({afterW}×{afterH})
            </div>
          </div>

          <div className="scale-row">
            <div className="scale-label">Единицы:</div>
            <div className="scale-field">
              <select value={units} onChange={(e) => setUnits(e.target.value as Units)}>
                <option value="pixels">px</option>
                <option value="percent">%</option>
              </select>
            </div>
          </div>

          {units === 'pixels' ? (
            <>
              <div className="scale-row">
                <div className="scale-label">Ширина (px):</div>
                <div className="scale-field">
                  <input
                    type="number"
                    min={1}
                    max={20000}
                    value={wPx}
                    onChange={(e) => setWPx(Math.max(1, Math.round(+e.target.value || 0)))}
                  />
                </div>
              </div>
              <div className="scale-row">
                <div className="scale-label">Высота (px):</div>
                <div className="scale-field">
                  <input
                    type="number"
                    min={1}
                    max={20000}
                    value={hPx}
                    onChange={(e) => setHPx(Math.max(1, Math.round(+e.target.value || 0)))}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="scale-row">
                <div className="scale-label">Ширина (%):</div>
                <div className="scale-field">
                  <input
                    type="number"
                    min={12}
                    max={300}
                    value={wPct}
                    onChange={(e) =>
                      setWPct(Math.max(12, Math.min(300, Math.round(+e.target.value || 0))))
                    }
                  />
                </div>
              </div>
              <div className="scale-row">
                <div className="scale-label">Высота (%):</div>
                <div className="scale-field">
                  <input
                    type="number"
                    min={12}
                    max={300}
                    value={hPct}
                    onChange={(e) =>
                      setHPct(Math.max(12, Math.min(300, Math.round(+e.target.value || 0))))
                    }
                  />
                </div>
              </div>
            </>
          )}

          <div className="scale-row">
            <div className="scale-label">Сохранять пропорции:</div>
            <div className="scale-field">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={lockRatio}
                  onChange={() => setLockRatio(!lockRatio)}
                />
                <span>Заблокировать W/H</span>
              </label>
            </div>
          </div>

          <div className="scale-row">
            <div className="scale-label">Интерполяция:</div>
            <div className="scale-field">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as InterpolationMethod)}
              >
                <option value="bilinear">Билинейная (по умолчанию)</option>
                <option value="nearest">Ближайший сосед</option>
              </select>
              <span className="hint" title={getInterpolationHint(method)}>
                ⓘ
              </span>
            </div>
          </div>
        </section>

        {error && <div className="scale-error">{error}</div>}

        <footer className="scale-modal__footer">
          <button type="button" onClick={onClose}>
            Отмена
          </button>
          <button type="button" disabled={!!error} onClick={() => onApply(afterW, afterH, method)}>
            Применить
          </button>
        </footer>
      </form>
    </dialog>
  );
}

import { ArrowDown, ArrowUp, Eye, EyeOff, Layers as LayersIcon, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppLayer, BlendMode } from '../../types/layers';
import AlphaPreview from './AlphaPreview';
import LayerPreview from './LayerPreview';
import './LayersPanel.css';

const BLEND_DESCR: Record<BlendMode, string> = {
  normal: 'Верхний слой поверх нижнего с учётом непрозрачности.',
  multiply: 'Перемножение каналов: затемняет. Белый не влияет.',
  screen: 'Осветление: чёрный не влияет, белый доминирует.',
  overlay: 'Комбо multiply/screen: тени темнее, света светлее.',
};

function useDebouncedCallback<T extends (...args: any[]) => void>(cb: T, delay = 180) {
  const cbRef = useRef(cb);
  cbRef.current = cb;
  const timer = useRef<number | null>(null);
  return useMemo(
    () =>
      (...args: Parameters<T>) => {
        if (timer.current != null) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => cbRef.current(...args), delay) as unknown as number;
      },
    [delay]
  );
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function ColorLayerControls({
  layerId,
  rgb,
  onSetColor,
}: {
  layerId: string;
  rgb: { r: number; g: number; b: number };
  onSetColor: (id: string, color: { r: number; g: number; b: number; a?: number }) => void;
}) {
  const [localHex, setLocalHex] = useState(rgbToHex(rgb));
  useEffect(() => setLocalHex(rgbToHex(rgb)), [rgb.r, rgb.g, rgb.b]);

  const debouncedApply = useDebouncedCallback((id: string, hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    onSetColor(id, { r, g, b, a: 255 });
  }, 180);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        type="color"
        value={localHex}
        onChange={(e) => {
          const hex = e.target.value;
          setLocalHex(hex);
          debouncedApply(layerId, hex);
        }}
        style={{ width: 36, height: 24, padding: 0, border: 'none', background: 'transparent' }}
      />
      <span
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 12,
          color: '#64748b',
        }}
      >
        {localHex.toUpperCase()}
      </span>
    </div>
  );
}

type Props = {
  layers: AppLayer[];
  activeId: string | null;
  canAddMore: boolean;

  onAddLayer: () => void;
  onSetActive: (id: string) => void;
  onReorder: (id: string, dir: 'up' | 'down') => void;
  onToggleVisible: (id: string) => void;
  onRemove: (id: string) => void;
  onOpacity: (id: string, val01: number) => void;
  onBlend: (id: string, bm: BlendMode) => void;
  onToggleAlphaHidden: (id: string) => void;
  onRemoveAlpha: (id: string) => void;
  onSetColor: (id: string, color: { r: number; g: number; b: number; a?: number }) => void;
  onAddImageLayer?: (file: File) => void;
};

export default function LayersPanel({
  layers,
  activeId,
  canAddMore,
  onAddLayer,
  onSetActive,
  onReorder,
  onToggleVisible,
  onRemove,
  onOpacity,
  onBlend,
  onToggleAlphaHidden,
  onRemoveAlpha,
  onSetColor,
  onAddImageLayer,
}: Props) {
  return (
    <aside className="layers-panel">
      <div className="layers-panel__header">
        <div className="layers-panel__title">
          <LayersIcon size={16} /> Layers
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            type="button"
            onClick={onAddLayer}
            disabled={!canAddMore}
            title="Добавить слой-заливку"
          >
            + Цвет
          </button>

          {(() => {
            const fileRef = useRef<HTMLInputElement | null>(null);
            return (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.gb7"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.currentTarget.files?.[0];
                    if (f && onAddImageLayer) onAddImageLayer(f);
                    if (fileRef.current) fileRef.current.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={!canAddMore}
                  title="Добавить слой-картинку (PNG/JPG/GB7)"
                >
                  + Картинка…
                </button>
              </>
            );
          })()}
        </div>
      </div>

      <div className="layers-list">
        {layers.map((layer, i) => {
          const isActive = layer.id === activeId;
          return (
            <div
              key={layer.id}
              className={`layer-card ${isActive ? 'is-active' : ''}`}
              onClick={() => onSetActive(layer.id)}
            >
              <div className="layer-card__top">
                <div className="layer-card__left">
                  <LayerPreview layer={layer} />
                  <div className="name" title={layer.name}>
                    {layer.name}
                  </div>
                </div>

                <div className="layer-card__right">
                  <button
                    className="icon-btn"
                    title="Вверх"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReorder(layer.id, 'up');
                    }}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    className="icon-btn"
                    title="Вниз"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReorder(layer.id, 'down');
                    }}
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    className="icon-btn"
                    title={layer.visible ? 'Скрыть слой' : 'Показать слой'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisible(layer.id);
                    }}
                  >
                    {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button
                    className="icon-btn danger"
                    title="Удалить слой"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(layer.id);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="layer-card__row">
                <label>Opacity: {Math.round(layer.opacity * 100)}%</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(layer.opacity * 100)}
                  onChange={(e) => onOpacity(layer.id, Number(e.target.value) / 100)}
                />
              </div>

              <div className="layer-card__row">
                <label title={BLEND_DESCR[layer.blendMode]}>Blend mode</label>
                <select
                  value={layer.blendMode}
                  onChange={(e) => onBlend(layer.id, e.target.value as BlendMode)}
                  title={BLEND_DESCR[layer.blendMode]}
                >
                  <option value="normal">normal</option>
                  <option value="multiply">multiply</option>
                  <option value="screen">screen</option>
                  <option value="overlay">overlay</option>
                </select>
              </div>

              {layer.type === 'color' && (
                <ColorLayerControls
                  layerId={layer.id}
                  rgb={{ r: layer.color.r, g: layer.color.g, b: layer.color.b }}
                  onSetColor={onSetColor}
                />
              )}

              {layer.hasAlpha && (
                <div className="layer-card__row layer-card__row--split">
                  {layer.type === 'image' && (
                    <div style={{ marginTop: 8, marginBottom: 8 }}>
                      <AlphaPreview layer={layer} />
                    </div>
                  )}

                  <label>
                    <input
                      type="checkbox"
                      checked={layer.alphaHidden}
                      onChange={() => onToggleAlphaHidden(layer.id)}
                    />
                    <span>Скрыть альфу</span>
                  </label>

                  <button
                    className="btn btn-ghost"
                    title="Удалить альфу (заполнить белым)"
                    onClick={() => onRemoveAlpha(layer.id)}
                  >
                    Удалить альфу
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

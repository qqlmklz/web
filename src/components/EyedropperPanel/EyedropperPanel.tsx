import { apcaContrast, wcagContrast } from '../../helpers/color/contrast';
import type { PickInfo } from '../../types/Color';
import './EyedropperPanel.css';

const Space = ({ name, tip }: { name: string; tip: string }) => (
  <span className="space" title={tip}>
    {name}
  </span>
);

export default function EyedropperPanel({ a, b }: { a: PickInfo | null; b: PickInfo | null }) {
  const contrast = a && b ? wcagContrast(a.rgb, b.rgb) : null;
  const apca = a && b ? apcaContrast(a.rgb, b.rgb) : null;

  return (
    <div className="eyedropper-panel">
      <div className="title">Пипетка: два цвета</div>

      {!a && !b && (
        <div className="hint">
          Кликните по изображению чтобы выбрать первый цвет. Удерживайте Alt/Ctrl/Shift для выбора
          второго.
        </div>
      )}

      <div className="rows">
        {a && <ColorBlock title="Цвет A" info={a} />}
        {b && <ColorBlock title="Цвет B" info={b} />}
      </div>

      <div className="contrast">
        <b>Контраст (WCAG 2.x): </b>
        {contrast ? (
          <span>
            {contrast.toFixed(2)}:1 {contrast < 4.5 ? '— недостаточно' : '— OK'}
          </span>
        ) : (
          <span>выберите два цвета</span>
        )}
      </div>

      {a && b && <div className="apca">APCA (черновой): {apca!.toFixed(3)}</div>}

      <div className="legend">
        <Space name="RGB" tip="Красный/Зелёный/Синий, 0–255 (sRGB)." />
        <Space name="XYZ" tip="Тристимульные значения относительно D65. Линейное пространство." />
        <Space name="Lab" tip="L (0–100) светлота, a — зелёный/красный, b — синий/жёлтый." />
        <Space
          name="OKLch"
          tip="Oklab в полярной форме: L (0–1), C — насыщенность, h — угол 0–360°."
        />
      </div>
    </div>
  );
}

function ColorBlock({ title, info }: { title: string; info: PickInfo }) {
  const s = `rgb(${info.rgb.r},${info.rgb.g},${info.rgb.b})`;
  return (
    <div className="color-block">
      <div className="swatch" style={{ background: s }} />
      <div className="meta">
        <div className="meta-title">{title}</div>
        <div className="row">
          Коорд.: x={info.xy.x}, y={info.xy.y}
          {typeof info.gb7 === 'number' ? ` · GB7=${info.gb7}` : ''}
        </div>
        <div className="row">
          RGB: {info.rgb.r}, {info.rgb.g}, {info.rgb.b}
        </div>
        <div className="row">
          XYZ: {info.xyz.X.toFixed(4)}, {info.xyz.Y.toFixed(4)}, {info.xyz.Z.toFixed(4)}
        </div>
        <div className="row">
          Lab: L={info.lab.L.toFixed(2)}, a={info.lab.a.toFixed(2)}, b={info.lab.b.toFixed(2)}
        </div>
        <div className="row">
          OKLch: L={info.oklch.L.toFixed(4)}, C={info.oklch.C.toFixed(4)}, h=
          {info.oklch.h.toFixed(1)}°
        </div>
      </div>
    </div>
  );
}

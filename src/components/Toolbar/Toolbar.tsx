import { Hand, Pipette, Spline, Upload } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { Tool } from '../../types/Color';
import './Toolbar.css';

type Props = {
  tool: Tool;
  setTool: (t: Tool) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isCurvesOpen: boolean;
  canOpenCurves: boolean;
  onToggleCurves: () => void;
};

export default function Toolbar({
  tool,
  setTool,
  onFileSelect,
  isCurvesOpen,
  canOpenCurves,
  onToggleCurves,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'h') setTool('hand');
      if (k === 'i') setTool('eyedropper');
      if (k === 'c' && canOpenCurves) onToggleCurves();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setTool, onToggleCurves, canOpenCurves]);

  return (
    <div className="toolbar">
      <button
        title="Загрузить изображение (PNG, JPG, GB7)"
        className="tool-btn"
        onClick={() => fileRef.current?.click()}
      >
        <Upload size={16} />
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".jpg,.jpeg,.png,.gb7"
        onChange={onFileSelect}
        style={{ display: 'none' }}
      />

      <button
        title="Рука (H): перемещать изображение мышью или стрелками"
        aria-pressed={tool === 'hand'}
        className={`tool-btn ${tool === 'hand' ? 'active' : ''}`}
        onClick={() => setTool('hand')}
      >
        <Hand size={16} />
      </button>

      <button
        title="Пипетка (I): клик — цвет A, Alt/Ctrl/Shift — цвет B"
        aria-pressed={tool === 'eyedropper'}
        className={`tool-btn ${tool === 'eyedropper' ? 'active' : ''}`}
        onClick={() => setTool('eyedropper')}
      >
        <Pipette size={16} />
      </button>

      <button
        title={canOpenCurves ? 'Кривые (C): открыть панель' : 'Кривые недоступны — нет изображения'}
        aria-pressed={isCurvesOpen}
        className={`tool-btn ${isCurvesOpen ? 'active' : ''} ${!canOpenCurves ? 'disabled' : ''}`}
        onClick={() => canOpenCurves && onToggleCurves()}
      >
        <Spline size={16} />
      </button>
    </div>
  );
}

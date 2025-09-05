import { Hand, Pipette } from 'lucide-react';
import { useEffect } from 'react';
import type { Tool } from '../../types/Color';
import './Toolbar.css';

type Props = { tool: Tool; setTool: (t: Tool) => void };

export default function Toolbar({ tool, setTool }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'h') setTool('hand');
      if (e.key.toLowerCase() === 'i') setTool('eyedropper');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setTool]);

  return (
    <div className="toolbar">
      <button
        title="Рука (H): перемещать изображение мышью или стрелками"
        aria-pressed={tool === 'hand'}
        className={`tool-btn ${tool === 'hand' ? 'active' : ''}`}
        onClick={() => setTool('hand')}
      >
        <Hand size={18} />
      </button>

      <button
        title="Пипетка (I): клик — цвет A, Alt/Ctrl/Shift — цвет B"
        aria-pressed={tool === 'eyedropper'}
        className={`tool-btn ${tool === 'eyedropper' ? 'active' : ''}`}
        onClick={() => setTool('eyedropper')}
      >
        <Pipette size={18} />
      </button>
    </div>
  );
}

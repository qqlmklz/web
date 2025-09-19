import { useEffect, useRef, useState } from 'react';

type ExportFormat = 'png' | 'jpg' | 'gb7';

type Props = {
  open: boolean;
  onClose: () => void;
  onExport: (format: ExportFormat, jpgQuality: number) => void;
};

export default function ExportModal({ open, onClose, onExport }: Props) {
  const [format, setFormat] = useState<ExportFormat>('png');
  const [jpgQuality, setJpgQuality] = useState(92); // 1..100
  const dlgRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dlg = dlgRef.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  return (
    <dialog ref={dlgRef} style={{ padding: 0, border: 'none', borderRadius: 12, width: 360 }}>
      <div style={{ padding: 16, minWidth: 320 }}>
        <h3 style={{ margin: '0 0 12px' }}>Экспорт изображения</h3>

        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="radio"
              name="fmt"
              checked={format === 'png'}
              onChange={() => setFormat('png')}
            />
            <span>PNG (с альфой)</span>
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="radio"
              name="fmt"
              checked={format === 'jpg'}
              onChange={() => setFormat('jpg')}
            />
            <span>JPG (без альфы)</span>
          </label>
          {format === 'jpg' && (
            <div style={{ marginLeft: 26 }}>
              <label style={{ fontSize: 12, color: '#555' }}>
                Качество: {jpgQuality}%
                <input
                  type="range"
                  min={40}
                  max={100}
                  step={1}
                  value={jpgQuality}
                  onChange={(e) => setJpgQuality(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </label>
            </div>
          )}
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="radio"
              name="fmt"
              checked={format === 'gb7'}
              onChange={() => setFormat('gb7')}
            />
            <span>GB7 (7-бит серый + 1-бит маска)</span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: '8px 12px' }}>
            Отмена
          </button>
          <button
            onClick={() => onExport(format, jpgQuality / 100)}
            style={{
              padding: '8px 12px',
              background: '#1677ff',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
            }}
          >
            Скачать
          </button>
        </div>
      </div>
    </dialog>
  );
}

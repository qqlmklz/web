import { Expand } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import { getColorDepth } from './canvas/getColorDepth';
import { renderGrayBit7 } from './canvas/renderGrayBit7';
import EyedropperPanel from './components/EyedropperPanel/EyedropperPanel';
import ImageUploader from './components/ImageUploader/ImageUploader';
import ScaleModal from './components/ScaleModal/ScaleModal';
import StatusBar from './components/StatusBar/StatusBar';
import Toolbar from './components/Toolbar/Toolbar';
import { readGrayBit7 } from './parsers/readGrayBit7';
import type { PickInfo, RGB, Tool } from './types/Color';
import { AppImageData } from './types/ImageData';
import { gb7ToRgb, rgbToOKLch, rgbToXyz, xyzToLab } from './utils/color';
import { clampXY, eventToCanvasXY } from './utils/coords';

type Kind = 'RGB' | 'GB7';
type AppStateImage = Partial<AppImageData> & {
  kind?: Kind;
  pixels?: Uint8Array | number[];
};

const App = () => {
  const [isScaleOpen, setIsScaleOpen] = useState(false);
  const [imageData, setImageData] = useState<AppStateImage>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const srcImgRef = useRef<HTMLImageElement | null>(null); // для PNG/JPEG
  const gb7DataRef = useRef<AppImageData | null>(null); // для GB7 (сырые данные)
  const offscreenRef = useRef<HTMLCanvasElement | null>(null); // оффскрин под GB7

  const [tool, setTool] = useState<Tool>('hand');
  const [pickA, setPickA] = useState<PickInfo | null>(null);
  const [pickB, setPickB] = useState<PickInfo | null>(null);

  const [scale, setScale] = useState(1);
  const imgViewRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ drag: false, startX: 0, startY: 0 });

  // ========================= helpers =========================

  function centerCanvasInView() {
    const view = imgViewRef.current;
    const canvas = canvasRef.current;
    if (!view || !canvas) return;

    const targetLeft = Math.max(0, (canvas.scrollWidth - view.clientWidth) / 2);
    const targetTop = Math.max(0, (canvas.scrollHeight - view.clientHeight) / 2);
    view.scrollLeft = targetLeft;
    view.scrollTop = targetTop;
  }

  function redrawCanvas() {
    const canvas = canvasRef.current;
    if (!canvas || !imageData.width || !imageData.height) return;

    const targetW = Math.max(1, Math.round(imageData.width * scale));
    const targetH = Math.max(1, Math.round(imageData.height * scale));

    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, targetW, targetH);

    if (imageData.kind === 'RGB' && srcImgRef.current) {
      ctx.drawImage(srcImgRef.current, 0, 0, targetW, targetH);
    } else if (imageData.kind === 'GB7' && gb7DataRef.current) {
      if (!offscreenRef.current) offscreenRef.current = document.createElement('canvas');
      const off = offscreenRef.current;
      off.width = gb7DataRef.current.width!;
      off.height = gb7DataRef.current.height!;
      renderGrayBit7(off, gb7DataRef.current);
      const octx = off.getContext('2d')!;
      octx.imageSmoothingEnabled = false;

      ctx.drawImage(off, 0, 0, off.width, off.height, 0, 0, targetW, targetH);
    }
  }

  // ========================= загрузка файлов =========================

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    if (file.type === 'image/png' || file.type === 'image/jpeg') {
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          srcImgRef.current = img;
          gb7DataRef.current = null;

          setImageData({
            width: img.width,
            height: img.height,
            depth: getColorDepth(img),
            kind: 'RGB',
          });

          setScale(1);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    } else if (file.name.endsWith('.gb7')) {
      reader.onload = () => {
        const data = readGrayBit7(reader.result as ArrayBuffer);
        if (data) {
          srcImgRef.current = null;
          gb7DataRef.current = data;

          setImageData({
            ...data,
            kind: 'GB7',
            pixels: (data as any).pixels as Uint8Array | undefined,
          });

          setScale(1);
        } else {
          alert('Invalid GrayBit-7 file');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert('Unsupported file format!');
    }
  };

  // ========================= пипетка =========================

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== 'eyedropper' || !imageData.width || !imageData.height) return;
    const canvas = canvasRef.current!;
    const { x, y } = clampXY(
      ...(Object.values(eventToCanvasXY(e.nativeEvent, canvas)) as [number, number]),
      canvas.width,
      canvas.height
    );

    const srcX = Math.max(0, Math.min(imageData.width - 1, Math.floor(x / scale)));
    const srcY = Math.max(0, Math.min(imageData.height - 1, Math.floor(y / scale)));

    const ctx = canvas.getContext('2d')!;
    const d = ctx.getImageData(x, y, 1, 1).data; // читаем из отображённого канваса
    let rgb: RGB = { r: d[0], g: d[1], b: d[2] };
    let gb7: number | undefined;

    if (imageData.kind === 'GB7' && imageData.pixels && imageData.width) {
      const idx = srcY * imageData.width + srcX;
      const arr = imageData.pixels as Uint8Array | number[];
      gb7 = typeof arr[idx] === 'number' ? Number(arr[idx]) : undefined;
      if (typeof gb7 === 'number') {
        rgb = gb7ToRgb(gb7);
      }
    }

    const xyz = rgbToXyz(rgb);
    const lab = xyzToLab(xyz);
    const oklch = rgbToOKLch(rgb);
    const info: PickInfo = { xy: { x: srcX, y: srcY }, rgb, xyz, lab, oklch, gb7 };

    if (e.nativeEvent.altKey || e.nativeEvent.ctrlKey || e.nativeEvent.shiftKey) {
      setPickB(info);
    } else {
      setPickA(info);
    }
  };

  // ========================= drag-to-scroll («рука») =========================

  const onImgViewMouseDown = (e: React.MouseEvent) => {
    if (tool !== 'hand' || !imgViewRef.current) return;
    dragRef.current.drag = true;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    imgViewRef.current.style.cursor = 'grabbing';
  };

  const onImgViewMouseUp = () => {
    dragRef.current.drag = false;
    if (imgViewRef.current) imgViewRef.current.style.cursor = 'auto';
  };

  const onImgViewMouseLeave = () => {
    dragRef.current.drag = false;
    if (imgViewRef.current) imgViewRef.current.style.cursor = 'auto';
  };

  const onImgViewMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.drag || !imgViewRef.current) return;
    e.preventDefault();
    const el = imgViewRef.current;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;

    el.scrollLeft -= dx;
    el.scrollTop -= dy;
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (tool !== 'hand' || !imgViewRef.current) return;
      const el = imgViewRef.current;
      const step = 48;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
      if (e.key === 'ArrowLeft') el.scrollLeft -= step;
      if (e.key === 'ArrowRight') el.scrollLeft += step;
      if (e.key === 'ArrowUp') el.scrollTop -= step;
      if (e.key === 'ArrowDown') el.scrollTop += step;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tool]);

  // ========================= эффекты перерисовки/центрирования =========================

  useEffect(() => {
    redrawCanvas();
    requestAnimationFrame(centerCanvasInView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageData.width, imageData.height, imageData.kind, scale]);

  useEffect(() => {
    const onResize = () => centerCanvasInView();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ========================= render =========================

  return (
    <div>
      <Toolbar tool={tool} setTool={setTool} />

      <div
        ref={imgViewRef}
        className="img-view"
        onMouseDown={onImgViewMouseDown}
        onMouseMove={onImgViewMouseMove}
        onMouseUp={onImgViewMouseUp}
        onMouseLeave={onImgViewMouseLeave}
      >
        {imageData.width && imageData.height && (
          <canvas ref={canvasRef} className="canvas" onClick={onCanvasClick} />
        )}
      </div>

      {!imageData.width && !imageData.height && <ImageUploader onFileSelect={handleFileChange} />}

      <StatusBar
        width={imageData.width}
        height={imageData.height}
        depth={imageData.depth}
        scalePercent={Math.round(scale * 100)}
        onScaleChange={(v) => {
          const s = Math.max(0.12, Math.min(8, v / 100));
          setScale(s);
        }}
      />

      <EyedropperPanel a={pickA} b={pickB} />

      {imageData.width && imageData.height && (
        <button
          style={{
            position: 'fixed',
            right: '16px',
            bottom: '16px',
            width: 56,
            height: 56,
            borderRadius: '50%',
            border: 'none',
            background: '#2b7cff',
            color: '#fff',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setIsScaleOpen(true)}
          title="Изменить размер изображения"
        >
          <Expand size={28} strokeWidth={2.5} />
        </button>
      )}

      {/* модалка */}
      <ScaleModal
        open={isScaleOpen}
        onClose={() => setIsScaleOpen(false)}
        originW={imageData.width || 0}
        originH={imageData.height || 0}
        onApply={(nextW, nextH, method) => {
          console.log('Применить масштаб:', nextW, nextH, method);
          // тут можно вызвать пересчёт изображения
          setIsScaleOpen(false);
        }}
      />
    </div>
  );
};

export default App;

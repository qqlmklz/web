import { Expand } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

import EyedropperPanel from './components/EyedropperPanel/EyedropperPanel';
import LayersPanel from './components/LayersPanel/LayersPanel';
import ScaleModal from './components/ScaleModal/ScaleModal';
import StatusBar from './components/StatusBar/StatusBar';
import Toolbar from './components/Toolbar/Toolbar';

import { renderGrayBit7 } from './canvas/renderGrayBit7';
import { readGrayBit7 } from './parsers/readGrayBit7';

import type { PickInfo, Tool } from './types/Color';
import type { AppImageData } from './types/ImageData';
import type { AppLayer, BlendMode } from './types/layers';

import { gb7ToRgb, rgbToOKLch, rgbToXyz, xyzToLab } from './utils/color';
import { compositeLayers } from './utils/composite';
import { clampXY, eventToCanvasXY } from './utils/coords';

import { burnAlphaToWhite } from './helpers/image/burnAlphaToWhite';
import { currentImageToImageData, hasAlphaForCurrentImage } from './helpers/image/currentImage';
import { stripAlpha } from './helpers/image/stripAlpha';
import {
  makeBaseLayerFromGB7,
  makeBaseLayerFromImg,
  makeImageLayerFittedFromGB7,
  makeImageLayerFittedFromImg,
} from './helpers/layers/makeImageLayer';
import { scaleGB7 } from './helpers/scale/scaleGB7';
import { centerCanvasInView } from './helpers/view/centerCanvasInView';
import { fitScaleForView } from './helpers/view/fitScaleForView';

type Kind = 'RGB' | 'GB7';
type AppStateImage = Partial<AppImageData> & { kind?: Kind; pixels?: Uint8Array | number[] };

const App = () => {
  const [imageData, setImageData] = useState<AppStateImage>({});
  const [layers, setLayers] = useState<AppLayer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('hand');
  const [pickA, setPickA] = useState<PickInfo | null>(null);
  const [pickB, setPickB] = useState<PickInfo | null>(null);
  const [scale, setScale] = useState(1);
  const [isScaleOpen, setIsScaleOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgViewRef = useRef<HTMLDivElement>(null);

  const srcImgRef = useRef<HTMLImageElement | null>(null);
  const gb7DataRef = useRef<AppImageData | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);

  const dragRef = useRef({ drag: false, startX: 0, startY: 0 });

  const showLayers = useMemo(
    () => Boolean(imageData.width && imageData.height) || layers.length > 0,
    [imageData.width, imageData.height, layers.length]
  );

  /** Рисует исходник без композита для первого кадра. */
  const drawOriginalOnce = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageData.width || !imageData.height) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const targetW = Math.max(1, Math.round(imageData.width * scale));
    const targetH = Math.max(1, Math.round(imageData.height * scale));
    canvas.width = targetW;
    canvas.height = targetH;
    ctx.clearRect(0, 0, targetW, targetH);

    if (imageData.kind === 'RGB' && srcImgRef.current) {
      const src = srcImgRef.current;
      const iw = src.naturalWidth || src.width,
        ih = src.naturalHeight || src.height;
      ctx.imageSmoothingEnabled = scale < 1;
      ctx.imageSmoothingQuality = scale < 1 ? 'high' : 'low';
      ctx.drawImage(src, 0, 0, iw, ih, 0, 0, targetW, targetH);
    } else if (imageData.kind === 'GB7' && gb7DataRef.current) {
      const off = document.createElement('canvas');
      off.width = gb7DataRef.current.width!;
      off.height = gb7DataRef.current.height!;
      renderGrayBit7(off, gb7DataRef.current);
      ctx.drawImage(off, 0, 0, off.width, off.height, 0, 0, targetW, targetH);
    }
  };

  /** Сводит слои и рисует результат на канвас. */
  const renderLayersComposite = (layersOverride?: AppLayer[]) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageData.width || !imageData.height) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = imageData.width;
    const height = imageData.height;

    const src = (layersOverride ?? layers).filter((l) => l.visible && l.opacity > 0);

    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));
    if (src.length === 0) {
      canvas.width = targetW;
      canvas.height = targetH;
      ctx.clearRect(0, 0, targetW, targetH);
      return;
    }

    const prepared: AppLayer[] = src.map((layer) => {
      if (layer.type === 'image' && layer.alphaHidden) {
        return { ...layer, imageData: stripAlpha(layer.imageData) };
      }
      return layer;
    });

    const merged = compositeLayers(prepared, width, height);

    const off = document.createElement('canvas');
    off.width = width;
    off.height = height;
    off.getContext('2d')!.putImageData(merged, 0, 0);

    canvas.width = targetW;
    canvas.height = targetH;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, targetW, targetH);
    ctx.drawImage(off, 0, 0, width, height, 0, 0, targetW, targetH);
  };

  /** Решает, чем рисовать (оригинал или композит) и перерисовывает. */
  const redrawCanvas = () => {
    if (layers.length === 0) {
      drawOriginalOnce(); // нет слоёв — рисуем исходную картинку
    } else {
      renderLayersComposite(); // есть слои — ВСЕГДА композит
    }
  };

  /** Загружает PNG/JPEG. */
  const loadRGB = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        srcImgRef.current = img;
        gb7DataRef.current = null;
        setImageData({ width: img.width, height: img.height, depth: 24, kind: 'RGB' });
        setScale(fitScaleForView(imgViewRef.current, img.width, img.height));
        redrawCanvas();
        const baseLayer = makeBaseLayerFromImg(img);
        setLayers([baseLayer]);
        setActiveLayerId(baseLayer.id);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  /** Загружает GB7. */
  const loadGB7 = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const data = readGrayBit7(reader.result as ArrayBuffer);
      if (!data) return;
      gb7DataRef.current = data;
      srcImgRef.current = null;
      setImageData({
        width: data.width!,
        height: data.height!,
        depth: data.depth ?? 7,
        kind: 'GB7',
        pixels: (data as any).pixels,
      });
      setScale(fitScaleForView(imgViewRef.current, data.width!, data.height!));
      redrawCanvas();
      const baseLayer = makeBaseLayerFromGB7(data);
      setLayers([baseLayer]);
      setActiveLayerId(baseLayer.id);
    };
    reader.readAsArrayBuffer(file);
  };

  /** Обработчик выбора файла. */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (canvasRef.current) {
      const c = canvasRef.current;
      c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
      c.width = 1;
      c.height = 1;
    }
    srcImgRef.current = null;
    gb7DataRef.current = null;
    offscreenRef.current = null;
    setPickA(null);
    setPickB(null);
    if (file.type === 'image/png' || file.type === 'image/jpeg') return loadRGB(file);
    if (file.name.toLowerCase().endsWith('.gb7')) return loadGB7(file);
    alert('Unsupported file format!');
  };

  /** Добавляет слой-изображение (PNG/JPEG/GB7) с вписыванием. */
  const onAddImageLayer = (file: File) => {
    if (!file || layers.length >= 2) return;
    if (!imageData.width || !imageData.height) return;

    if (file.type === 'image/png' || file.type === 'image/jpeg') {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const layer = makeImageLayerFittedFromImg(img, imageData.width!, imageData.height!);
          setLayers((prev) => [...prev, layer]);
          setActiveLayerId(layer.id);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
      return;
    }

    if (file.name.toLowerCase().endsWith('.gb7')) {
      const reader = new FileReader();
      reader.onload = () => {
        const data = readGrayBit7(reader.result as ArrayBuffer);
        if (!data) return;
        const layer = makeImageLayerFittedFromGB7(data as any, imageData.width!, imageData.height!);
        setLayers((prev) => [...prev, layer]);
        setActiveLayerId(layer.id);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  /** Выбор цвета пипеткой. */
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

    const d = canvas.getContext('2d')!.getImageData(x, y, 1, 1).data;
    let rgb = { r: d[0], g: d[1], b: d[2] },
      gb7: number | undefined;

    if (imageData.kind === 'GB7' && imageData.pixels && imageData.width) {
      const idx = srcY * imageData.width + srcX;
      const arr = imageData.pixels as Uint8Array;
      gb7 = arr[idx];
      if (typeof gb7 === 'number') rgb = gb7ToRgb(gb7);
    }

    const xyz = rgbToXyz(rgb);
    const lab = xyzToLab(xyz);
    const oklch = rgbToOKLch(rgb);
    const info: PickInfo = { xy: { x: srcX, y: srcY }, rgb, xyz, lab, oklch, gb7 };
    e.nativeEvent.altKey || e.nativeEvent.ctrlKey || e.nativeEvent.shiftKey
      ? setPickB(info)
      : setPickA(info);
  };

  /** Drag-to-scroll для инструмента «рука». */
  const onImgViewMouseDown = (e: React.MouseEvent) => {
    if (tool !== 'hand' || !imgViewRef.current) return;
    dragRef.current = { drag: true, startX: e.clientX, startY: e.clientY };
    imgViewRef.current.style.cursor = 'grabbing';
  };
  const onImgViewMouseUp = () => {
    dragRef.current.drag = false;
    if (imgViewRef.current) imgViewRef.current.style.cursor = 'auto';
  };
  const onImgViewMouseLeave = onImgViewMouseUp;
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

  /** Применяет изменение размера изображения. */
  const applyScale = (nextW: number, nextH: number, method: 'nearest' | 'bilinear') => {
    if (!imageData.width || !imageData.height) return;

    if (imageData.kind === 'RGB' && srcImgRef.current) {
      const src = srcImgRef.current;
      const off = document.createElement('canvas');
      off.width = nextW;
      off.height = nextH;
      const ctx = off.getContext('2d')!;
      ctx.imageSmoothingEnabled = method === 'bilinear';
      ctx.imageSmoothingQuality = method === 'bilinear' ? 'high' : 'low';
      ctx.drawImage(src, 0, 0, nextW, nextH);

      const img = new Image();
      img.onload = () => {
        srcImgRef.current = img;
        gb7DataRef.current = null;
        setImageData({ width: img.width, height: img.height, depth: 24, kind: 'RGB' });
        setScale(1);
      };
      img.src = off.toDataURL();
      return;
    }

    if (imageData.kind === 'GB7' && gb7DataRef.current) {
      const sw = gb7DataRef.current.width!,
        sh = gb7DataRef.current.height!;
      const spx = (gb7DataRef.current as any).pixels as Uint8Array;
      const dpx = scaleGB7(spx, sw, sh, nextW, nextH, method);

      const nextData: AppImageData = {
        ...gb7DataRef.current,
        width: nextW,
        height: nextH,
        depth: 7,
      } as AppImageData;
      (nextData as any).pixels = dpx;
      gb7DataRef.current = nextData;
      setImageData({ ...nextData, kind: 'GB7', pixels: dpx });
      setScale(1);
    }
  };

  /** Создаёт базовый слой из текущего изображения при отсутствии слоёв. */
  const ensureBaseLayer = () => {
    if (layers.length > 0 || !imageData.width || !imageData.height) return;
    const base = currentImageToImageData(
      imageData.kind as Kind,
      srcImgRef.current,
      gb7DataRef.current
    );
    if (!base) return;
    const baseLayer: AppLayer = {
      id: 'base_' + crypto.randomUUID().slice(0, 7),
      name: 'Image',
      type: 'image',
      visible: true,
      opacity: 1,
      blendMode: 'normal',
      hasAlpha: hasAlphaForCurrentImage(
        imageData.kind as Kind,
        srcImgRef.current,
        gb7DataRef.current
      ),
      alphaHidden: false,
      imageData: base,
    };
    setLayers([baseLayer]);
    setActiveLayerId(baseLayer.id);
  };

  /** Удаляет альфу с заливкой белым. */
  const onRemoveAlpha = (id: string) => {
    setLayers((prev) =>
      prev.map((layer) => {
        if (layer.id !== id || layer.type !== 'image') return layer;
        const burned = burnAlphaToWhite(layer.imageData);
        const nextLayer = {
          ...layer,
          imageData: burned,
          previewRaw: burned,
          hasAlpha: false,
          alphaHidden: false,
        } as typeof layer;

        if (imageData.kind === 'RGB' && srcImgRef.current) {
          const off = document.createElement('canvas');
          off.width = burned.width;
          off.height = burned.height;
          off.getContext('2d')!.putImageData(burned, 0, 0);
          const img = new Image();
          img.src = off.toDataURL('image/png');
          srcImgRef.current = img;
        }

        if (imageData.kind === 'GB7' && gb7DataRef.current) {
          const gb: any = gb7DataRef.current;
          const px: Uint8Array | undefined = gb.pixels;
          if (px && px.length === burned.width * burned.height)
            for (let i = 0; i < px.length; i++) px[i] &= 0x7f;
          gb.depth = 7;
        }
        return nextLayer;
      })
    );
    requestAnimationFrame(redrawCanvas);
  };

  /** Добавляет пустой цветной слой. */
  const onAddLayer = () => {
    if (layers.length >= 2) return;
    ensureBaseLayer();
    if (layers.length < 2) {
      const id = 'color_' + crypto.randomUUID().slice(0, 7);
      const colorLayer: AppLayer = {
        id,
        name: `Color ${layers.length + 1}`,
        type: 'color',
        visible: true,
        opacity: 1,
        blendMode: 'normal',
        hasAlpha: false,
        alphaHidden: false,
        color: { r: 128, g: 128, b: 128, a: 255 },
      };
      setLayers((prev) => [...prev, colorLayer]);
      setActiveLayerId(id);
    }
  };

  const onSetColor = (id: string, color: { r: number; g: number; b: number; a?: number }) =>
    setLayers((prev) => prev.map((l) => (l.id === id && l.type === 'color' ? { ...l, color } : l)));

  const onSetActive = (id: string) => setActiveLayerId(id);

  const onReorder = (id: string, dir: 'up' | 'down') => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      if (idx < 0) return prev;
      const t = dir === 'up' ? idx - 1 : idx + 1;
      if (t < 0 || t >= prev.length) return prev;
      const copy = prev.slice();
      const [moved] = copy.splice(idx, 1);
      copy.splice(t, 0, moved);
      return copy;
    });
  };

  const onToggleVisible = (id: string) =>
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));
  const onRemove = (id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
    setActiveLayerId((a) => (a === id ? null : a));
  };
  const onOpacity = (id: string, v01: number) =>
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, opacity: Math.max(0, Math.min(1, v01)) } : l))
    );
  const onBlend = (id: string, bm: BlendMode) =>
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, blendMode: bm } : l)));
  const onToggleAlphaHidden = (id: string) =>
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, alphaHidden: !l.alphaHidden } : l)));

  useEffect(() => {
    redrawCanvas();
    requestAnimationFrame(() => centerCanvasInView(imgViewRef.current, canvasRef.current));
  }, [imageData.width, imageData.height, imageData.kind, scale]);
  useEffect(() => {
    const onResize = () => centerCanvasInView(imgViewRef.current, canvasRef.current);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  useEffect(() => {
    redrawCanvas();
  }, [layers, imageData.width, imageData.height, scale]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (tool !== 'hand' || !imgViewRef.current) return;
      const el = imgViewRef.current,
        step = 48;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
      if (e.key === 'ArrowLeft') el.scrollLeft -= step;
      if (e.key === 'ArrowRight') el.scrollLeft += step;
      if (e.key === 'ArrowUp') el.scrollTop -= step;
      if (e.key === 'ArrowDown') el.scrollTop += step;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tool]);

  return (
    <div>
      <Toolbar tool={tool} setTool={setTool} onFileSelect={handleFileChange} />

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

      <StatusBar
        width={imageData.width}
        height={imageData.height}
        depth={imageData.depth}
        scalePercent={Math.round(scale * 100)}
        onScaleChange={(v) => setScale(Math.max(0.12, Math.min(8, v / 100)))}
      />

      {tool === 'eyedropper' && imageData.width && imageData.height && (
        <EyedropperPanel a={pickA} b={pickB} />
      )}

      {imageData.width && imageData.height && (
        <button
          style={{
            position: 'fixed',
            right: 16,
            bottom: 16,
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

      {showLayers && (
        <LayersPanel
          layers={layers}
          activeId={activeLayerId}
          canAddMore={layers.length < 2}
          onAddLayer={onAddLayer}
          onAddImageLayer={onAddImageLayer}
          onSetActive={onSetActive}
          onReorder={onReorder}
          onToggleVisible={onToggleVisible}
          onRemove={onRemove}
          onOpacity={onOpacity}
          onBlend={onBlend}
          onToggleAlphaHidden={onToggleAlphaHidden}
          onRemoveAlpha={onRemoveAlpha}
          onSetColor={onSetColor}
        />
      )}

      <ScaleModal
        open={isScaleOpen}
        onClose={() => setIsScaleOpen(false)}
        originW={imageData.width || 0}
        originH={imageData.height || 0}
        onApply={(nextW, nextH, method) => {
          applyScale(nextW, nextH, method);
          setIsScaleOpen(false);
        }}
      />
    </div>
  );
};

export default App;

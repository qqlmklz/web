import { Expand } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

/* ui */
import CurvesPanel from './components/CurvesPanel/CurvesPanel';
import ExportModal from './components/ExportModal/ExportModal';
import EyedropperPanel from './components/EyedropperPanel/EyedropperPanel';
import KernelModal from './components/KernelModal/KernelModal';
import LayersPanel from './components/LayersPanel/LayersPanel';
import ScaleModal from './components/ScaleModal/ScaleModal';
import StatusBar from './components/StatusBar/StatusBar';
import Toolbar from './components/Toolbar/Toolbar';

/* io / parsing / canvas render */
import { renderGrayBit7 } from './canvas/renderGrayBit7';
import { readGrayBit7 } from './helpers/gb7/readGrayBit7';

/* types */
import type { PickInfo, Tool } from './types/Color';
import type { AppImageData } from './types/ImageData';
import type { AppLayer, BlendMode } from './types/layers';

/* color math / pick */
import { gb7ToRgb, rgbToOKLch, rgbToXyz, xyzToLab } from './helpers/color/color';

/* layers/composite */
import { compositeLayers } from './helpers/composite/composite';
import { burnAlphaToWhite } from './helpers/image/burnAlphaToWhite';
import { currentImageToImageData } from './helpers/image/currentImage';
import { stripAlpha } from './helpers/image/stripAlpha';
import {
  makeBaseLayerFromGB7,
  makeBaseLayerFromImg,
  makeImageLayerFittedFromGB7,
  makeImageLayerFittedFromImg,
} from './helpers/layers/makeImageLayer';

/* view/geom */
import { clampXY, eventToCanvasXY } from './helpers/geom/coords';
import { centerCanvasInView } from './helpers/view/centerCanvasInView';
import { fitScaleForView } from './helpers/view/fitScaleForView';

/* resample */
import { scaleGB7 } from './helpers/resample/scaleGB7';

/* export helpers (пока из utils — если уже перенёс в helpers/io, поменяй импорты) */
import { downloadGB7 } from './helpers/io/exportGB7';
import { downloadJPG, downloadPNG } from './helpers/io/exportRaster';

type Kind = 'RGB' | 'GB7';
type AppStateImage = Partial<AppImageData> & { kind?: Kind; pixels?: Uint8Array | number[] };

/* ──────────────────────────────────────────────────────────────────────────────
   СЛОИ: состояние и экшены
   ─────────────────────────────────────────────────────────────────────────── */

const App = () => {
  const [imageData, setImageData] = useState<AppStateImage>({});
  const [layers, setLayers] = useState<AppLayer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgViewRef = useRef<HTMLDivElement>(null);

  const srcImgRef = useRef<HTMLImageElement | null>(null);
  const gb7DataRef = useRef<AppImageData | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);

  const showLayers = useMemo(
    () => Boolean(imageData.width && imageData.height) || layers.length > 0,
    [imageData.width, imageData.height, layers.length]
  );

  const activeLayer = useMemo(
    () => layers.find((l) => l.id === activeLayerId) ?? null,
    [layers, activeLayerId]
  );

  function getActiveLayer(): AppLayer | null {
    if (!activeLayerId) return null;
    return layers.find((x) => x.id === activeLayerId) ?? null;
  }

  /** Создаёт сплошную заливку нужного размера. */
  function makeColorImageData(
    w: number,
    h: number,
    color: { r: number; g: number; b: number; a?: number }
  ) {
    const img = new ImageData(w, h);
    const { r, g, b } = color;
    const a = color.a ?? 255;
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = a;
    }
    return img;
  }

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
      if (layer.type === 'color') {
        const needW = imageData.width!,
          needH = imageData.height!;
        const ok =
          layer.imageData && layer.imageData.width === needW && layer.imageData.height === needH;
        return ok ? layer : { ...layer, imageData: makeColorImageData(needW, needH, layer.color) };
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

  const redrawCanvas = () => {
    if (layers.length === 0) {
      drawOriginalOnce();
    } else {
      renderLayersComposite();
    }
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
          redrawCanvas();
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

  const onSetActive = (id: string) => setActiveLayerId(id);
  const onReorder = (id: string, dir: 'up' | 'down') =>
    setLayers((prev) => {
      const i = prev.findIndex((l) => l.id === id);
      if (i < 0) return prev;
      const j = dir === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const onToggleVisible = (id: string) =>
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));
  const onRemove = (id: string) => setLayers((prev) => prev.filter((l) => l.id !== id));
  const onOpacity = (id: string, v01: number) =>
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, opacity: v01 } : l)));
  const onBlend = (id: string, bm: BlendMode) =>
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, blendMode: bm } : l)));
  const onToggleAlphaHidden = (id: string) =>
    setLayers((prev) =>
      prev.map((l) =>
        l.id === id && l.type === 'image' ? { ...l, alphaHidden: !l.alphaHidden } : l
      )
    );
  const onRemoveAlpha = (id: string) =>
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== id || l.type !== 'image') return l;
        const imgNoA = burnAlphaToWhite(l.imageData);
        return {
          ...l,
          imageData: imgNoA,
          hasAlpha: false,
          alphaHidden: false,
        };
      })
    );

  /** Добавляет пустой цветовой слой. */
  const onAddLayer = () => {
    if (layers.length >= 2) return;
    const w = imageData.width,
      h = imageData.height;
    if (!w || !h) return;
    const color = { r: 255, g: 0, b: 0, a: 255 };
    const layer: AppLayer = {
      id: Math.random().toString(36).slice(2),
      name: `Color ${layers.length + 1}`,
      type: 'color',
      visible: true,
      opacity: 1,
      blendMode: 'normal',
      hasAlpha: false,
      alphaHidden: false,
      color,
      imageData: makeColorImageData(w, h, color),
    } as any;
    setLayers((prev) => [...prev, layer]);
    setActiveLayerId(layer.id);
    redrawCanvas();
  };

  /** Меняет цвет у color-слоя. */
  const onSetColor = (id: string, color: { r: number; g: number; b: number; a?: number }) => {
    const w = imageData.width,
      h = imageData.height;
    if (!w || !h) return;
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== id || l.type !== 'color') return l;
        return { ...l, color, imageData: makeColorImageData(w, h, color) } as any;
      })
    );
  };

  /* ───────────────────────────────────────────────────────────────────────────
     [2] ТУЛБАР и ЗАГРУЗКА: tool, file-open, пипетка, прокрутка
     ───────────────────────────────────────────────────────────────────────── */

  const [tool, setTool] = useState<Tool>('hand');
  const [pickA, setPickA] = useState<PickInfo | null>(null);
  const [pickB, setPickB] = useState<PickInfo | null>(null);

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

  /** Пипетка. */
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

  /** Drag-to-scroll (рука). */
  const dragRef = useRef({ drag: false, startX: 0, startY: 0 });
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

  /* ───────────────────────────────────────────────────────────────────────────
     [3] МАСШТАБИРОВАНИЕ: view-scale и изменение размеров изображения
     ───────────────────────────────────────────────────────────────────────── */

  const [scale, setScale] = useState(1);
  const [isScaleOpen, setIsScaleOpen] = useState(false);

  useEffect(() => {
    redrawCanvas();
    requestAnimationFrame(() => centerCanvasInView(imgViewRef.current, canvasRef.current));
  }, [imageData.width, imageData.height, imageData.kind, scale, layers]);

  useEffect(() => {
    const onResize = () => centerCanvasInView(imgViewRef.current, canvasRef.current);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /** Меняет размер исходного изображения. */
  function applyScale(nextW: number, nextH: number, method: 'nearest' | 'bilinear') {
    if (!imageData.width || !imageData.height) return;

    if (imageData.kind === 'GB7' && gb7DataRef.current) {
      const sw = imageData.width!,
        sh = imageData.height!;
      const src = (gb7DataRef.current as any).pixels as Uint8Array;

      const scaledPixels = scaleGB7(src, sw, sh, nextW, nextH, method);

      const scaledGb7 = {
        ...(gb7DataRef.current as any),
        width: nextW,
        height: nextH,
        pixels: scaledPixels,
      } as any;

      gb7DataRef.current = scaledGb7;

      setImageData({ ...imageData, width: nextW, height: nextH, pixels: scaledPixels });

      const base = makeBaseLayerFromGB7(scaledGb7);
      setLayers((prev) => {
        const next = prev.slice();
        next[0] = base;
        return next;
      });
      setActiveLayerId(base.id);
      setScale(fitScaleForView(imgViewRef.current, nextW, nextH));
      redrawCanvas();
      return;
    }

    if (imageData.kind === 'RGB' && srcImgRef.current) {
      const src = srcImgRef.current;
      const off = offscreenRef.current || (offscreenRef.current = document.createElement('canvas'));
      off.width = nextW;
      off.height = nextH;
      const ctx = off.getContext('2d')!;
      ctx.imageSmoothingEnabled = method !== 'nearest';
      ctx.imageSmoothingQuality = method !== 'nearest' ? 'high' : 'low';
      ctx.clearRect(0, 0, nextW, nextH);
      ctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, nextW, nextH);

      const img = new Image();
      img.onload = () => {
        srcImgRef.current = img;
        setImageData({ ...imageData, width: nextW, height: nextH });
        const base = makeBaseLayerFromImg(img);
        setLayers((prev) => {
          const next = prev.slice();
          next[0] = base;
          return next;
        });
        setActiveLayerId(base.id);
        setScale(fitScaleForView(imgViewRef.current, nextW, nextH));
        redrawCanvas();
      };
      img.src = off.toDataURL('image/png');
    }
  }

  /* ───────────────────────────────────────────────────────────────────────────
     [4] КРИВЫЕ: предпросмотр, коммит и откаты по бэкапу
     ───────────────────────────────────────────────────────────────────────── */

  const [isCurvesOpen, setCurvesOpen] = useState(false);
  const curvesBackupRef = useRef<ImageData | null>(null);
  const curvesCommittedRef = useRef(false);

  function getActiveImageLayer() {
    const l = getActiveLayer();
    return l && l.type === 'image' ? l : null;
  }

  function openCurves() {
    const layer = getActiveImageLayer();
    if (layer) {
      curvesBackupRef.current = new ImageData(
        new Uint8ClampedArray(layer.imageData.data),
        layer.imageData.width,
        layer.imageData.height
      );
      setCurvesOpen(true);
    }
  }
  function closeCurves() {
    if (curvesCommittedRef.current) {
      curvesCommittedRef.current = false;
      setCurvesOpen(false);
      return;
    }
    const layer = getActiveImageLayer();
    if (layer && curvesBackupRef.current) {
      const back = curvesBackupRef.current;
      curvesBackupRef.current = null;
      setLayers((prev) =>
        prev.map((L) => (L.id === layer.id ? ({ ...L, imageData: back } as any) : L))
      );
    }
    setCurvesOpen(false);
  }

  type LUT = Uint8Array;
  type LUTs = { r?: LUT; g?: LUT; b?: LUT; a?: LUT };

  function applyLUTsToImageDataLocal(
    src: ImageData,
    luts: LUTs,
    target: 'rgb' | 'alpha'
  ): ImageData {
    const out = new ImageData(src.width, src.height);
    const s = src.data,
      d = out.data;
    const lr = luts.r,
      lg = luts.g,
      lb = luts.b,
      la = luts.a;
    for (let i = 0; i < s.length; i += 4) {
      const r = s[i],
        g = s[i + 1],
        b = s[i + 2],
        a = s[i + 3];
      if (target === 'rgb') {
        d[i] = lr ? lr[r] : r;
        d[i + 1] = lg ? lg[g] : g;
        d[i + 2] = lb ? lb[b] : b;
        d[i + 3] = a;
      } else {
        d[i] = r;
        d[i + 1] = g;
        d[i + 2] = b;
        d[i + 3] = la ? la[a] : a;
      }
    }
    return out;
  }

  function handleCurvesApply(luts: LUTs, target: 'rgb' | 'alpha') {
    const layer = getActiveImageLayer();
    if (!layer) return;
    const next = applyLUTsToImageDataLocal(layer.imageData, luts, target);
    setLayers((prev) =>
      prev.map((L) => (L.id === layer.id ? ({ ...L, imageData: next } as any) : L))
    );
    redrawCanvas();
  }
  function handleCurvesCommit(luts: LUTs, target: 'rgb' | 'alpha') {
    const layer = getActiveImageLayer();
    if (!layer) return;
    const next = applyLUTsToImageDataLocal(layer.imageData, luts, target);
    curvesCommittedRef.current = true;
    curvesBackupRef.current = null;
    setLayers((prev) =>
      prev.map((L) => (L.id === layer.id ? ({ ...L, imageData: next } as any) : L))
    );
    setCurvesOpen(false);
    redrawCanvas();
  }
  function handleCurvesPreviewChange(enabled: boolean, luts?: LUTs, target?: 'rgb' | 'alpha') {
    const layer = getActiveImageLayer();
    if (!layer) return;
    if (!enabled) {
      if (curvesBackupRef.current) {
        const back = curvesBackupRef.current;
        setLayers((prev) =>
          prev.map((L) => (L.id === layer.id ? ({ ...L, imageData: back } as any) : L))
        );
      }
      return;
    }
    if (enabled && luts && target) {
      const next = applyLUTsToImageDataLocal(
        curvesBackupRef.current ?? layer.imageData,
        luts,
        target
      );
      setLayers((prev) =>
        prev.map((L) => (L.id === layer.id ? ({ ...L, imageData: next } as any) : L))
      );
    }
  }

  /* ───────────────────────────────────────────────────────────────────────────
     [5] ЭКСПОРТ: подготовка ImageData и вызов helpers/io
     ───────────────────────────────────────────────────────────────────────── */

  const [isExportOpen, setExportOpen] = useState(false);

  const canExport = useMemo(
    () => Boolean(imageData.width && imageData.height),
    [imageData.width, imageData.height]
  );

  async function renderImageDataForExport(): Promise<ImageData | null> {
    if (!imageData.width || !imageData.height) return null;

    if (layers.length > 0) {
      const prepared: AppLayer[] = layers
        .filter((l) => l.visible && l.opacity > 0)
        .map((l) => {
          if (l.type === 'image' && l.alphaHidden)
            return { ...l, imageData: stripAlpha(l.imageData) };
          if (l.type === 'color') {
            const w = imageData.width!,
              h = imageData.height!;
            const ok = l.imageData && l.imageData.width === w && l.imageData.height === h;
            return ok ? l : { ...l, imageData: makeColorImageData(w, h, l.color) };
          }
          return l;
        });
      return compositeLayers(prepared, imageData.width, imageData.height);
    }

    const src = currentImageToImageData(
      imageData.kind as 'RGB' | 'GB7',
      srcImgRef.current,
      gb7DataRef.current
    );
    return src ?? null;
  }

  async function handleExport(format: 'png' | 'jpg' | 'gb7', jpgQuality = 0.92) {
    const img = await renderImageDataForExport();
    if (!img) return;

    const base = 'export';
    if (format === 'png') return downloadPNG(img, `${base}.png`);
    if (format === 'jpg') return downloadJPG(img, `${base}.jpg`, jpgQuality);
    if (format === 'gb7') return downloadGB7(img, `${base}.gb7`);
  }

  /* ───────────────────────────────────────────────────────────────────────────
     [6] KERNELS: Custom 3×3 модалка и применение к слою
     ───────────────────────────────────────────────────────────────────────── */

  const [kernelOpen, setKernelOpen] = useState(false);

  const kernelSource: ImageData | null = useMemo(() => {
    const l = getActiveLayer();
    if (!l || !imageData.width || !imageData.height) return null;
    if (l.type === 'image') return l.imageData;
    if (l.type === 'color') {
      const w = imageData.width,
        h = imageData.height;
      const ok = l.imageData && l.imageData.width === w && l.imageData.height === h;
      return ok ? l.imageData! : makeColorImageData(w, h, l.color);
    }
    return null;
  }, [layers, activeLayerId, imageData.width, imageData.height]);

  const canKernel = !!activeLayerId && !!imageData.width && !!imageData.height;
  function openKernel() {
    if (canKernel) setKernelOpen(true);
  }
  function handleApplyKernel(result: ImageData, target: 'rgb' | 'alpha') {
    const l = getActiveLayer();
    if (!l) return;
    setLayers((prev) =>
      prev.map((L) => {
        if (L.id !== l.id) return L;
        const src = (L.type === 'image' ? L.imageData : L.imageData!)!.data;
        const merged = new ImageData(result.width, result.height);
        const d = merged.data,
          rs = result.data,
          os = src;
        for (let i = 0; i < d.length; i += 4) {
          if (target === 'rgb') {
            d[i] = rs[i];
            d[i + 1] = rs[i + 1];
            d[i + 2] = rs[i + 2];
            d[i + 3] = os[i + 3];
          } else {
            d[i] = os[i];
            d[i + 1] = os[i + 1];
            d[i + 2] = os[i + 2];
            d[i + 3] = rs[i + 3];
          }
        }
        return { ...L, imageData: merged } as any;
      })
    );
    redrawCanvas();
  }

  /* ───────────────────────────────────────────────────────────────────────────
     РЕНДЕР
     ───────────────────────────────────────────────────────────────────────── */

  return (
    <div>
      <Toolbar
        tool={tool}
        setTool={setTool}
        onFileSelect={handleFileChange}
        /* curves */
        isCurvesOpen={isCurvesOpen}
        canOpenCurves={Boolean(activeLayer && activeLayer.type === 'image')}
        onToggleCurves={() => (isCurvesOpen ? closeCurves() : openCurves())}
        /* kernel */
        canKernel={canKernel}
        onOpenKernel={openKernel}
        /* export */
        canExport={canExport}
        onOpenExport={() => setExportOpen(true)}
      />

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

      <div className="side-stack">
        <div className="panel-wrap">
          {showLayers && (
            <div className="panel-card">
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
            </div>
          )}
        </div>

        {isCurvesOpen && activeLayer && activeLayer.type === 'image' && (
          <div className="panel-wrap">
            <div className="panel-card">
              <CurvesPanel
                layer={activeLayer}
                isGB7={imageData.kind === 'GB7'}
                onApply={handleCurvesApply}
                onCommit={handleCurvesCommit}
                onPreviewChange={handleCurvesPreviewChange}
                onClose={closeCurves}
              />
            </div>
          </div>
        )}
      </div>

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

      <ExportModal
        open={isExportOpen}
        onClose={() => setExportOpen(false)}
        onExport={(fmt, quality) => {
          handleExport(fmt, quality);
          setExportOpen(false);
        }}
      />

      <KernelModal
        open={kernelOpen}
        onClose={() => setKernelOpen(false)}
        src={kernelSource}
        onApply={handleApplyKernel}
      />
    </div>
  );
};

export default App;

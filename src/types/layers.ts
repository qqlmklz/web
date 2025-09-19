export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay';
export type LayerType = 'image' | 'color';

export interface BaseLayer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  opacity: number; // 0..1
  blendMode: BlendMode;
  hasAlpha: boolean;
  alphaHidden: boolean;
}

export interface ImageLayer extends BaseLayer {
  type: 'image';
  imageData: ImageData;
  previewRaw?: ImageData;
}

export interface ColorLayer extends BaseLayer {
  type: 'color';
  color: { r: number; g: number; b: number; a?: number };
  imageData?: ImageData;
}

export type AppLayer = ImageLayer | ColorLayer;

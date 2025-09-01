export enum AppState {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  RESULTS = 'RESULTS',
}

export enum ProductCategory {
  CLOTHING = 'Clothing',
  HOME_GOODS = 'Home Goods',
  GADGETS = 'Gadgets',
}

export interface GeneratedImage {
  id: string;
  src: string;
}

export interface DetectionResult {
  category: ProductCategory;
  description: string;
}

export interface GenerationOptionsProps {
  productCategory: ProductCategory;
  productDescription: string;
}

export interface GenerationPayload {
  prompt: string;
  count: number;
  logoFile?: File | null;
  aspectRatio?: string;
}

// Types for the Image Edit Orchestrator
export type EditType = 'inpaint' | 'recolor' | 'replace' | 'relight' | 'add_object';

export interface StructuredEditJob {
  edit_type: EditType;
  model_prompt: string;
}

export interface EditLayer {
  id: string;
  imageDataUrl: string; // The result of the edit for this layer
  opacity: number; // 0-1
  isVisible: boolean;
  editParams: {
    maskDataUrl: string;
    userPrompt: string;
    modelPrompt: string;
    editType: EditType;
  };
}


// New types for chat
export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id:string;
  role: MessageRole;
  text?: string;
  images?: GeneratedImage[];
  isLoading?: boolean;
  imageCount?: number;
  options?: GenerationOptionsProps;
}

// New types for Image Upscaler
export type UpscaleFactor = 2 | 4 | 8;
export type UpscaleProfile = 'Default' | 'Photo' | 'Product' | 'Text / Artwork';

export interface UpscaleOptions {
  factor: UpscaleFactor;
  profile: UpscaleProfile;
  removeArtifacts: boolean;
  preserveFaces: boolean;
  enhanceDetails: boolean;
}
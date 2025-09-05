// types.ts

export interface GeneratedImage {
  id: string;
  src: string;
  thumbnailSrc?: string;
  isLoading?: boolean;
}

export interface LibraryImage extends GeneratedImage {
  createdAt: number;
  prompt?: string;
  notes?: string;
  tags?: string[];
  isFavorite?: boolean;
  folderId?: string | null;
  originalId?: string;
  width: number;
  height: number;
}

export interface Folder {
    id: string;
    name: string;
    createdAt: number;
}


export enum ProductCategory {
  CLOTHING = 'Clothing',
  HOME_GOODS = 'Home Goods',
  GADGETS = 'Gadgets',
}

export interface CreativeOptions {
  Style: string[];
  Setting: string[];
  Vibe: string[];
  Props: string[];
}

export interface GenerationPayload {
  prompt: string;
  count: number;
  logoFile: File | null;
  aspectRatio: string;
  productDescription?: string;
  originalImage?: GeneratedImage;
}

export interface BaseGenerationOptionsProps {
    productDescription: string;
    productCategory: ProductCategory;
    creativeOptions: CreativeOptions;
    originalImage: GeneratedImage | null;
}

export interface GenerationOptionsProps extends BaseGenerationOptionsProps {
    onGenerate: (payload: GenerationPayload) => void;
    onStartAdCreation: (image: GeneratedImage) => void;
}

export type ToolTab = 'library' | 'ads' | 'visuals' | 'editor' | 'upscaler' | 'blender';

export interface ToastInfo {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'error';
  imageSrc?: string;
}

// For Image Editor
export type EditType = 'inpaint' | 'outpaint' | 'remove_bg';
export interface EditLayer {
    id: string;
    imageDataUrl: string;
    maskUrl?: string;
    prompt: string;
    editType: EditType | 'inpaint'; // 'inpaint' is a fallback
    featherPx: number;
    isVisible: boolean;
    opacity: number;
    createdAt: number;
}
export interface SelectionAnalysis {
  selection_summary: string;
  suggested_actions: string[];
}

// For Image Upscaler
export type UpscaleFactor = 2 | 4 | 8;
export type UpscaleProfile = 'Default' | 'Photo' | 'Product' | 'Text / Artwork';
export interface UpscaleOptions {
  factor: UpscaleFactor;
  profile: UpscaleProfile;
  removeArtifacts: boolean;
  preserveFaces: boolean;
  enhanceDetails: boolean;
}

// For Ad Director
export interface AdDirectorOptionsProps {
  sourceImage: GeneratedImage;
}
export interface AdGenerationPayload {
  sourceImage: GeneratedImage;
  platform: string;
  tone: string;
  cta: string;
  headline: string;
  logoFile: File | null;
}

// For Ad Brief
export interface AdBrief {
  platforms: string[];
  campaignGoal: string;
  targetAudience: {
    types: string[];
    painPoints: string;
    desires: string;
    objections: string;
    custom: string;
  };
  product: {
    name: string;
    category: string;
    features: string;
    benefits: string;
    usp: string;
    price: string;
    offer: string;
    proof: string;
  };
  tone: {
    primary: string;
    secondary: string;
  };
  structure: string[];
  compliance: {
    region: string;
    wordsToAvoid: string;
    mustInclude: string;
    charLimits: string;
  };
  visuals: {
    hasImages: boolean;
    needsPrompts: boolean;
    style: string;
    palette: string;
    onImageText: string;
    numberOfImages: number;
  };
}

export interface AdBriefWizardState {
  sourceImage: GeneratedImage;
  brief: AdBrief;
  validationErrors: string[];
  isLoading: boolean;
}

// For Ad Creative Editor / Templates
export interface AdCreativeState {
  headline: string;
  body: string;
  cta: string;
  textColor: string;
  font: string;
  templateId: string;
  showLogo: boolean;
  backgroundColor: string;
  showHeadline: boolean;
  showCta: boolean;
  headlineSize: number;
  headlineAlign: 'left' | 'center' | 'right';
  headlinePosition: { x: number, y: number };
  ctaSize: number;
  ctaPosition: { x: number, y: number };
  logoPosition: { x: number, y: number };
  logoScale: number;
  textShadow: boolean;
  textOutline: boolean;
  textOutlineColor: string;
  textOutlineWidth: number;
}
export interface AdTemplate {
    id: string;
    name: string;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    draw: (
        ctx: CanvasRenderingContext2D,
        canvas: HTMLCanvasElement,
        state: AdCreativeState,
        logoImg?: HTMLImageElement
    ) => {
        logo: DOMRectReadOnly;
        headline: DOMRectReadOnly;
        cta: DOMRectReadOnly;
    } | void;
}

// For Image Blender
export interface BlendedImage {
    id: string;
    image: HTMLImageElement;
    x: number;
    y: number;
    width: number;
    height: number;
    opacity: number;
    zIndex: number;
}

// For Prompts
export interface Prompts {
  [key: string]: string;
}

// For Library Selector
export interface LibrarySelectionConfig {
  multiple: boolean;
  onSelect: (images: LibraryImage[]) => void;
}

// For Settings
export type ModelType = 'text' | 'visual' | 'edit' | 'upscale';
export type ModelConfig = Record<ModelType, string>;

// FIX: Corrected HarmCategory to be compatible with the version of @google/genai being used. The compiler error suggested a different value was expected for HARM_CATEGORY_HARASSMENT.
// FIX: Updated HarmCategory to use 'HARM_CATEGORY_IMAGE_HARASSMENT' as suggested by the compiler error to match the type expected by @google/genai.
export type HarmCategory = 'HARM_CATEGORY_IMAGE_HARASSMENT' | 'HARM_CATEGORY_HATE_SPEECH' | 'HARM_CATEGORY_SEXUALLY_EXPLICIT' | 'HARM_CATEGORY_DANGEROUS_CONTENT';
export type HarmBlockThreshold = 'BLOCK_NONE' | 'BLOCK_ONLY_HIGH' | 'BLOCK_LOW_AND_ABOVE' | 'BLOCK_MEDIUM_AND_ABOVE';

export interface SafetySetting {
    category: HarmCategory;
    threshold: HarmBlockThreshold;
}

// For Sharing
export interface SharedImageData {
  src: string;
  prompt?: string;
  notes?: string;
  width: number;
  height: number;
  createdAt: number;
}


export enum AppState {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  RESULTS = 'RESULTS',
}

export type ToolTab = 'upscaler' | 'editor' | 'ads' | 'library' | 'blender';

export enum ProductCategory {
  CLOTHING = 'Clothing',
  HOME_GOODS = 'Home Goods',
  GADGETS = 'Gadgets',
}

export interface GeneratedImage {
  id: string;
  src: string;
  thumbnailSrc?: string;
  isReference?: boolean;
  isLoading?: boolean;
}

export interface AdDirectorOptionsProps {
  sourceImage: GeneratedImage;
}

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

export interface DetectionResult {
  category: ProductCategory;
  description: string;
}

export interface CreativeOptions {
  [key: string]: string[];
}

// FIX: Added GenerationOptionsProps for use in GenerationOptions component
export interface GenerationOptionsProps {
  productDescription: string;
  creativeOptions: CreativeOptions | null;
  originalImage: GeneratedImage | null;
  productCategory: ProductCategory | null;
}

export interface GenerationPayload {
  prompt: string;
  count: number;
  logoFile?: File | null;
  aspectRatio?: string;
  productDescription: string;
  originalImage?: GeneratedImage;
}

// FIX: Added AdGenerationPayload for use in AdDirectorOptions component
export interface AdGenerationPayload {
  sourceImage: GeneratedImage;
  platform: string;
  tone: string;
  cta: string;
  headline: string;
  logoFile: File | null;
}

export interface GenerationContext {
  payload: GenerationPayload;
  file: File;
}

export type EditType = 'inpaint' | 'recolor' | 'replace' | 'relight' | 'add_object' | 'remove';

export interface SelectionAnalysis {
  selection_summary: string;
  suggested_actions: string[];
}

export interface EditLayer {
  id: string;
  imageDataUrl: string;
  maskUrl: string;
  prompt: string;
  editType: EditType;
  featherPx: number;
  isVisible: boolean;
  opacity: number;
  createdAt: number;
}

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

// FIX: Added AdBriefWizardState for use in AdBriefWizard component
export interface AdBriefWizardState {
  brief: AdBrief;
  sourceImage: GeneratedImage;
  isLoading: boolean;
  validationErrors?: string[];
}

export type UpscaleFactor = 2 | 4 | 8;
export type UpscaleProfile = 'Default' | 'Photo' | 'Product' | 'Text / Artwork';

export interface UpscaleOptions {
  factor: UpscaleFactor;
  profile: UpscaleProfile;
  removeArtifacts: boolean;
  preserveFaces: boolean;
  enhanceDetails: boolean;
}

export interface ToastInfo {
  id: number;
  title: string;
  message: string;
  imageSrc?: string;
  type: 'info' | 'error' | 'success';
}

export interface Prompts {
  system: string;
  removeBackground: string;
  analyzeSelection: string;
  detectProductCategory: string;
  generateCreativeOptions: string;
  generateLifestyle: string;
  refineLifestyle: string;
  editImageWithMask: string;
  upscaleImage: string;
  enhancePrompt: string;
  generateImageAdPrompt: string;
  generateAdCopy: string;
  prefillAdBrief: string;
  autocompleteAdBrief: string;
  generateStudioBackground: string;
  suggestVisualPrompts: string;
  editLogo: string;
  generatePlatformContent: string;
}

export interface AdCreativeState {
  headline: string;
  body: string;
  cta: string;
  textColor: string;
  font: string;
  templateId: string;
  showLogo: boolean;
  backgroundColor: string; // For text boxes/buttons

  // Updated/New properties
  showHeadline: boolean;
  showCta: boolean;
  headlineSize: number; // As a percentage of canvas width
  headlineAlign: 'left' | 'center' | 'right';
  headlinePosition: { x: number; y: number }; // As a percentage of canvas dimensions
  ctaSize: number; // As a percentage of canvas width
  ctaPosition: { x: number; y: number }; // As a percentage of canvas dimensions
  logoPosition: { x: number; y: number }; // As a percentage of canvas dimensions
  logoScale: number; // As a percentage of canvas width
  textShadow: boolean; // Add a shadow to text for readability
  textOutline: boolean;
  textOutlineColor: string;
  textOutlineWidth: number; // In pixels, relative to canvas size
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
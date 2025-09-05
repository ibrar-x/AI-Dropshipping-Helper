import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  GeneratedImage,
  LibraryImage,
  ToastInfo,
  ToolTab,
  LibrarySelectionConfig,
  Folder,
  Prompts,
  ModelConfig,
  SafetySetting,
} from './types';
import {
    addImagesToDB,
    getImagesFromDB,
    addFolderToDB,
    getFoldersFromDB,
    updateFolderInDB,
    deleteFolderFromDB,
    updateImageInDB,
    deleteImagesFromDB,
    clearImagesFromDB,
    clearFoldersFromDB,
} from './utils/db';
import { createThumbnail, getImageDimensions } from './utils/imageUtils';
import { defaultPrompts } from './prompts';
import { encrypt, decrypt } from './utils/crypto';

const SETTINGS_STORAGE_KEY = 'ai-studio-settings';
const API_KEY_STORAGE_KEY = 'userApiKey';

const loadSettings = (): { prompts: Prompts, modelConfig: ModelConfig, safetySettings: SafetySetting[] } => {
    try {
        const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            const mergedPrompts = { ...defaultPrompts, ...parsed.prompts };
            return {
                prompts: mergedPrompts,
                modelConfig: parsed.modelConfig || { text: 'gemini-2.5-flash', visual: 'imagen-4.0-generate-001', edit: 'gemini-2.5-flash-image-preview', upscale: 'imagen-v002-upscale' },
                safetySettings: parsed.safetySettings || [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
                ],
            };
        }
    } catch (e) {
        console.error("Failed to load settings from localStorage", e);
    }
    return {
        prompts: defaultPrompts,
        modelConfig: { text: 'gemini-2.5-flash', visual: 'imagen-4.0-generate-001', edit: 'gemini-2.5-flash-image-preview', upscale: 'imagen-v002-upscale' },
        safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
    };
};

const initialSettings = loadSettings();

type NewImagePayload = Omit<LibraryImage, 'id' | 'createdAt' | 'thumbnailSrc' | 'width' | 'height'> & { src: string };

interface AppState {
  activeTab: ToolTab;
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  isSettingsOpen: boolean;
  toasts: ToastInfo[];
  library: LibraryImage[];
  folders: Folder[];
  isLibrarySelectionOpen: boolean;
  librarySelectionConfig: LibrarySelectionConfig | null;
  recreationData: { tool: ToolTab; image: LibraryImage } | null;
  adGeneratorResults: GeneratedImage[];
  upscalingImage: GeneratedImage | null;
  pendingUpscaledImage: { sourceId: string; dataUrl: string } | null;
  // Settings State
  prompts: Prompts;
  modelConfig: ModelConfig;
  safetySettings: SafetySetting[];
  customApiKey: string;
}

interface AppActions {
  initializeApp: () => void;
  selectTab: (tab: ToolTab) => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setIsSidebarCollapsed: (isCollapsed: boolean) => void;
  openSettings: () => void;
  closeSettings: () => void;
  addToast: (toast: Omit<ToastInfo, 'id'>) => void;
  removeToast: (id: number) => void;
  // Library Actions
  addImagesToLibrary: (images: NewImagePayload[]) => Promise<LibraryImage[]>;
  updateImage: (id: string, updates: Partial<Omit<LibraryImage, 'id'>>) => Promise<void>;
  deleteImages: (ids: string[]) => Promise<void>;
  addFolder: (name: string) => Promise<void>;
  updateFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  // Inter-tool functionality
  openLibrarySelector: (config: LibrarySelectionConfig) => void;
  closeLibrarySelector: () => void;
  useAsInput: (tool: ToolTab, image: LibraryImage) => void;
  clearRecreationData: () => void;
  // Ad Generator specific state
  setAdGeneratorResults: (results: GeneratedImage[]) => void;
  updateAdGeneratorResult: (action: 'replace' | 'copy', newImage: GeneratedImage, sourceId: string) => void;
  // Upscaler specific state
  openUpscaler: (image: GeneratedImage) => void;
  closeUpscaler: () => void;
  handleUpscaleSave: (finalImageDataUrl: string, sourceImageId: string) => void;
  resolveUpscaledImage: (action: 'replace' | 'copy') => void;
  // Settings Actions
  saveSettings: (settings: { newPrompts?: Prompts, newModelConfig?: ModelConfig, newSafetySettings?: SafetySetting[], newCustomApiKey?: string }) => void;
  clearData: () => void;
}

export const useAppStore = create<AppState & AppActions>()(
  immer((set, get) => ({
    // STATE
    activeTab: 'library',
    isSidebarOpen: false,
    isSidebarCollapsed: false,
    isSettingsOpen: false,
    toasts: [],
    library: [],
    folders: [],
    isLibrarySelectionOpen: false,
    librarySelectionConfig: null,
    recreationData: null,
    adGeneratorResults: [],
    upscalingImage: null,
    pendingUpscaledImage: null,
    prompts: initialSettings.prompts,
    modelConfig: initialSettings.modelConfig,
    safetySettings: initialSettings.safetySettings,
    customApiKey: decrypt(localStorage.getItem(API_KEY_STORAGE_KEY) || ''),

    // ACTIONS
    initializeApp: async () => {
      const [images, folders] = await Promise.all([getImagesFromDB(), getFoldersFromDB()]);
      const customApiKey = decrypt(localStorage.getItem(API_KEY_STORAGE_KEY) || '');
      set({ library: images, folders, customApiKey });
    },
    selectTab: (tab) => set({ activeTab: tab, isSidebarOpen: false }),
    setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
    setIsSidebarCollapsed: (isCollapsed) => set({ isSidebarCollapsed: isCollapsed }),
    openSettings: () => set({ isSettingsOpen: true }),
    closeSettings: () => set({ isSettingsOpen: false }),
    addToast: (toast) => {
      set((state) => {
        state.toasts.push({ ...toast, id: Date.now() });
      });
    },
    removeToast: (id) => {
      set((state) => {
        state.toasts = state.toasts.filter((t) => t.id !== id);
      });
    },
    addImagesToLibrary: async (images) => {
        const newLibraryImages: LibraryImage[] = await Promise.all(images.map(async (img) => {
            const now = Date.now();
            const thumbnailSrc = await createThumbnail(img.src, 256, 256);
            const { width, height } = await getImageDimensions(img.src);
            return {
                ...img,
                id: `img_${now}_${Math.random().toString(36).substring(2, 9)}`,
                createdAt: now,
                thumbnailSrc,
                width,
                height,
                tags: img.tags ?? [],
                isFavorite: img.isFavorite ?? false,
                folderId: img.folderId ?? null,
            };
        }));

        await addImagesToDB(newLibraryImages);
        set(state => {
            state.library.unshift(...newLibraryImages);
            state.library.sort((a, b) => b.createdAt - a.createdAt);
        });
        return newLibraryImages;
    },
    updateImage: async (id, updates) => {
        const image = get().library.find(img => img.id === id);
        if (!image) return;
        const updatedImage = { ...image, ...updates };
        await updateImageInDB(updatedImage);
        set(state => {
            const index = state.library.findIndex(img => img.id === id);
            if (index !== -1) {
                state.library[index] = updatedImage;
            }
        });
    },
    deleteImages: async (ids) => {
        await deleteImagesFromDB(ids);
        set(state => {
            state.library = state.library.filter(img => !ids.includes(img.id));
        });
    },
    addFolder: async (name) => {
        const now = Date.now();
        const newFolder: Folder = {
            id: `folder_${now}`,
            name,
            createdAt: now,
        };
        await addFolderToDB(newFolder);
        set(state => {
            state.folders.push(newFolder);
        });
    },
    updateFolder: async (id, name) => {
        const folder = get().folders.find(f => f.id === id);
        if(!folder) return;
        const updatedFolder = { ...folder, name };
        await updateFolderInDB(updatedFolder);
        set(state => {
            const index = state.folders.findIndex(f => f.id === id);
            if (index !== -1) {
                state.folders[index] = updatedFolder;
            }
        });
    },
    deleteFolder: async (id) => {
        const imagesInFolder = get().library.filter(img => img.folderId === id);
        await Promise.all(imagesInFolder.map(img => get().updateImage(img.id, { folderId: null })));

        await deleteFolderFromDB(id);
        set(state => {
            state.folders = state.folders.filter(f => f.id !== id);
        });
    },
    openLibrarySelector: (config) => set({ isLibrarySelectionOpen: true, librarySelectionConfig: config }),
    closeLibrarySelector: () => set({ isLibrarySelectionOpen: false, librarySelectionConfig: null }),
    useAsInput: (tool, image) => {
        set({
            recreationData: { tool, image },
            activeTab: tool,
            isSidebarOpen: false,
        });
    },
    clearRecreationData: () => set({ recreationData: null }),
    setAdGeneratorResults: (results) => set({ adGeneratorResults: results }),
    updateAdGeneratorResult: (action, newImage, sourceId) => {
        set(state => {
            if (action === 'replace') {
                const index = state.adGeneratorResults.findIndex(img => img.id === sourceId);
                if (index !== -1) {
                    state.adGeneratorResults[index] = newImage;
                }
            } else { // copy
                const sourceIndex = state.adGeneratorResults.findIndex(img => img.id === sourceId);
                if (sourceIndex !== -1) {
                     state.adGeneratorResults.splice(sourceIndex + 1, 0, newImage);
                } else {
                     state.adGeneratorResults.push(newImage);
                }
            }
        })
    },
    openUpscaler: (image) => set({ upscalingImage: image, pendingUpscaledImage: null }),
    closeUpscaler: () => set({ upscalingImage: null, pendingUpscaledImage: null }),
    handleUpscaleSave: (finalImageDataUrl, sourceImageId) => {
        set({ pendingUpscaledImage: { sourceId: sourceImageId, dataUrl: finalImageDataUrl } });
    },
    resolveUpscaledImage: async (action) => {
        const pending = get().pendingUpscaledImage;
        if (!pending) return;

        const [newImage] = await get().addImagesToLibrary([{
            src: pending.dataUrl,
            originalId: pending.sourceId
        }]);

        const adGenResults = get().adGeneratorResults;
        const index = adGenResults.findIndex(img => img.id === pending.sourceId);
        if(index !== -1) {
             get().updateAdGeneratorResult(action, newImage, pending.sourceId);
        }

        get().addToast({
            title: 'Image Upscaled',
            message: 'Your high-resolution image has been saved to the library.',
            type: 'success',
            imageSrc: newImage.thumbnailSrc
        });

        get().closeUpscaler();
    },
    saveSettings: ({ newPrompts, newModelConfig, newSafetySettings, newCustomApiKey }) => {
        const currentState = get();
        const settingsToSave = {
            prompts: newPrompts || currentState.prompts,
            modelConfig: newModelConfig || currentState.modelConfig,
            safetySettings: newSafetySettings || currentState.safetySettings,
        };
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsToSave));
        
        const updates: Partial<AppState> = { ...settingsToSave };
        
        if (newCustomApiKey !== undefined) {
            if (newCustomApiKey.trim() === '') {
                localStorage.removeItem(API_KEY_STORAGE_KEY);
                updates.customApiKey = '';
            } else {
                const encryptedKey = encrypt(newCustomApiKey);
                localStorage.setItem(API_KEY_STORAGE_KEY, encryptedKey);
                updates.customApiKey = newCustomApiKey;
            }
        }
        
        set(updates);

        get().addToast({ title: "Settings Saved", message: "Your new settings have been applied.", type: 'success'});
        get().closeSettings();
    },
    clearData: async () => {
        if (window.confirm('Are you sure you want to delete ALL library images, folders, and settings? This cannot be undone.')) {
            await clearImagesFromDB();
            await clearFoldersFromDB();
            localStorage.removeItem(SETTINGS_STORAGE_KEY);
            localStorage.removeItem(API_KEY_STORAGE_KEY);
            window.location.reload();
        }
    },
  }))
);
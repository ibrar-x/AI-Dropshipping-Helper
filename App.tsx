

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ToastInfo, Prompts, ToolTab, GeneratedImage } from './types';
import { initializeAi, enhancePromptStream } from './services/geminiService';
import Sidebar from './components/Sidebar';
import ToastContainer from './components/ToastContainer';
import { MenuIcon } from './components/icons/MenuIcon';
import SettingsModal from './components/SettingsModal';
import { encrypt, decrypt } from './utils/crypto';
import { defaultPrompts } from './prompts';
import AdGeneratorTab from './components/tabs/AdGeneratorTab';
import EditorTab from './components/tabs/EditorTab';
import UpscalerTab from './components/tabs/UpscalerTab';
import LibraryTab from './components/tabs/LibraryTab';
import BlenderTab from './components/tabs/BlenderTab';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ToolTab>('ads');
  const [toasts, setToasts] = useState<ToastInfo[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  
  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [prompts, setPrompts] = useState<Prompts>(defaultPrompts);
  const [userApiKey, setUserApiKey] = useState('');
  
  // Global Asset Library
  const [library, setLibrary] = useState<GeneratedImage[]>([]);

  // Cross-tool workflow state
  const [recreationData, setRecreationData] = useState<GeneratedImage | null>(null);

  const addToast = useCallback((toast: Omit<ToastInfo, 'id'>) => {
    const newToast = { ...toast, id: Date.now() };
    setToasts(prev => [...prev.filter(t => t.title !== toast.title), newToast]);
  }, []);

  // Load from local storage on initial render
  useEffect(() => {
    try {
      // API Key & Prompts
      const storedKey = localStorage.getItem('userApiKey');
      const decryptedKey = storedKey ? decrypt(storedKey) : '';
      setUserApiKey(decryptedKey);

      const storedPrompts = localStorage.getItem('userPrompts');
      const parsedPrompts = storedPrompts ? { ...defaultPrompts, ...JSON.parse(storedPrompts) } : defaultPrompts;
      setPrompts(parsedPrompts);

      const keyToUse = decryptedKey || process.env.API_KEY;
      if (keyToUse) {
        initializeAi(keyToUse, parsedPrompts);
      } else {
        addToast({ title: 'API Key Missing', message: 'Please add your Google API key in the settings to use the app.', type: 'error' });
      }
      
      // Library
      const storedLibrary = localStorage.getItem('libraryImages');
      if (storedLibrary) {
          const parsedLibrary: GeneratedImage[] = JSON.parse(storedLibrary);
          setLibrary(parsedLibrary);
      }

    } catch (error) {
      console.error("Failed to initialize app state from localStorage", error);
    }
  }, [addToast]);

  // Save library to local storage whenever it changes
  useEffect(() => {
      if (library.length > 0) {
          localStorage.setItem('libraryImages', JSON.stringify(library));
      }
  }, [library]);
  
  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };
  
  const handleSelectTab = (tab: ToolTab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };
  
  const addImagesToLibrary = useCallback((images: GeneratedImage[]) => {
    // Add to library, ensuring no duplicates from failed/re-generated items
    setLibrary(prev => {
        const existingIds = new Set(prev.map(img => img.id));
        const newImages = images.filter(img => !existingIds.has(img.id));
        return [...newImages, ...prev];
    });
  }, []);

  const handleSaveSettings = ({ apiKey, newPrompts }: { apiKey: string; newPrompts: Prompts }) => {
    setUserApiKey(apiKey);
    localStorage.setItem('userApiKey', encrypt(apiKey));
    const keyToUse = apiKey || process.env.API_KEY;
    if (keyToUse) {
        initializeAi(keyToUse, newPrompts);
    } else {
        initializeAi('');
    }

    setPrompts(newPrompts);
    localStorage.setItem('userPrompts', JSON.stringify(newPrompts));
    
    addToast({ title: 'Settings Saved', message: 'Your new settings have been applied.', type: 'success' });
  };

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all settings and library images? This action cannot be undone.')) {
        localStorage.removeItem('userApiKey');
        localStorage.removeItem('userPrompts');
        localStorage.removeItem('libraryImages');
        setPrompts(defaultPrompts);
        setUserApiKey('');
        setLibrary([]);

        const keyToUse = process.env.API_KEY;
        if (keyToUse) {
            initializeAi(keyToUse, defaultPrompts);
        }
        addToast({ title: 'Data Cleared', message: 'All local data has been removed.', type: 'info' });
        setIsSettingsOpen(false);
    }
  };

  const handleUseAsInput = useCallback((tool: ToolTab, image: GeneratedImage) => {
    setRecreationData(image);
    setActiveTab(tool);
  }, []);


  const clearRecreationData = useCallback(() => {
      setRecreationData(null);
  }, []);


  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="min-h-screen bg-dark-bg text-dark-text-primary font-sans flex h-screen w-full overflow-hidden">
        <Sidebar 
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
            onOpenSettings={() => setIsSettingsOpen(true)}
        />
        <div className="flex flex-col flex-1 h-screen relative">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden absolute top-4 left-4 z-20 p-2 bg-dark-surface/80 rounded-md">
                <MenuIcon className="w-6 h-6" />
            </button>
            <main className="flex-1 flex flex-col overflow-y-auto">
              <div className="w-full h-full">
                <div hidden={activeTab !== 'ads'} className="w-full h-full">
                  <AdGeneratorTab addToast={addToast} addImagesToLibrary={addImagesToLibrary} initialImage={recreationData} onDone={clearRecreationData} onUseAsInput={handleUseAsInput} />
                </div>
                <div hidden={activeTab !== 'editor'} className="w-full h-full">
                  <EditorTab addToast={addToast} addImageToLibrary={addImagesToLibrary} initialImage={recreationData} onDone={clearRecreationData} />
                </div>
                <div hidden={activeTab !== 'upscaler'} className="w-full h-full">
                  <UpscalerTab addToast={addToast} addImageToLibrary={addImagesToLibrary} initialImage={recreationData} onDone={clearRecreationData} />
                </div>
                <div hidden={activeTab !== 'blender'} className="w-full h-full">
                  <BlenderTab addToast={addToast} addImageToLibrary={addImagesToLibrary} initialImage={recreationData} onDone={clearRecreationData} />
                </div>
                <div hidden={activeTab !== 'library'} className="w-full h-full">
                  <LibraryTab library={library} onUseAsInput={handleUseAsInput} />
                </div>
              </div>
            </main>
        </div>
      </div>
      {isSettingsOpen && (
        <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            currentApiKey={userApiKey}
            currentPrompts={prompts}
            onSave={handleSaveSettings}
            onClearData={handleClearData}
            onEnhancePrompt={enhancePromptStream}
        />
      )}
    </>
  );
};

export default App;

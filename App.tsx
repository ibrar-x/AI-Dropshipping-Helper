
import React, { useEffect, useState } from 'react';
// FIX: Correct import path for the Zustand store.
import { useAppStore } from './store';
import Sidebar from './components/Sidebar';
import ToastContainer from './components/ToastContainer';
import { MenuIcon } from './components/icons/MenuIcon';
// FIX: Correct import path for SettingsModal component.
import SettingsModal from './components/SettingsModal';
// FIX: Correct import path for geminiService.
import AdGeneratorTab from './components/tabs/AdGeneratorTab';
import EditorTab from './components/tabs/EditorTab';
import UpscalerTab from './components/tabs/UpscalerTab';
import LibraryTab from './components/tabs/LibraryTab';
import BlenderTab from './components/tabs/BlenderTab';
import VisualGeneratorTab from './components/tabs/VisualGeneratorTab';
import ImageUpscaler from './components/ImageUpscaler';
import UpscaleConfirmationModal from './components/UpscaleConfirmationModal';
import LibrarySelectionModal from './components/LibrarySelectionModal';
import { SharedImageData } from './types';
import SharedImageViewer from './components/SharedImageViewer';

const App: React.FC = () => {
  const {
    activeTab,
    isSettingsOpen,
    recreationData,
    initializeApp,
    setSidebarOpen,
    upscalingImage,
    pendingUpscaledImage,
    handleUpscaleSave,
    closeUpscaler,
    resolveUpscaledImage,
  } = useAppStore();

  const [sharedImage, setSharedImage] = useState<SharedImageData | null>(null);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  useEffect(() => {
    const handleHashChange = () => {
        const hash = window.location.hash;
        if (hash.startsWith('#share=')) {
            try {
                const base64Data = hash.substring('#share='.length);
                const jsonString = atob(base64Data);
                const parsedData = JSON.parse(jsonString) as SharedImageData;
                // Basic validation
                if (parsedData.src && parsedData.width && parsedData.height) {
                    setSharedImage(parsedData);
                }
            } catch (error) {
                console.error("Failed to parse share data from URL hash:", error);
                window.location.hash = '';
            }
        }
    };
    
    handleHashChange(); // Check on initial load
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
        window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const closeSharedImageViewer = () => {
    setSharedImage(null);
    if (window.history.pushState) {
        window.history.pushState("", document.title, window.location.pathname + window.location.search);
    } else {
        window.location.hash = '';
    }
  }

  return (
    <>
      <ToastContainer />
      <LibrarySelectionModal />
      <div className="min-h-screen bg-dark-bg text-dark-text-primary font-sans flex h-screen w-full overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 h-screen relative">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden absolute top-4 left-4 z-20 p-2 bg-dark-surface/80 rounded-md">
                <MenuIcon className="w-6 h-6" />
            </button>
            <main className="flex-1 flex flex-col overflow-y-auto">
              <div className="w-full h-full">
                <div hidden={activeTab !== 'ads'} className="w-full h-full">
                  <AdGeneratorTab initialImage={recreationData?.tool === 'ads' ? recreationData.image : undefined} />
                </div>
                <div hidden={activeTab !== 'editor'} className="w-full h-full">
                  <EditorTab initialImage={recreationData?.tool === 'editor' ? recreationData.image : undefined} />
                </div>
                <div hidden={activeTab !== 'upscaler'} className="w-full h-full">
                  <UpscalerTab initialImage={recreationData?.tool === 'upscaler' ? recreationData.image : undefined} />
                </div>
                <div hidden={activeTab !== 'blender'} className="w-full h-full">
                  <BlenderTab initialImage={recreationData?.tool === 'blender' ? recreationData.image : undefined} />
                </div>
                 <div hidden={activeTab !== 'visuals'} className="w-full h-full">
                  <VisualGeneratorTab />
                </div>
                <div hidden={activeTab !== 'library'} className="w-full h-full">
                  <LibraryTab />
                </div>
              </div>
            </main>
        </div>
      </div>
      {isSettingsOpen && (
// FIX: The onEnhancePrompt prop does not exist on the SettingsModal component.
        <SettingsModal />
      )}
      {upscalingImage && !pendingUpscaledImage && (
        <ImageUpscaler
            image={upscalingImage}
            onSave={handleUpscaleSave}
            onCancel={closeUpscaler}
        />
      )}
      {pendingUpscaledImage && (
        <UpscaleConfirmationModal
            onConfirm={resolveUpscaledImage}
            onCancel={closeUpscaler}
        />
      )}
      {sharedImage && (
          <SharedImageViewer imageData={sharedImage} onClose={closeSharedImageViewer} />
      )}
    </>
  );
};

export default App;
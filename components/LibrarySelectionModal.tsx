import React, { useState } from 'react';
import { useAppStore } from '../store';
// FIX: Changed GeneratedImage to LibraryImage to match the type expected by the onSelect callback.
import { LibraryImage } from '../types';
import { XIcon } from './icons/XIcon';
import { CheckIcon } from './icons/CheckIcon';

const LibrarySelectionModal: React.FC = () => {
    const {
        library,
        isLibrarySelectionOpen,
        librarySelectionConfig,
        closeLibrarySelector,
    } = useAppStore();

    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    if (!isLibrarySelectionOpen || !librarySelectionConfig) {
        return null;
    }
    
    const { onSelect, multiple } = librarySelectionConfig;

    const handleSelect = (image: LibraryImage) => {
        if (multiple) {
            setSelectedIds(prev =>
                prev.includes(image.id)
                    ? prev.filter(id => id !== image.id)
                    : [...prev, image.id]
            );
        } else {
            onSelect([image]);
            closeLibrarySelector();
        }
    };

    const handleConfirm = () => {
        const selectedImages = library.filter(img => selectedIds.includes(img.id));
        onSelect(selectedImages);
        closeLibrarySelector();
    };
    
    const handleClose = () => {
        setSelectedIds([]);
        closeLibrarySelector();
    }

    return (
        <div className="fixed inset-0 bg-black/80 z-[51] flex items-center justify-center p-4 animate-fade-in text-dark-text-primary" onClick={handleClose}>
            <div className="bg-dark-surface rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-dark-border flex-shrink-0">
                    <h2 className="text-xl font-bold">Select from Library</h2>
                    <button onClick={handleClose} className="text-dark-text-secondary hover:text-dark-text-primary rounded-full p-1">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto">
                    {library.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {library.map(image => (
                                <div key={image.id} className="relative group aspect-square cursor-pointer" onClick={() => handleSelect(image)}>
                                    <img 
                                        src={image.thumbnailSrc || image.src} 
                                        alt="Library asset" 
                                        className="w-full h-full object-cover rounded-lg border-2 transition-colors border-transparent group-hover:border-brand-primary"
                                    />
                                    <div className={`absolute inset-0 bg-black/60 rounded-lg transition-opacity duration-300 ${selectedIds.includes(image.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></div>
                                    <div 
                                        className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 
                                            ${selectedIds.includes(image.id) ? 'bg-brand-primary border-brand-primary' : 'bg-dark-surface/50 border-white/50 group-hover:border-white'}`}
                                    >
                                        {selectedIds.includes(image.id) && <CheckIcon className="w-4 h-4 text-white" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-dark-text-secondary py-12">Your library is empty.</p>
                    )}
                </div>

                {multiple && (
                    <div className="flex justify-end items-center gap-4 p-4 border-t border-dark-border flex-shrink-0 bg-dark-bg/50 rounded-b-xl">
                        <button 
                            onClick={handleConfirm} 
                            disabled={selectedIds.length === 0}
                            className="px-6 py-2 text-sm font-semibold bg-brand-primary text-white rounded-md hover:bg-brand-secondary disabled:opacity-50"
                        >
                            Confirm Selection ({selectedIds.length})
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LibrarySelectionModal;
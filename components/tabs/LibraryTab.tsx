
import React, { useState, useCallback } from 'react';
import { GeneratedImage, ToolTab } from '../../types';
import { EmptyStateIllustration } from '../icons/EmptyStateIllustration';
import { downloadImage } from '../../utils/imageUtils';
import { DownloadIcon } from '../icons/DownloadIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { XIcon } from '../icons/XIcon';
import { BrushIcon } from '../icons/BrushIcon';
import { UpscaleIcon } from '../icons/UpscaleIcon';
import { MegaphoneIcon } from '../icons/MegaphoneIcon';

interface LibraryTabProps {
    library: GeneratedImage[];
    onUseAsInput: (tool: ToolTab, image: GeneratedImage) => void;
}

const LibraryImageCard: React.FC<{
    image: GeneratedImage,
    isSelected: boolean,
    onSelect: (id: string) => void,
    onUseAsInput: (tool: ToolTab, image: GeneratedImage) => void,
}> = ({ image, isSelected, onSelect, onUseAsInput }) => {
    return (
        <div className="relative group aspect-square" onClick={() => onSelect(image.id)}>
            <img 
                src={image.thumbnailSrc || image.src} 
                alt="Library asset" 
                className="w-full h-full object-cover rounded-lg border-2 transition-colors border-transparent group-hover:border-brand-primary"
            />
            <div className={`absolute inset-0 bg-black/70 rounded-lg transition-opacity duration-300 pointer-events-none ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></div>

            <div 
                className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 cursor-pointer 
                    ${isSelected ? 'bg-brand-primary border-brand-primary' : 'bg-dark-surface/50 border-white/50 group-hover:border-white'}`}
            >
                {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
            </div>

            <div className={`absolute bottom-2 left-2 right-2 flex justify-center gap-2 transition-opacity duration-300 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <button onClick={(e) => { e.stopPropagation(); onUseAsInput('ads', image); }} title="New Ad" className="p-2 bg-dark-surface/80 rounded-md hover:bg-dark-surface"><MegaphoneIcon className="w-5 h-5"/></button>
                <button onClick={(e) => { e.stopPropagation(); onUseAsInput('editor', image); }} title="Edit" className="p-2 bg-dark-surface/80 rounded-md hover:bg-dark-surface"><BrushIcon className="w-5 h-5"/></button>
                <button onClick={(e) => { e.stopPropagation(); onUseAsInput('upscaler', image); }} title="Upscale" className="p-2 bg-dark-surface/80 rounded-md hover:bg-dark-surface"><UpscaleIcon className="w-5 h-5"/></button>
            </div>
        </div>
    );
};


const LibraryTab: React.FC<LibraryTabProps> = ({ library, onUseAsInput }) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    const toggleSelection = useCallback((id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    }, []);

    const handleDownloadSelected = () => {
        library
            .filter(img => selectedIds.includes(img.id))
            .forEach((img, index) => {
                setTimeout(() => {
                    downloadImage(img.src, `asset-${img.id.slice(-6)}`, 'png');
                }, index * 300); // Stagger downloads slightly
            });
    };

    if (library.length === 0) {
        return (
             <div className="flex-1 flex flex-col items-center justify-center text-center p-4 animate-fade-in -mt-16 h-full">
                <EmptyStateIllustration className="w-64 h-64 text-dark-text-secondary" />
                <h1 className="text-3xl md:text-4xl font-bold text-dark-text-primary mt-6">
                    Your Library is Empty
                </h1>
                <p className="mt-2 max-w-md text-md text-dark-text-secondary">
                    Use the Ad Generator, Editor, or Upscaler tools to create new assets. Your results will appear here.
                </p>
            </div>
        );
    }
    
    return (
        <div className="flex-1 flex flex-col w-full h-full bg-dark-bg">
            <header className="p-4 border-b border-dark-border flex-shrink-0">
                {selectedIds.length > 0 ? (
                    <div className="flex justify-between items-center animate-fade-in">
                        <h2 className="text-xl font-bold">{selectedIds.length} item(s) selected</h2>
                        <div className="flex items-center gap-3">
                            <button onClick={handleDownloadSelected} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-brand-primary text-white rounded-md hover:bg-brand-secondary">
                                <DownloadIcon className="w-4 h-4" />
                                Download
                            </button>
                             <button onClick={() => setSelectedIds([])} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-dark-input hover:bg-dark-border border border-dark-border rounded-md">
                                <XIcon className="w-4 h-4" />
                                Deselect All
                            </button>
                        </div>
                    </div>
                ) : (
                    <h2 className="text-xl font-bold">Library</h2>
                )}
            </header>
            <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {library.map(image => (
                        <LibraryImageCard
                            key={image.id}
                            image={image}
                            isSelected={selectedIds.includes(image.id)}
                            onSelect={toggleSelection}
                            onUseAsInput={onUseAsInput}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LibraryTab;

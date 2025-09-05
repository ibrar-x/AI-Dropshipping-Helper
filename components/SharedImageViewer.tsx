import React from 'react';
import { SharedImageData } from '../types';
import { XIcon } from './icons/XIcon';

interface SharedImageViewerProps {
  imageData: SharedImageData;
  onClose: () => void;
}

const MetaField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <h3 className="text-xs font-bold uppercase text-dark-text-secondary mb-1">{label}</h3>
        <div className="text-sm bg-dark-input p-2 rounded-md break-words">{children || <span className="text-dark-text-secondary">N/A</span>}</div>
    </div>
);


export const SharedImageViewer: React.FC<SharedImageViewerProps> = ({ imageData, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-dark-surface rounded-xl shadow-2xl w-full h-full flex flex-col md:flex-row overflow-hidden" onClick={e => e.stopPropagation()}>
                <main className="flex-1 flex items-center justify-center bg-dark-bg p-4">
                    <img src={imageData.src} alt="Shared asset" className="max-w-full max-h-full object-contain" />
                </main>
                <aside className="w-full md:w-80 border-t md:border-t-0 md:border-l border-dark-border flex flex-col bg-dark-bg">
                    <header className="p-3 border-b border-dark-border flex-shrink-0 flex justify-between items-center">
                        <h2 className="text-lg font-bold truncate">Shared Image</h2>
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-dark-input"><XIcon className="w-5 h-5" /></button>
                    </header>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                         <MetaField label="Shared On">
                            {new Date(imageData.createdAt).toLocaleString()}
                        </MetaField>
                        <MetaField label="Dimensions">
                            {imageData.width} x {imageData.height}
                        </MetaField>
                        {imageData.prompt && <MetaField label="Prompt">{imageData.prompt}</MetaField>}
                        {imageData.notes && <MetaField label="Notes">{imageData.notes}</MetaField>}
                    </div>
                     <footer className="p-4 border-t border-dark-border bg-dark-surface flex-shrink-0">
                        <p className="text-xs text-center text-dark-text-secondary">Powered by AI Product Studio</p>
                    </footer>
                </aside>
            </div>
        </div>
    );
};

export default SharedImageViewer;
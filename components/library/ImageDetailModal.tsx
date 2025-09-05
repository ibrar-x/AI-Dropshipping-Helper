import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../../store';
import { LibraryImage, SharedImageData } from '../../types';
import { XIcon } from '../icons/XIcon';
import { downloadImage } from '../../utils/imageUtils';
import { DownloadIcon } from '../icons/DownloadIcon';
import { MegaphoneIcon } from '../icons/MegaphoneIcon';
import { BrushIcon } from '../icons/BrushIcon';
import { UpscaleIcon } from '../icons/UpscaleIcon';
import { HeartIcon } from '../icons/HeartIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { ShareIcon } from '../icons/ShareIcon';
import { CopyIcon } from '../icons/CopyIcon';
import { CheckIcon } from '../icons/CheckIcon';

interface ImageDetailModalProps {
    imageId: string;
    onClose: () => void;
}

const MetaField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <h3 className="text-xs font-bold uppercase text-dark-text-secondary mb-1">{label}</h3>
        <div className="text-sm bg-dark-input p-2 rounded-md break-words">{children}</div>
    </div>
);

const ShareLinkModal: React.FC<{ link: string; onClose: () => void; }> = ({ link, onClose }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[52] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-dark-surface rounded-xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Share Image</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-dark-input"><XIcon className="w-5 h-5" /></button>
                </div>
                <p className="text-sm text-dark-text-secondary mb-4">
                    Anyone with this link can view a copy of the image. The image data is embedded in the link itself.
                </p>
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        readOnly
                        value={link}
                        className="flex-1 w-full text-sm rounded-lg border-dark-border bg-dark-input p-2 text-dark-text-secondary"
                    />
                    <button onClick={handleCopy} className="px-3 py-2 text-sm font-semibold bg-brand-primary text-white rounded-md hover:bg-brand-secondary flex items-center gap-2">
                        {copied ? <CheckIcon className="w-5 h-5"/> : <CopyIcon className="w-5 h-5"/>}
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                </div>
            </div>
        </div>
    );
};


const ImageDetailModal: React.FC<ImageDetailModalProps> = ({ imageId, onClose }) => {
    const { library, updateImage, useAsInput, addToast } = useAppStore();
    const image = useMemo(() => library.find(img => img.id === imageId), [imageId, library]);

    const [notes, setNotes] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [currentTag, setCurrentTag] = useState('');
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [exportFormat, setExportFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');
    const [shareLink, setShareLink] = useState<string | null>(null);

    useEffect(() => {
        if (image) {
            setNotes(image.notes || '');
            setTags(image.tags || []);
        }
    }, [image]);

    if (!image) return null;

    const handleNotesSave = () => {
        updateImage(image.id, { notes });
        setIsEditingNotes(false);
    };

    const handleAddTag = () => {
        const newTag = currentTag.trim();
        if (newTag && !tags.includes(newTag)) {
            const newTags = [...tags, newTag];
            setTags(newTags);
            updateImage(image.id, { tags: newTags });
        }
        setCurrentTag('');
    };

    const handleRemoveTag = (tagToRemove: string) => {
        const newTags = tags.filter(tag => tag !== tagToRemove);
        setTags(newTags);
        updateImage(image.id, { tags: newTags });
    };
    
    const handleToggleFavorite = () => {
        updateImage(image.id, { isFavorite: !image.isFavorite });
    }
    
    const handleDownload = () => {
        downloadImage(image.src, `asset-${image.id.slice(-6)}`, exportFormat);
    }
    
    const handleUseAsInput = (tool: 'ads' | 'editor' | 'upscaler') => {
        useAsInput(tool, image);
        onClose();
    };

    const handleGenerateShareLink = () => {
        if (!image) return;
        try {
            const shareData: SharedImageData = {
                src: image.src,
                prompt: image.prompt,
                notes: image.notes,
                width: image.width,
                height: image.height,
                createdAt: image.createdAt,
            };
            const jsonString = JSON.stringify(shareData);
            const base64Data = btoa(unescape(encodeURIComponent(jsonString))); // Handle UTF-8 characters
            const url = `${window.location.origin}${window.location.pathname}#share=${base64Data}`;
            setShareLink(url);
        } catch (error) {
            console.error("Failed to create share link:", error);
            addToast({
                title: 'Sharing Error',
                message: 'Could not create the share link. The image data might be too large.',
                type: 'error',
            });
        }
    }

    return (
        <>
            <div className="fixed inset-0 bg-black/80 z-50 flex p-4 animate-fade-in" onClick={onClose}>
                <div className="bg-dark-surface rounded-xl shadow-2xl w-full h-full flex flex-col md:flex-row overflow-hidden" onClick={e => e.stopPropagation()}>
                    <main className="flex-1 flex items-center justify-center bg-dark-bg p-4">
                        <img src={image.src} alt="Library asset detail" className="max-w-full max-h-full object-contain" />
                    </main>
                    <aside className="w-full md:w-80 border-t md:border-t-0 md:border-l border-dark-border flex flex-col bg-dark-bg">
                        <header className="p-3 border-b border-dark-border flex-shrink-0 flex justify-between items-center">
                            <h2 className="text-lg font-bold truncate">Details</h2>
                            <button onClick={onClose} className="p-1 rounded-full hover:bg-dark-input"><XIcon className="w-5 h-5" /></button>
                        </header>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            <MetaField label="Created">
                                {new Date(image.createdAt).toLocaleString()}
                            </MetaField>
                            <MetaField label="Dimensions">
                                {image.width} x {image.height}
                            </MetaField>
                            {image.prompt && <MetaField label="Prompt">{image.prompt}</MetaField>}
                            
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <h3 className="text-xs font-bold uppercase text-dark-text-secondary">Notes</h3>
                                    {!isEditingNotes && <button onClick={() => setIsEditingNotes(true)} className="text-xs p-1"><PencilIcon className="w-3 h-3"/></button>}
                                </div>
                                {isEditingNotes ? (
                                    <div>
                                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} className="w-full text-sm bg-dark-input p-2 rounded-md border border-dark-border" />
                                        <div className="flex gap-2 mt-1">
                                            <button onClick={() => setIsEditingNotes(false)} className="flex-1 text-xs bg-dark-border rounded py-1">Cancel</button>
                                            <button onClick={handleNotesSave} className="flex-1 text-xs bg-brand-primary text-white rounded py-1">Save</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-sm bg-dark-input p-2 rounded-md min-h-[40px] whitespace-pre-wrap">{notes || <span className="text-dark-text-secondary">No notes</span>}</div>
                                )}
                            </div>
                            
                            <div>
                                <h3 className="text-xs font-bold uppercase text-dark-text-secondary mb-1">Tags</h3>
                                <div className="bg-dark-input p-2 rounded-md">
                                    <div className="flex flex-wrap gap-1">
                                        {tags.map(tag => (
                                            <div key={tag} className="flex items-center gap-1 bg-dark-surface text-xs px-2 py-0.5 rounded-full">
                                                {tag}
                                                <button onClick={() => handleRemoveTag(tag)}><XIcon className="w-3 h-3"/></button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-1 mt-2">
                                        <input type="text" value={currentTag} onChange={e => setCurrentTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTag()} placeholder="Add a tag..." className="flex-1 bg-transparent text-sm focus:outline-none"/>
                                        <button onClick={handleAddTag} className="text-xs font-semibold bg-dark-border px-2 rounded">Add</button>
                                    </div>
                                </div>
                            </div>

                        </div>
                        <footer className="p-4 border-t border-dark-border bg-dark-surface flex-shrink-0 space-y-3">
                            <div className="flex items-center gap-2">
                                <button onClick={handleGenerateShareLink} className="flex items-center justify-center gap-2 bg-dark-input hover:bg-dark-border text-dark-text-primary text-sm font-semibold px-3 py-2 rounded-md w-1/4"><ShareIcon className="w-4 h-4" /></button>
                                <button onClick={() => handleUseAsInput('ads')} className="flex-1 flex items-center justify-center gap-2 bg-dark-input hover:bg-dark-border text-dark-text-primary text-sm font-semibold px-3 py-2 rounded-md"><MegaphoneIcon className="w-4 h-4" /> <span>Ad</span></button>
                                <button onClick={() => handleUseAsInput('editor')} className="flex-1 flex items-center justify-center gap-2 bg-dark-input hover:bg-dark-border text-dark-text-primary text-sm font-semibold px-3 py-2 rounded-md"><BrushIcon className="w-4 h-4" /> <span>Edit</span></button>
                                <button onClick={() => handleUseAsInput('upscaler')} className="flex-1 flex items-center justify-center gap-2 bg-dark-input hover:bg-dark-border text-dark-text-primary text-sm font-semibold px-3 py-2 rounded-md"><UpscaleIcon className="w-4 h-4" /> <span>Upscale</span></button>
                                <button onClick={handleToggleFavorite} className={`p-2 rounded-md ${image.isFavorite ? 'bg-red-500/20 text-red-400' : 'bg-dark-input hover:bg-dark-border'}`}>
                                    <HeartIcon className="w-5 h-5"/>
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <select value={exportFormat} onChange={e => setExportFormat(e.target.value as any)} className="text-sm bg-dark-input border border-dark-border rounded-md p-2.5">
                                    <option value="jpeg">JPG</option>
                                    <option value="png">PNG</option>
                                    <option value="webp">WEBP</option>
                                </select>
                                <button onClick={handleDownload} className="flex-1 flex items-center justify-center gap-2 bg-brand-primary text-white font-bold py-2.5 px-4 rounded-lg hover:bg-brand-secondary">
                                    <DownloadIcon className="w-5 h-5"/> Download
                                </button>
                            </div>
                        </footer>
                    </aside>
                </div>
            </div>
            {shareLink && <ShareLinkModal link={shareLink} onClose={() => setShareLink(null)} />}
        </>
    );
};

export default ImageDetailModal;
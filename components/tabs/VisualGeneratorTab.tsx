
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store';
import { LibraryImage } from '../../types';
import { generateVisualsFromText } from '../../services/geminiService';
import { MagicWandIcon } from '../icons/MagicWandIcon';
import Loader from '../Loader';
import { EmptyStateIllustration } from '../icons/EmptyStateIllustration';
import { HistoryIcon } from '../icons/HistoryIcon';
import { DownloadIcon } from '../icons/DownloadIcon';
import { BrushIcon } from '../icons/BrushIcon';
import { UpscaleIcon } from '../icons/UpscaleIcon';
import { XIcon } from '../icons/XIcon';
import { downloadImage } from '../../utils/imageUtils';

const ASPECT_RATIOS = [
    { label: 'Square (1:1)', value: '1:1' },
    { label: 'Portrait (9:16)', value: '9:16' },
    { label: 'Landscape (16:9)', value: '16:9' },
    { label: 'Widescreen (4:3)', value: '4:3' },
    { label: 'Tall (3:4)', value: '3:4' },
];

const STYLES = ['Default', 'Photorealistic', 'Cinematic', 'Minimalist', 'Illustration', 'Surreal', 'Vintage'];

const SURPRISE_PROMPTS = [
    "A clean, white marble countertop with soft, natural morning light from a window and a small, out-of-focus green plant in the background.",
    "A vibrant flat-lay on a pastel-colored background, surrounded by related items that tell a story about its use. The camera angle is directly from above.",
    "A sleek, modern shot on a floating concrete shelf against a textured grey wall. The lighting is dramatic and focused, creating long shadows.",
    "A rustic dark wood table, next to a steaming cup of coffee in a ceramic mug. The mood is cozy and warm.",
    "Abstract swirling patterns of liquid metal, gold and silver, on a dark background, macro photography.",
    "A minimal studio background with a single, large, soft-colored geometric shape casting a long, soft shadow."
];

const STOP_WORDS = new Set(['a', 'an', 'the', 'in', 'on', 'of', 'with', 'for', 'and', 'to', 'by', 'photo', 'image', 'shot', 'of', 'a']);

const ActionButton: React.FC<{ onClick: (e: React.MouseEvent) => void; title: string; children: React.ReactNode }> = ({ onClick, title, children }) => {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation(); // Prevent card's onView from firing
                onClick(e);
            }}
            className="relative group/button bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white rounded-full p-2 transition-all"
        >
            {children}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-dark-surface text-white text-xs rounded-md opacity-0 group-hover/button:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                {title}
            </div>
        </button>
    );
};

const ResultCard: React.FC<{ image: LibraryImage; onUpscale: () => void; onEdit: () => void; onView: () => void; onDownload: () => void; }> = ({ image, onUpscale, onEdit, onView, onDownload }) => {
    return (
        <div className="relative group aspect-square overflow-hidden rounded-lg" onClick={onView}>
            <img 
                src={image.thumbnailSrc || image.src} 
                alt="Generated visual" 
                className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="absolute bottom-3 left-3 right-3 flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <ActionButton onClick={onUpscale} title="Upscale">
                    <UpscaleIcon className="w-5 h-5" />
                </ActionButton>
                <ActionButton onClick={onEdit} title="Edit">
                    <BrushIcon className="w-5 h-5" />
                </ActionButton>
                <ActionButton onClick={onDownload} title="Download">
                    <DownloadIcon className="w-5 h-5" />
                </ActionButton>
            </div>
        </div>
    );
};


const VisualGeneratorTab: React.FC = () => {
    const { addToast, addImagesToLibrary, useAsInput, openUpscaler } = useAppStore();
    
    const [prompt, setPrompt] = useState('');
    const [style, setStyle] = useState(STYLES[0]);
    const [colors, setColors] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [count, setCount] = useState(2);
    const [promptHistory, setPromptHistory] = useState<string[]>([]);
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [results, setResults] = useState<LibraryImage[]>([]);
    const [viewingImageSrc, setViewingImageSrc] = useState<string | null>(null);

    const constructFinalPrompt = () => {
        let finalPrompt = prompt.trim();
        if (style !== 'Default') {
            finalPrompt = `${style} style, ${finalPrompt}`;
        }
        if (colors.trim()) {
            finalPrompt += `, featuring a color palette of ${colors.trim()}`;
        }
        return finalPrompt;
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            addToast({ title: 'Prompt Required', message: 'Please enter a prompt to generate visuals.', type: 'error' });
            return;
        }

        const finalPrompt = constructFinalPrompt();

        setIsGenerating(true);
        setResults([]);
        
        // Update history
        setPromptHistory(prev => {
            const newHistory = [prompt, ...prev.filter(p => p !== prompt)];
            return newHistory.slice(0, 10); // Keep last 10
        });

        try {
            const generatedImages = await generateVisualsFromText(finalPrompt, aspectRatio, count);
            
            const tags = finalPrompt.split(/[\s,]+/)
                .map(tag => tag.toLowerCase().trim())
                .filter(tag => tag.length > 2 && !STOP_WORDS.has(tag))
                .slice(0, 5); // Max 5 tags

            const savedImages = await addImagesToLibrary(generatedImages.map(img => ({
                src: img.src,
                prompt: finalPrompt,
                tags,
            })));
            
            setResults(savedImages);

            addToast({ title: 'Generation Complete', message: `${savedImages.length} new visuals added to your library.`, type: 'success' });
        } catch (error) {
            console.error(error);
            addToast({ title: 'Generation Failed', message: error instanceof Error ? error.message : 'An unknown error occurred.', type: 'error' });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleSurpriseMe = () => {
        const randomPrompt = SURPRISE_PROMPTS[Math.floor(Math.random() * SURPRISE_PROMPTS.length)];
        setPrompt(randomPrompt);
    }
    
    const handleUseHistory = (selectedPrompt: string) => {
        setPrompt(selectedPrompt);
    }

    return (
        <div className="flex-1 flex flex-col md:flex-row w-full h-full bg-dark-bg overflow-hidden">
            {/* Controls Panel */}
            <aside className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-dark-border flex-shrink-0">
                 <fieldset disabled={isGenerating} className="h-full flex flex-col">
                    <div className="p-4 border-b border-dark-border">
                        <h2 className="text-xl font-bold">Visual Generator</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Prompt Section */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-semibold text-dark-text-secondary">Prompt</label>
                                <div className="flex items-center gap-2">
                                     <div className="relative group">
                                        <button className="p-1.5 rounded-md hover:bg-dark-input">
                                            <HistoryIcon className="w-4 h-4 text-dark-text-secondary" />
                                        </button>
                                        {promptHistory.length > 0 && (
                                            <div className="absolute top-full right-0 mt-1 w-64 bg-dark-surface border border-dark-border rounded-md shadow-lg z-10 hidden group-hover:block">
                                                {promptHistory.map((p, i) => (
                                                    <button key={i} onClick={() => handleUseHistory(p)} className="block w-full text-left px-3 py-1.5 text-xs truncate hover:bg-dark-input">{p}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={handleSurpriseMe} className="text-xs font-semibold flex items-center gap-1.5 bg-dark-input px-2 py-1 rounded-md hover:bg-dark-border">
                                        <MagicWandIcon className="w-3 h-3"/> Surprise Me
                                    </button>
                                </div>
                            </div>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                rows={5}
                                className="w-full text-base rounded-lg border-dark-border bg-dark-input shadow-sm focus:border-brand-primary focus:ring-brand-primary px-3 py-2 resize-y"
                                placeholder="e.g., A clean, white marble countertop with soft, natural morning light..."
                            />
                        </div>
                        {/* Customization Section */}
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-semibold text-dark-text-secondary mb-2">Style</label>
                                <select value={style} onChange={e => setStyle(e.target.value)} className="w-full text-sm rounded-lg border-dark-border bg-dark-input p-2.5">
                                    {STYLES.map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                             <div>
                                <label className="block text-sm font-semibold text-dark-text-secondary mb-2">Color Palette (Optional)</label>
                                <input
                                    type="text"
                                    value={colors}
                                    onChange={e => setColors(e.target.value)}
                                    placeholder="e.g., earth tones, beige, green"
                                    className="w-full text-sm rounded-lg border-dark-border bg-dark-input p-2"
                                />
                            </div>
                        </div>
                         {/* Settings Section */}
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div>
                                <label className="block text-sm font-semibold text-dark-text-secondary mb-2">Aspect Ratio</label>
                                <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="w-full text-sm rounded-lg border-dark-border bg-dark-input p-2.5">
                                    {ASPECT_RATIOS.map(ar => <option key={ar.value} value={ar.value}>{ar.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-dark-text-secondary mb-2">Images</label>
                                <input
                                    type="number"
                                    min="1" max="4"
                                    value={count}
                                    onChange={e => setCount(Math.max(1, Math.min(4, parseInt(e.target.value, 10) || 1)))}
                                    className="w-full text-sm rounded-lg border-dark-border bg-dark-input p-2"
                                />
                            </div>
                        </div>
                    </div>
                    {/* Action Button */}
                    <div className="p-4 border-t border-dark-border bg-dark-surface flex-shrink-0">
                        <button
                            onClick={handleGenerate}
                            className="w-full flex items-center justify-center gap-2 bg-brand-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-brand-secondary transition-all disabled:opacity-50"
                        >
                            <MagicWandIcon className="w-5 h-5" />
                            {isGenerating ? 'Generating...' : `Generate ${count} Visual${count > 1 ? 's' : ''}`}
                        </button>
                    </div>
                 </fieldset>
            </aside>

            {/* Workspace Panel */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                {isGenerating && <Loader message="Generating visuals..." count={count} />}
                
                {!isGenerating && results.length > 0 && (
                     <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
                        {results.map(image => (
                            <ResultCard 
                                key={image.id} 
                                image={image}
                                onView={() => setViewingImageSrc(image.src)}
                                onUpscale={() => openUpscaler(image)}
                                onEdit={() => useAsInput('editor', image)}
                                onDownload={() => downloadImage(image.src, `visual-${image.id.slice(-6)}`)}
                            />
                        ))}
                    </div>
                )}
                
                {!isGenerating && results.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <EmptyStateIllustration className="w-48 h-48" />
                        <h2 className="mt-4 text-xl font-bold">Create a New Visual</h2>
                        <p className="mt-1 max-w-sm text-md text-dark-text-secondary">
                          Use the controls on the left to describe the image you want to create. Your results will appear here.
                        </p>
                    </div>
                )}
            </main>
            
            {/* Fullscreen Viewer */}
            {viewingImageSrc && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setViewingImageSrc(null)}>
                    <img src={viewingImageSrc} alt="Viewing visual" className="max-w-full max-h-full object-contain" />
                    <button className="absolute top-4 right-4 text-white p-2 bg-black/50 rounded-full hover:bg-black/70"><XIcon className="w-6 h-6" /></button>
                </div>
            )}
        </div>
    );
};

export default VisualGeneratorTab;

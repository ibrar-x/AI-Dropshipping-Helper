import React, { useState } from 'react';
import { useAppStore } from '../../store';
// FIX: Changed GeneratedImage to LibraryImage to match the type of data returned from the library and expected by useAsInput.
import { LibraryImage } from '../../types';
import { generateVisualsFromText } from '../../services/geminiService';
import { MagicWandIcon } from '../icons/MagicWandIcon';
import Loader from '../Loader';
import { PhotoIcon } from '../icons/PhotoIcon';

const ASPECT_RATIOS = [
    { label: 'Square (1:1)', value: '1:1' },
    { label: 'Portrait (9:16)', value: '9:16' },
    { label: 'Landscape (16:9)', value: '16:9' },
    { label: 'Widescreen (4:3)', value: '4:3' },
    { label: 'Tall (3:4)', value: '3:4' },
];

const VisualGeneratorTab: React.FC = () => {
    const { addToast, addImagesToLibrary, useAsInput } = useAppStore();
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [count, setCount] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    // FIX: Changed state to hold LibraryImage[] to align with the data saved to and returned from the library.
    const [results, setResults] = useState<LibraryImage[]>([]);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            addToast({ title: 'Prompt Required', message: 'Please enter a prompt to generate visuals.', type: 'error' });
            return;
        }
        setIsGenerating(true);
        setResults([]);
        try {
            const generatedImages = await generateVisualsFromText(prompt, aspectRatio, count);
            
            const savedImages = await addImagesToLibrary(generatedImages.map(img => ({
                src: img.src,
                prompt: prompt,
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

    return (
        <div className="flex-1 flex flex-col w-full h-full bg-dark-bg overflow-y-auto">
            <div className="w-full max-w-3xl mx-auto p-4 md:p-8 space-y-6">
                <div className="text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-dark-text-primary">Visual Generator</h1>
                    <p className="mt-2 text-md text-dark-text-secondary">
                        Create stunning backgrounds, textures, and scenes from just a text description.
                    </p>
                </div>

                <div className="bg-dark-surface p-4 rounded-lg border border-dark-border space-y-4">
                    <div>
                        <label htmlFor="visual-prompt" className="block text-sm font-semibold text-dark-text-secondary mb-2">Prompt</label>
                        <textarea
                            id="visual-prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows={4}
                            className="w-full text-base rounded-lg border-dark-border bg-dark-input shadow-sm focus:border-brand-primary focus:ring-brand-primary px-3 py-2 resize-y"
                            placeholder="e.g., A clean, white marble countertop with soft, natural morning light..."
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="aspect-ratio" className="block text-sm font-semibold text-dark-text-secondary mb-2">Aspect Ratio</label>
                            <select
                                id="aspect-ratio"
                                value={aspectRatio}
                                onChange={e => setAspectRatio(e.target.value)}
                                className="w-full text-sm rounded-lg border-dark-border bg-dark-input p-2.5"
                            >
                                {ASPECT_RATIOS.map(ar => <option key={ar.value} value={ar.value}>{ar.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="image-count" className="block text-sm font-semibold text-dark-text-secondary mb-2">Number of Images</label>
                            <input
                                id="image-count"
                                type="number"
                                min="1"
                                max="4"
                                value={count}
                                onChange={e => setCount(Math.max(1, Math.min(4, parseInt(e.target.value, 10))))}
                                className="w-full text-sm rounded-lg border-dark-border bg-dark-input p-2"
                            />
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full flex items-center justify-center gap-2 bg-brand-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-brand-secondary transition-all disabled:opacity-50"
                >
                    <MagicWandIcon className="w-5 h-5" />
                    {isGenerating ? 'Generating...' : `Generate ${count} Visual${count > 1 ? 's' : ''}`}
                </button>
                
                {isGenerating && <Loader message="Generating visuals..." count={count} />}

                {results.length > 0 && (
                     <div className="space-y-4 pt-4 border-t border-dark-border">
                        <h2 className="text-xl font-bold">Results</h2>
                        <div className="grid grid-cols-2 gap-4">
                            {results.map(image => (
                                <div key={image.id} className="relative group aspect-square">
                                    <img src={image.thumbnailSrc || image.src} alt="Generated visual" className="w-full h-full object-cover rounded-lg" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                        <button 
                                            onClick={() => useAsInput('blender', image)}
                                            className="text-white text-sm font-semibold bg-white/10 backdrop-blur-sm px-3 py-2 rounded-md hover:bg-white/20"
                                        >
                                            Use in Blender
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VisualGeneratorTab;
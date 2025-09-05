import React, { useState, useEffect } from 'react';
import { AdBrief, ToastInfo } from '../types';
import { MagicWandIcon } from './icons/MagicWandIcon';

interface PlatformContentGeneratorProps {
    platform: string;
    // FIX: Add brief prop to fix type error in AdGeneratorTab.tsx.
    brief: AdBrief;
    addToast: (toast: Omit<ToastInfo, 'id'>) => void;
    generatedContent: string;
    isLoading: boolean;
    onGenerate: (prompt: string) => Promise<void>;
}

const PlatformContentGenerator: React.FC<PlatformContentGeneratorProps> = ({ platform, brief, addToast, generatedContent, isLoading, onGenerate }) => {
    const [prompt, setPrompt] = useState('');

    // FIX: Use useEffect to set a context-aware prompt when props change.
    useEffect(() => {
        setPrompt(`Generate an SEO-optimized title and a compelling product description for "${brief.product.name || 'this product'}" on ${platform}.`);
    }, [platform, brief.product.name]);

    const handleGenerate = () => {
        onGenerate(prompt);
    };

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-white">Content Generation for {platform}</h3>
            <p className="text-sm text-dark-text-secondary">
                Generate SEO titles, descriptions, and more, tailored for your selected platform.
            </p>
            <div className="space-y-2">
                <label htmlFor="platform-prompt" className="text-sm font-semibold text-dark-text-secondary">Your Request</label>
                <textarea
                    id="platform-prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                    disabled={isLoading}
                    className="w-full text-sm rounded-lg border-dark-border bg-dark-input shadow-sm px-3 py-2 resize-y disabled:opacity-60"
                    placeholder={`e.g., "Generate 5 SEO keywords for ${platform}"`}
                />
            </div>
            <button
                onClick={handleGenerate}
                disabled={isLoading || !prompt.trim()}
                className="w-full flex items-center justify-center gap-2 bg-brand-secondary text-white font-bold py-2.5 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
                <MagicWandIcon className={`w-5 h-5 ${isLoading ? 'animate-pulse' : ''}`} />
                {isLoading ? 'Generating...' : 'Generate Content'}
            </button>

            {isLoading && !generatedContent && <p className="text-dark-text-secondary text-sm animate-pulse">Generating...</p>}

            {generatedContent && (
                <div className="bg-dark-surface rounded-lg border border-dark-border mt-4">
                     <div className="prose prose-sm prose-invert p-4 text-dark-text-secondary max-w-none 
                               [&>h3]:font-semibold [&>h3]:text-dark-text-primary [&>ul]:list-disc [&>ul]:pl-5 [&>p]:my-2"
                        dangerouslySetInnerHTML={{ __html: generatedContent.replace(/\n/g, '<br />') }} />
                </div>
            )}
        </div>
    );
};

export default PlatformContentGenerator;

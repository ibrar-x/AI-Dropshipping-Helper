import React, { useState } from 'react';
import { GeneratedImage } from '../types';
import { SendIcon } from './icons/SendIcon';

interface EditSuggestionsProps {
    suggestions: string[];
    image: GeneratedImage;
    onRefine: (image: GeneratedImage, prompt: string) => void;
}

const EditSuggestions: React.FC<EditSuggestionsProps> = ({ suggestions, image, onRefine }) => {
    const [customPrompt, setCustomPrompt] = useState('');
    const [showCustom, setShowCustom] = useState(false);

    const handleSuggestionClick = (prompt: string) => {
        if (prompt.toLowerCase() === 'custom') {
            setShowCustom(true);
        } else {
            onRefine(image, prompt);
        }
    };

    const handleCustomSubmit = () => {
        if (customPrompt.trim()) {
            onRefine(image, customPrompt.trim());
            setCustomPrompt('');
            setShowCustom(false);
        }
    };

    return (
        <div className="mt-4 space-y-2 animate-slide-up">
            <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                    <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-3 py-1.5 rounded-md text-sm font-semibold transition-colors bg-dark-input text-dark-text-primary hover:bg-brand-primary hover:text-white border border-dark-border"
                    >
                        {suggestion}
                    </button>
                ))}
            </div>
            {showCustom && (
                <div className="flex items-center gap-2 pt-2">
                    <input
                        type="text"
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
                        placeholder="Your custom refinement..."
                        className="flex-1 text-sm rounded-lg border-dark-border bg-dark-input shadow-sm focus:border-brand-primary focus:ring-brand-primary px-3 py-2"
                        autoFocus
                    />
                    <button
                        onClick={handleCustomSubmit}
                        disabled={!customPrompt.trim()}
                        className="p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed enabled:bg-brand-primary enabled:hover:bg-brand-secondary"
                        aria-label="Send custom refinement"
                    >
                        <SendIcon className="w-5 h-5 text-white" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default EditSuggestions;
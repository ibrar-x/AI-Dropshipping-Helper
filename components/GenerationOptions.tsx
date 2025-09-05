

import React, { useState, useEffect } from 'react';
// FIX: Correct import path for types.
import { GenerationPayload, CreativeOptions, GeneratedImage, GenerationOptionsProps as BaseGenerationOptionsProps } from '../types';
import { PaperclipIcon } from './icons/PaperclipIcon';
import { MegaphoneIcon } from './icons/MegaphoneIcon';

interface GenerationOptionsProps extends BaseGenerationOptionsProps {
  onGenerate: (payload: GenerationPayload) => void;
  onStartAdCreation: (image: GeneratedImage) => void;
}

const aspectRatios = [
    { label: 'Square', value: '1:1' },
    { label: 'Landscape', value: '16:9' },
    { label: 'Portrait', value: '9:16' },
];

interface OptionGroupProps {
  title: string;
  options: {label?: string, value: string}[];
  allowCustom: boolean;
  selection: string;
  onSelect: (value: string) => void;
}

const OptionButton: React.FC<{onClick: () => void, isSelected: boolean, children: React.ReactNode}> = ({ onClick, isSelected, children }) => (
    <button
        onClick={onClick}
        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            isSelected 
            ? 'bg-brand-primary text-white' 
            : 'bg-dark-input text-dark-text-primary hover:bg-dark-border'
        }`}
    >
        {children}
    </button>
);


const OptionGroup: React.FC<OptionGroupProps> = ({ title, options, allowCustom, selection, onSelect }) => {
    const isCustom = allowCustom && !!selection && !options.some(opt => opt.value === selection);

    return (
        <div className="bg-dark-surface border border-dark-border rounded-lg p-3">
            <h3 className="font-semibold text-dark-text-secondary mb-2 text-sm">{title}</h3>
            <div className="flex flex-wrap gap-2 items-center">
                {options.map(opt => (
                    <OptionButton key={opt.value} isSelected={selection === opt.value} onClick={() => onSelect(opt.value)}>
                        {opt.label || opt.value}
                    </OptionButton>
                ))}
                {allowCustom && (
                    <input
                        type="text"
                        placeholder="Custom..."
                        value={isCustom ? selection : ''}
                        onChange={(e) => onSelect(e.target.value)}
                        className="flex-1 min-w-[100px] text-sm rounded-lg border-dark-border bg-dark-input shadow-sm focus:border-brand-primary focus:ring-brand-primary px-3 py-2"
                    />
                )}
            </div>
        </div>
    );
};


const GenerationOptions: React.FC<GenerationOptionsProps> = ({ productDescription, creativeOptions, originalImage, onGenerate, onStartAdCreation }) => {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [batchCount, setBatchCount] = useState('1');
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    if (creativeOptions && Object.keys(creativeOptions).length > 0) {
        setSelections(prev => {
            const initialSelections = { ...prev };
            // FIX: Removed 'Camera Angle' and 'Lens & Focus' as they are not valid keys of CreativeOptions
            const categoriesToPreselect: (keyof CreativeOptions)[] = ['Style'];
            
            categoriesToPreselect.forEach(category => {
                // Only pre-select if the user hasn't already made a choice in this category
                if (!initialSelections[category] && creativeOptions[category]?.[0]) {
                    initialSelections[category] = creativeOptions[category][0];
                }
            });
            return initialSelections;
        });
    }
}, [creativeOptions]);

  const handleSelection = (category: string, value: string) => {
    setSelections(prev => {
        const currentVal = prev[category];
        // If clicking the same button, toggle it off. Otherwise, set the new value.
        return {...prev, [category]: currentVal === value ? '' : value };
    });
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setLogoFile(e.target.files[0]);
      }
  };

  const handleGenerateClick = async () => {
      const promptParts = Object.entries(selections)
        .filter(([, value]) => value) // Ensure value is not empty
        .map(([category, value]) => {
            if (category.toLowerCase() === 'props') return `with ${value}`;
            return value;
        });

      const simplePrompt = "A photorealistic lifestyle image of the product. " + (promptParts.join(', ') || "A beautiful, creative lifestyle setting.");
      
      const count = parseInt(batchCount, 10);
      const finalCount = isNaN(count) || count < 1 ? 1 : Math.min(count, 10);

      onGenerate({ 
          prompt: simplePrompt, 
          count: finalCount, 
          logoFile, 
          aspectRatio,
          productDescription,
          originalImage: originalImage ?? undefined,
      });
  }

  return (
    <div className="mt-4 space-y-3 animate-slide-up">
        {creativeOptions && Object.entries(creativeOptions).map(([title, options]) => (
            <OptionGroup 
                key={title}
                title={title}
                options={options.map(o => ({value: o}))}
                allowCustom={true}
                selection={selections[title] || ''}
                onSelect={(value) => handleSelection(title, value)}
            />
        ))}

        <OptionGroup 
            title="Aspect Ratio"
            options={aspectRatios}
            allowCustom={false}
            selection={aspectRatio}
            onSelect={setAspectRatio}
        />

        <div className="bg-dark-surface border border-dark-border rounded-lg p-3">
             <h3 className="font-semibold text-dark-text-secondary mb-2 text-sm">Advanced Options</h3>
            <div className="w-full grid grid-cols-2 gap-x-4 gap-y-2 items-center">
                <label htmlFor="batch-count" className="text-sm font-medium text-dark-text-secondary">Variations:</label>
                <input
                    type="number"
                    id="batch-count"
                    min="1"
                    max="10"
                    value={batchCount}
                    onChange={(e) => setBatchCount(e.target.value)}
                    className="w-full text-sm rounded-lg border-dark-border bg-dark-input shadow-sm focus:border-brand-primary focus:ring-brand-primary px-3 py-2"
                />

                <label htmlFor="logo-upload" className="text-sm font-medium text-dark-text-secondary">Brand Logo:</label>
                <label htmlFor="logo-upload" className="cursor-pointer bg-dark-input border border-dark-border rounded-md py-1.5 px-2.5 text-sm font-medium text-dark-text-secondary hover:bg-dark-border flex items-center gap-2">
                    <PaperclipIcon className="w-4 h-4" />
                    <span className="truncate">{logoFile?.name ?? 'Upload File'}</span>
                </label>
                <input id="logo-upload" type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleLogoFileChange} />
            </div>
        </div>

        <div className="pt-2">
            <button 
                onClick={handleGenerateClick}
                className="w-full bg-brand-primary text-white font-bold py-2.5 px-4 rounded-lg hover:bg-brand-secondary transition-all duration-300 transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-wait disabled:scale-100"
            >
                Generate Scene
            </button>
             {originalImage && (
                <>
                    <div className="relative flex items-center justify-center my-3">
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dark-border"></div>
                        <span className="relative bg-dark-surface px-2 text-xs uppercase text-dark-text-secondary">Or</span>
                    </div>
                    <button
                        onClick={() => onStartAdCreation(originalImage)}
                        className="w-full flex items-center justify-center gap-2 bg-dark-input border border-dark-border text-dark-text-primary hover:bg-dark-border px-4 py-2.5 rounded-lg text-sm font-bold transition-colors"
                    >
                        <MegaphoneIcon className="w-5 h-5" />
                        <span>Create Ad Campaign</span>
                    </button>
                </>
            )}
        </div>
    </div>
  );
};

export default GenerationOptions;
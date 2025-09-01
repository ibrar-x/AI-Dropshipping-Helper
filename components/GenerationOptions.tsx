import React, { useState } from 'react';
import { ProductCategory, GenerationPayload } from '../types';
import { PaperclipIcon } from './icons/PaperclipIcon';

interface GenerationOptionsProps {
  productCategory: ProductCategory;
  productDescription: string;
  onGenerate: (payload: GenerationPayload) => void;
}

const categoryOptionsConfig: Record<ProductCategory, { title: string; options: string[]; allowCustom: boolean }[]> = {
    [ProductCategory.CLOTHING]: [
        { title: 'Style', options: ['Streetwear', 'Vintage', 'Formal', 'Casual'], allowCustom: true },
        { title: 'Pose', options: ['Standing', 'Walking', 'Sitting', 'Action Shot'], allowCustom: true },
        { title: 'Setting', options: ['Urban City', 'Nature', 'Studio', 'Cafe'], allowCustom: true },
    ],
    [ProductCategory.HOME_GOODS]: [
        { title: 'Material', options: ['Wood', 'Marble', 'Metal', 'Glass'], allowCustom: true },
        { title: 'Placement', options: ['On a table', 'On a shelf', 'Living room', 'Minimalist'], allowCustom: true },
        { title: 'Lighting', options: ['Bright & Airy', 'Moody', 'Natural', 'Studio'], allowCustom: true },
    ],
    [ProductCategory.GADGETS]: [
        { title: 'Surface', options: ['Wooden desk', 'Tech workbench', 'Marble', 'Floating shelf'], allowCustom: true },
        { title: 'Vibe', options: ['Minimalist', 'Futuristic', 'Cozy Office', 'Industrial'], allowCustom: true },
        { title: 'Props', options: ['with a coffee cup', 'with a notebook', 'with plants', 'other gadgets'], allowCustom: true },
    ],
};

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
                        className="flex-1 min-w-[100px] text-xs rounded-md border-dark-border bg-dark-input shadow-sm focus:border-brand-primary focus:ring-brand-primary px-2 py-1"
                    />
                )}
            </div>
        </div>
    );
};


const GenerationOptions: React.FC<GenerationOptionsProps> = ({ productCategory, onGenerate }) => {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [batchCount, setBatchCount] = useState('1');
  const [logoFile, setLogoFile] = useState<File | null>(null);

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

  const handleGenerateClick = () => {
      const promptParts = Object.entries(selections)
        .filter(([, value]) => value) // Ensure value is not empty
        .map(([category, value]) => {
            if (category === 'Props') return `with ${value}`;
            return `${category.toLowerCase()}: ${value}`;
        });

      let prompt = "A photorealistic lifestyle image of the product. " + (promptParts.join(', ') || "A beautiful, creative lifestyle setting.");
      
      const count = parseInt(batchCount, 10);
      const finalCount = isNaN(count) || count < 1 ? 1 : Math.min(count, 10);

      onGenerate({ prompt, count: finalCount, logoFile, aspectRatio });
  }
  
  const availableOptions = categoryOptionsConfig[productCategory] || categoryOptionsConfig[ProductCategory.HOME_GOODS];

  return (
    <div className="mt-4 space-y-3 animate-slide-up">
        {availableOptions.map(cat => (
            <OptionGroup 
                key={cat.title}
                title={cat.title}
                options={cat.options.map(o => ({value: o}))}
                allowCustom={cat.allowCustom}
                selection={selections[cat.title] || ''}
                onSelect={(value) => handleSelection(cat.title, value)}
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
                    className="w-full text-sm rounded-md border-dark-border bg-dark-input shadow-sm focus:border-brand-primary focus:ring-brand-primary"
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
                className="w-full bg-brand-primary text-white font-bold py-2.5 px-4 rounded-lg hover:bg-brand-secondary transition-all duration-300 transform hover:scale-105"
            >
                Generate Scene
            </button>
        </div>
    </div>
  );
};

export default GenerationOptions;
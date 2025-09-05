

import React, { useState, useEffect } from 'react';
// FIX: Correct import path for types.
import { AdBrief, AdBriefWizardState } from '../types';
import { PaperclipIcon } from './icons/PaperclipIcon';
import { MagicWandIcon } from './icons/MagicWandIcon';

interface AdBriefWizardProps {
  wizardState: AdBriefWizardState;
  onGenerate: (brief: AdBrief, logoFile: File | null) => void;
  messageText?: string;
  onAutocomplete: (messageId: string, brief: AdBrief) => void;
  messageId: string;
  isGenerating: boolean;
}

const defaultData = {
  platforms: ['Shopify', 'eBay', 'Etsy', 'Facebook/Instagram Feed', 'Facebook/Instagram Story/Reel', 'Google Search Ads', 'Google Display/Performance Max'],
  campaignGoals: ['Sales', 'Lead Gen', 'Traffic', 'Brand Awareness', 'Seasonal Promo'],
  audienceTypes: ['Young adults (18–30)', 'Parents & families', 'Professionals', 'Collectors/hobbyists', 'Value seekers / bargain hunters', 'Luxury / premium buyers'],
  tones: ['Professional & Trustworthy', 'Friendly & Approachable', 'Luxury / Aspirational', 'Bold & Urgent', 'Minimalist & Modern', 'Playful & Fun'],
  structures: ['Hook', 'Problem→Solution', 'Benefits > Features', 'Social Proof', 'Risk Reversal', 'Clear CTA'],
  visualStyles: ['Minimalist clean (Shopify-style)', 'Competitive retail (eBay-style)', 'Cozy handmade/artistic (Etsy-style)', 'Premium luxury', 'Fun & playful'],
};

const Section: React.FC<{title: string, description: string, children: React.ReactNode}> = ({ title, description, children }) => (
    <div className="space-y-2 p-4 bg-dark-input/50 rounded-lg border border-dark-border">
        <div>
            <h3 className="font-bold text-lg text-dark-text-primary">{title}</h3>
            <p className="text-sm text-dark-text-secondary">{description}</p>
        </div>
        <div className="pt-2 space-y-4">{children}</div>
    </div>
);

const CheckboxGroup: React.FC<{label: string; options: string[], selected: string[], onChange: (value: string) => void, hasError: boolean}> = ({ label, options, selected, onChange, hasError }) => (
    <div>
        <label className={`text-sm font-semibold text-dark-text-secondary mb-2 block ${hasError ? 'text-red-400' : ''}`}>{label}</label>
        <div className="flex flex-wrap gap-2">
            {options.map(opt => (
                <label key={opt} className={`cursor-pointer px-3 py-1 rounded-md text-xs font-medium transition-colors ${selected.includes(opt) ? 'bg-brand-primary text-white' : 'bg-dark-input text-dark-text-primary hover:bg-dark-border border border-dark-border'}`}>
                    <input type="checkbox" checked={selected.includes(opt)} onChange={() => onChange(opt)} className="hidden" />
                    {opt}
                </label>
            ))}
        </div>
    </div>
);

const RadioGroup: React.FC<{label: string; options: string[], selected: string, onChange: (value: string) => void, hasError: boolean}> = ({ label, options, selected, onChange, hasError }) => (
     <div>
        <label className={`text-sm font-semibold text-dark-text-secondary mb-2 block ${hasError ? 'text-red-400' : ''}`}>{label}</label>
        <div className="flex flex-wrap gap-2">
            {options.map(opt => (
                <label key={opt} className={`cursor-pointer px-3 py-1 rounded-md text-xs font-medium transition-colors ${selected === opt ? 'bg-brand-primary text-white' : 'bg-dark-input text-dark-text-primary hover:bg-dark-border border border-dark-border'}`}>
                    <input type="radio" name={label} value={opt} checked={selected === opt} onChange={() => onChange(opt)} className="hidden" />
                    {opt}
                </label>
            ))}
        </div>
    </div>
);


const CustomInput: React.FC<{value: string | number, onChange: (val: string), placeholder: string, hasError: boolean, label: string, type?: string}> = ({ value, onChange, placeholder, hasError, label, type = 'text' }) => (
    <div>
        <label className={`text-sm font-semibold text-dark-text-secondary mb-1 block ${hasError ? 'text-red-400' : ''}`}>{label}</label>
        <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            min={type === 'number' ? 1 : undefined}
            max={type === 'number' ? 10 : undefined}
            className={`w-full text-sm rounded-lg border bg-dark-input shadow-sm focus:border-brand-primary focus:ring-brand-primary px-3 py-2 ${hasError ? 'border-red-500' : 'border-dark-border'}`}
        />
    </div>
);

const TextAreaInput: React.FC<{value: string, onChange: (val: string), placeholder: string, rows?: number, hasError: boolean, label: string}> = ({ value, onChange, placeholder, rows=2, hasError, label }) => (
    <div>
         <label className={`text-sm font-semibold text-dark-text-secondary mb-1 block ${hasError ? 'text-red-400' : ''}`}>{label}</label>
        <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className={`w-full text-sm rounded-lg border bg-dark-input shadow-sm focus:border-brand-primary focus:ring-brand-primary px-3 py-2 resize-y ${hasError ? 'border-red-500' : 'border-dark-border'}`}
        />
    </div>
);


const AdBriefWizard: React.FC<AdBriefWizardProps> = ({ wizardState, onGenerate, messageText, onAutocomplete, messageId, isGenerating }) => {
  const [brief, setBrief] = useState<AdBrief>(wizardState.brief);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  
  const { validationErrors = [] } = wizardState;
  const hasError = (fieldPath: string) => validationErrors.includes(fieldPath);

  useEffect(() => {
    setBrief(wizardState.brief);
  }, [wizardState.brief]);
  
  const handleBriefChange = (path: string, value: any) => {
    setBrief(prev => {
        const newBrief = JSON.parse(JSON.stringify(prev));
        const keys = path.split('.');
        let current: any = newBrief;
        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        return newBrief;
    });
  };

  // FIX: Rewrote the function to be type-safe and correctly handle nested paths.
  const handleCheckboxChange = (path: string, value: string) => {
    const keys = path.split('.');
    
    // Navigate to the target array
    let current: any = brief;
    for (const key of keys) {
        if (current === undefined) {
            console.error(`Invalid path for checkbox change: ${path}`);
            return;
        }
        current = current[key];
    }
    
    if (!Array.isArray(current)) {
        console.error(`Path did not resolve to an array: ${path}`);
        return;
    }
    
    const currentValues: string[] = current;
    
    const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
    
    handleBriefChange(path, newValues);
  };


  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
    }
  };

  const handleAutocompleteClick = () => {
    onAutocomplete(messageId, brief);
  };

  return (
    <div className="mt-4 space-y-6 animate-slide-up">
        <div className="flex items-start gap-4">
            <img src={wizardState.sourceImage.thumbnailSrc || wizardState.sourceImage.src} alt="Product" className="w-16 h-16 rounded-md object-cover border border-dark-border flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-lg">Ad Creative Director</h3>
              <p className="text-sm text-dark-text-secondary">Fill out this brief, and I'll generate a complete ad campaign for your product.</p>
            </div>
             <button
                onClick={handleAutocompleteClick}
                disabled={wizardState.isLoading}
                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-dark-input hover:bg-dark-border border border-dark-border rounded-md disabled:opacity-50 transition-colors"
                title="Automatically fill in the brief using AI"
            >
                <MagicWandIcon className={`w-4 h-4 ${wizardState.isLoading ? 'animate-pulse' : ''}`} />
                <span>{wizardState.isLoading ? 'Completing...' : 'Auto-complete'}</span>
            </button>
        </div>
        
        {messageText && (
          <p className="p-3 bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 rounded-md text-sm font-semibold">
            {messageText}
          </p>
        )}

        <Section title="1. Platforms & Goal" description="Where will this ad run, and what is its main objective?">
            <CheckboxGroup label="Platforms *" options={defaultData.platforms} selected={brief.platforms} onChange={v => handleCheckboxChange('platforms', v)} hasError={hasError('platforms')} />
            <RadioGroup label="Campaign Goal *" options={defaultData.campaignGoals} selected={brief.campaignGoal} onChange={v => handleBriefChange('campaignGoal', v)} hasError={hasError('campaignGoal')} />
        </Section>

        <Section title="2. Target Audience" description="Who are you trying to reach?">
             <CheckboxGroup label="Audience Type(s) *" options={defaultData.audienceTypes} selected={brief.targetAudience.types} onChange={v => handleCheckboxChange('targetAudience.types', v)} hasError={hasError('targetAudience.types')} />
             <CustomInput label="Custom Audience" value={brief.targetAudience.custom} onChange={v => handleBriefChange('targetAudience.custom', v)} placeholder="e.g., 'Eco-conscious shoppers'" hasError={false}/>
             <TextAreaInput label="Key Pain Points" value={brief.targetAudience.painPoints} onChange={v => handleBriefChange('targetAudience.painPoints', v)} placeholder="e.g., 'Tired of slow devices'" hasError={false}/>
             <TextAreaInput label="Their Desires" value={brief.targetAudience.desires} onChange={v => handleBriefChange('targetAudience.desires', v)} placeholder="e.g., 'Wants to feel more productive'" hasError={false}/>
        </Section>
        
        <Section title="3. Product Details" description="Tell me about the product being advertised.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomInput label="Product Name *" value={brief.product.name} onChange={v => handleBriefChange('product.name', v)} placeholder="Product Name" hasError={hasError('product.name')} />
                <CustomInput label="Category / Type" value={brief.product.category} onChange={v => handleBriefChange('product.category', v)} placeholder="e.g., Wireless Headphones" hasError={hasError('product.category')} />
                <TextAreaInput label="Top 3-5 Features" value={brief.product.features} onChange={v => handleBriefChange('product.features', v)} placeholder="One per line" rows={3} hasError={hasError('product.features')} />
                <TextAreaInput label="Key Benefits *" value={brief.product.benefits} onChange={v => handleBriefChange('product.benefits', v)} placeholder="What outcomes it creates (one per line)" rows={3} hasError={hasError('product.benefits')} />
                <CustomInput label="Unique Selling Proposition (USP)" value={brief.product.usp} onChange={v => handleBriefChange('product.usp', v)} placeholder="What makes it unique?" hasError={hasError('product.usp')} />
                <CustomInput label="Price (e.g., £49.99)" value={brief.product.price} onChange={v => handleBriefChange('product.price', v)} placeholder="Optional" hasError={hasError('product.price')} />
                <CustomInput label="Current Offer (e.g., 20% OFF)" value={brief.product.offer} onChange={v => handleBriefChange('product.offer', v)} placeholder="Optional" hasError={hasError('product.offer')} />
                <CustomInput label="Proof Assets (e.g., 5-star reviews)" value={brief.product.proof} onChange={v => handleBriefChange('product.proof', v)} placeholder="Optional" hasError={hasError('product.proof')} />
            </div>
        </Section>

        <Section title="4. Tone & Voice" description="Define the ad's personality.">
            <RadioGroup label="Primary Tone *" options={defaultData.tones} selected={brief.tone.primary} onChange={v => handleBriefChange('tone.primary', v)} hasError={hasError('tone.primary')} />
            <RadioGroup label="Secondary Tone (Optional)" options={defaultData.tones} selected={brief.tone.secondary} onChange={v => handleBriefChange('tone.secondary', v)} hasError={hasError('tone.secondary')} />
        </Section>

        <Section title="5. Structure Preferences" description="How should the ad copy be constructed?">
            <CheckboxGroup label="Structure" options={defaultData.structures} selected={brief.structure} onChange={v => handleCheckboxChange('structure', v)} hasError={hasError('structure')} />
        </Section>

        <Section title="6. Compliance" description="Any rules or constraints to follow?">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomInput label="Region/Currency" value={brief.compliance.region} onChange={v => handleBriefChange('compliance.region', v)} placeholder="e.g., 'UK/£'" hasError={false}/>
                <CustomInput label="Character Limits" value={brief.compliance.charLimits} onChange={v => handleBriefChange('compliance.charLimits', v)} placeholder="e.g., 'Google: 30/90'" hasError={false}/>
            </div>
            <TextAreaInput label="Words to Avoid" value={brief.compliance.wordsToAvoid} onChange={v => handleBriefChange('compliance.wordsToAvoid', v)} placeholder="One per line or comma-separated" hasError={false}/>
            <TextAreaInput label="Must-Include Words" value={brief.compliance.mustInclude} onChange={v => handleBriefChange('compliance.mustInclude', v)} placeholder="e.g., 'Official Partner'" hasError={false}/>
        </Section>

        <Section title="7. Visual Style" description="Define the look of your image ads.">
            <RadioGroup label="Visual Style *" options={defaultData.visualStyles} selected={brief.visuals.style} onChange={v => handleBriefChange('visuals.style', v)} hasError={hasError('visuals.style')} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <CustomInput label="Color Palette (optional)" value={brief.visuals.palette} onChange={v => handleBriefChange('visuals.palette', v)} placeholder="e.g., 'earth tones, beige, green'" hasError={false}/>
                 <CustomInput label="Number of variations" value={brief.visuals.numberOfImages} onChange={v => handleBriefChange('visuals.numberOfImages', parseInt(v, 10) || 1)} placeholder="1" hasError={false} type="number"/>
                 <CustomInput label="Mandatory On-Image Text" value={brief.visuals.onImageText} onChange={v => handleBriefChange('visuals.onImageText', v)} placeholder="e.g., '50% Off Today'" hasError={false}/>
            </div>
             <div>
                <label className="text-sm font-semibold text-dark-text-secondary mb-1 block">Brand Logo (Optional)</label>
                <label htmlFor="logo-upload" className="cursor-pointer bg-dark-input border border-dark-border rounded-md py-2 px-2.5 text-sm font-medium text-dark-text-secondary hover:bg-dark-border flex items-center gap-2">
                    <PaperclipIcon className="w-4 h-4" />
                    <span className="truncate">{logoFile?.name ?? 'Upload File'}</span>
                </label>
                <input id="logo-upload" type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleLogoFileChange} />
            </div>
        </Section>


        <div className="pt-2">
            <button
                onClick={() => onGenerate(brief, logoFile)}
                disabled={isGenerating}
                className="w-full bg-brand-primary text-white font-bold py-2.5 px-4 rounded-lg hover:bg-brand-secondary transition-all disabled:opacity-50 disabled:cursor-wait"
            >
                {isGenerating ? 'Generating Campaign...' : 'Generate Ad Campaign'}
            </button>
        </div>
    </div>
  );
};

export default AdBriefWizard;
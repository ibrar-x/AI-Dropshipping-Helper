
import React, { useState } from 'react';
// FIX: Correct import path for types.
import { AdDirectorOptionsProps, AdGenerationPayload } from '../types';
import { PaperclipIcon } from './icons/PaperclipIcon';

interface AdDirectorComponentProps {
  options: AdDirectorOptionsProps;
  onGenerate: (payload: AdGenerationPayload) => void;
}

const platforms = ['Shopify', 'Etsy', 'eBay', 'Instagram Post', 'Facebook Ad'];
const tones = ['Professional', 'Playful', 'Luxurious', 'Minimalist', 'Bold & Energetic'];
const ctas = ['Shop Now', 'Learn More', 'Get Yours Today', 'Limited Time Offer'];

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

const AdDirectorOptions: React.FC<AdDirectorComponentProps> = ({ options, onGenerate }) => {
  const [platform, setPlatform] = useState(platforms[3]);
  const [tone, setTone] = useState(tones[0]);
  const [cta, setCta] = useState(ctas[0]);
  const [headline, setHeadline] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
    }
  };

  const handleGenerateClick = () => {
    onGenerate({
      sourceImage: options.sourceImage,
      platform,
      tone,
      cta,
      headline,
      logoFile,
    });
  };

  return (
    <div className="mt-4 space-y-4 animate-slide-up">
      <div className="flex items-center gap-4">
        <img src={options.sourceImage.thumbnailSrc || options.sourceImage.src} alt="Product" className="w-16 h-16 rounded-md object-cover border border-dark-border" />
        <div>
          <h3 className="font-bold text-lg">Ad Director</h3>
          <p className="text-sm text-dark-text-secondary">Fill out the brief to generate a new ad creative.</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-semibold text-dark-text-secondary mb-2">Platform</label>
          <div className="flex flex-wrap gap-2">
            {platforms.map(p => <OptionButton key={p} isSelected={platform === p} onClick={() => setPlatform(p)}>{p}</OptionButton>)}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-dark-text-secondary mb-2">Tone / Vibe</label>
          <div className="flex flex-wrap gap-2">
            {tones.map(t => <OptionButton key={t} isSelected={tone === t} onClick={() => setTone(t)}>{t}</OptionButton>)}
          </div>
        </div>
        <div>
            <label htmlFor="headline" className="block text-sm font-semibold text-dark-text-secondary mb-2">Headline / Text Overlay</label>
            <input
                type="text"
                id="headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g., 'The Future of Sound'"
                className="w-full text-sm rounded-lg border-dark-border bg-dark-input shadow-sm focus:border-brand-primary focus:ring-brand-primary px-3 py-2"
            />
        </div>
        <div>
          <label className="block text-sm font-semibold text-dark-text-secondary mb-2">Call to Action (CTA)</label>
          <div className="flex flex-wrap gap-2">
            {ctas.map(c => <OptionButton key={c} isSelected={cta === c} onClick={() => setCta(c)}>{c}</OptionButton>)}
          </div>
        </div>
        <div>
            <label htmlFor="logo-upload" className="block text-sm font-semibold text-dark-text-secondary mb-2">Brand Logo (Optional)</label>
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
          disabled={!headline.trim()}
          className="w-full bg-brand-primary text-white font-bold py-2.5 px-4 rounded-lg hover:bg-brand-secondary transition-all disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          Generate Ad Creative
        </button>
      </div>
    </div>
  );
};

export default AdDirectorOptions;

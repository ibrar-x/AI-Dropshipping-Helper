import React, { useState, useCallback } from 'react';
import { GeneratedImage, UpscaleOptions, UpscaleFactor, UpscaleProfile } from '../types';
import { upscaleImage } from '../services/geminiService';

interface ImageUpscalerProps {
  image: GeneratedImage;
  onSave: (finalImageDataUrl: string, sourceImageId: string) => void;
  onCancel: () => void;
}

const RadioButton: React.FC<{ label: string; value: string | number; checked: boolean; onChange: (value: any) => void; name: string; }> = ({ label, value, checked, onChange, name }) => (
  <label className="flex items-center space-x-2 cursor-pointer">
    <input type="radio" name={name} value={value} checked={checked} onChange={e => onChange(e.target.value)} className="hidden" />
    <span className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${checked ? 'bg-brand-primary text-white' : 'bg-dark-input hover:bg-dark-border'}`}>
      {label}
    </span>
  </label>
);

const Toggle: React.FC<{ label: string; enabled: boolean; onToggle: (enabled: boolean) => void; description: string; disabled?: boolean; }> = ({ label, enabled, onToggle, description, disabled }) => (
  <div className={`p-3 rounded-lg ${disabled ? 'opacity-50' : 'bg-dark-input'}`}>
    <div className="flex items-center justify-between">
      <div className="flex flex-col">
        <span className="font-semibold text-dark-text-primary">{label}</span>
        <span className="text-xs text-dark-text-secondary">{description}</span>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onToggle(!enabled)}
        className={`${enabled ? 'bg-brand-primary' : 'bg-dark-border'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-dark-surface disabled:cursor-not-allowed`}
        role="switch"
        aria-checked={enabled}
      >
        <span className={`${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}/>
      </button>
    </div>
  </div>
);


const ImageUpscaler: React.FC<ImageUpscalerProps> = ({ image, onSave, onCancel }) => {
    const [factor, setFactor] = useState<UpscaleFactor>(2);
    const [profile, setProfile] = useState<UpscaleProfile>('Default');
    const [removeArtifacts, setRemoveArtifacts] = useState(true);
    const [preserveFaces, setPreserveFaces] = useState(true);
    const [enhanceDetails, setEnhanceDetails] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [previewSrc, setPreviewSrc] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGeneratePreview = useCallback(async () => {
        setIsProcessing(true);
        setError(null);
        setPreviewSrc(null);

        const options: UpscaleOptions = {
            factor,
            profile,
            removeArtifacts,
            preserveFaces,
            enhanceDetails,
        };

        try {
            const result = await upscaleImage(image.src, options);
            setPreviewSrc(result.src);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Upscaling failed. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    }, [factor, profile, removeArtifacts, preserveFaces, enhanceDetails, image.src]);

    const handleSave = () => {
        if (previewSrc) {
            onSave(previewSrc, image.id);
        }
    };
    
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in text-dark-text-primary">
        <div className="bg-dark-surface rounded-xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center p-3 border-b border-dark-border flex-shrink-0">
            <h2 className="text-xl font-bold">Image Upscale Orchestrator</h2>
            <button onClick={onCancel} className="text-dark-text-secondary hover:text-dark-text-primary rounded-full p-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Main Canvas Area */}
            <main className="flex-1 grid grid-cols-2 gap-4 items-center justify-center bg-dark-bg p-4">
                <div className="text-center">
                    <h3 className="font-bold mb-2">Original</h3>
                    <img src={image.src} alt="Original" className="max-h-[70vh] w-auto mx-auto rounded-lg" />
                </div>
                <div className="text-center h-full flex flex-col items-center justify-center">
                    <h3 className="font-bold mb-2">Upscaled Preview</h3>
                    <div className="w-full h-full border-2 border-dashed border-dark-border rounded-lg flex items-center justify-center bg-dark-input/50">
                        {isProcessing ? (
                             <div className="flex flex-col items-center justify-center">
                                <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                                <p className="mt-3 text-md font-semibold">Generating preview...</p>
                            </div>
                        ) : previewSrc ? (
                            <img src={previewSrc} alt="Upscaled Preview" className="max-h-[70vh] w-auto mx-auto rounded-lg" />
                        ) : (
                            <p className="text-dark-text-secondary">Preview will appear here</p>
                        )}
                    </div>
                </div>
            </main>
            
            {/* Right Sidebar */}
            <aside className="w-80 border-l border-dark-border flex flex-col">
              <div className="p-4 flex-grow overflow-y-auto space-y-4">
                  <div>
                      <h3 className="text-sm font-semibold mb-2 text-dark-text-secondary">1. Upscale Factor</h3>
                      <div className="flex space-x-2">
                          <RadioButton label="2x" value={2} name="factor" checked={factor === 2} onChange={(val) => setFactor(Number(val) as UpscaleFactor)} />
                          <RadioButton label="4x" value={4} name="factor" checked={factor === 4} onChange={(val) => setFactor(Number(val) as UpscaleFactor)} />
                          <RadioButton label="8x" value={8} name="factor" checked={factor === 8} onChange={(val) => setFactor(Number(val) as UpscaleFactor)} />
                      </div>
                  </div>
                  <div>
                      <h3 className="text-sm font-semibold mb-2 text-dark-text-secondary">2. Image Profile</h3>
                      <select value={profile} onChange={e => setProfile(e.target.value as UpscaleProfile)} className="w-full rounded-md border-dark-border bg-dark-input shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm">
                        <option>Default</option>
                        <option>Photo</option>
                        <option>Product</option>
                        <option>Text / Artwork</option>
                      </select>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-dark-text-secondary">3. Refinements</h3>
                    <Toggle label="Artifact Removal" enabled={removeArtifacts} onToggle={setRemoveArtifacts} description="Clean JPEG & compression noise." />
                    <Toggle label="Face Preservation" enabled={preserveFaces} onToggle={setPreserveFaces} description="Restore faces with high fidelity." disabled={profile !== 'Photo'}/>
                    <Toggle label="Enhance Details" enabled={enhanceDetails} onToggle={setEnhanceDetails} description="Subtly add plausible details." />
                  </div>
                  {error && <p className="text-sm text-red-500 bg-red-500/10 p-2 rounded-md">{error}</p>}
              </div>
              {/* Footer */}
              <div className="p-4 border-t border-dark-border bg-dark-surface flex flex-col gap-2">
                  <button onClick={handleGeneratePreview} disabled={isProcessing} className="w-full bg-brand-secondary text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-wait">
                      {isProcessing ? 'Processing...' : 'Generate Preview'}
                  </button>
                  <button onClick={handleSave} disabled={!previewSrc || isProcessing} className="w-full bg-brand-primary text-white font-bold py-2.5 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Finish & Save</button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
};

export default ImageUpscaler;

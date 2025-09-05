

import React, { useState, useCallback, useRef } from 'react';
import { GeneratedImage, UpscaleOptions, UpscaleFactor, UpscaleProfile } from '../types';
import { upscaleImage } from '../services/geminiService';
import { SliderIcon } from './icons/SliderIcon';
import { PlusIcon } from './icons/PlusIcon';
import { XIcon } from './icons/XIcon'; // Using XIcon for a generic minus
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface ImageUpscalerProps {
  image: GeneratedImage;
  onSave: (finalImageDataUrl: string, sourceImageId: string) => void;
  onCancel: () => void;
}

const RadioButton: React.FC<{ label: string; value: string | number; checked: boolean; onChange: (value: any) => void; name: string; }> = ({ label, value, checked, onChange, name }) => (
  <label className="flex items-center space-x-2 cursor-pointer">
    <input type="radio" name={name} value={String(value)} checked={checked} onChange={e => onChange(e.target.value)} className="hidden" />
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

type AccordionSectionId = 'factor' | 'profile' | 'refinements';

const AccordionSection: React.FC<{
    title: string;
    sectionId: AccordionSectionId;
    activeSection: AccordionSectionId | '';
    setActiveSection: (id: AccordionSectionId | '') => void;
    children: React.ReactNode;
}> = ({ title, sectionId, activeSection, setActiveSection, children }) => (
    <div className="bg-dark-surface rounded-lg border border-dark-border overflow-hidden">
        <button
            onClick={() => setActiveSection(activeSection === sectionId ? '' : sectionId)}
            className="w-full flex justify-between items-center p-4 text-left"
        >
            <h3 className="text-base font-semibold">{title}</h3>
            <ChevronDownIcon className={`w-5 h-5 transition-transform ${activeSection === sectionId ? 'rotate-180' : ''}`} />
        </button>
        {activeSection === sectionId && (
            <div className="p-4 border-t border-dark-border">
                {children}
            </div>
        )}
    </div>
);


const ImageUpscaler: React.FC<ImageUpscalerProps> = ({ image, onSave, onCancel }) => {
    const [factor, setFactor] = useState<UpscaleFactor>(8);
    const [profile, setProfile] = useState<UpscaleProfile>('Default');
    const [removeArtifacts, setRemoveArtifacts] = useState(true);
    const [preserveFaces, setPreserveFaces] = useState(false);
    const [enhanceDetails, setEnhanceDetails] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [previewSrc, setPreviewSrc] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [sliderPosition, setSliderPosition] = useState(50);
    const [isSliderDragging, setIsSliderDragging] = useState(false);
    const compareContainerRef = useRef<HTMLDivElement>(null);
    
    // Zoom & Pan state
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef({ x: 0, y: 0 });
    const imageContainerRef = useRef<HTMLDivElement>(null);
    
    const [activeSection, setActiveSection] = useState<AccordionSectionId | ''>('factor');

    const handleGeneratePreview = useCallback(async () => {
        setIsProcessing(true);
        setError(null);
        setPreviewSrc(null);
        setZoom(1);
        setPan({x: 0, y: 0});

        const options: UpscaleOptions = { factor, profile, removeArtifacts, preserveFaces, enhanceDetails };

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
        if (previewSrc) onSave(previewSrc, image.id);
    };
    
    // Slider Drag Logic
    const handleSliderChange = (clientX: number) => {
        if (!compareContainerRef.current) return;
        const rect = compareContainerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        let percentage = (x / rect.width) * 100;
        if (percentage < 0) percentage = 0;
        if (percentage > 100) percentage = 100;
        setSliderPosition(percentage);
    };

    const handleSliderMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent pan from starting
        setIsSliderDragging(true);
    };
    const handleSliderMouseUp = () => setIsSliderDragging(false);
    const handleSliderMouseMove = (e: MouseEvent) => { if (isSliderDragging) handleSliderChange(e.clientX); };
    const handleSliderTouchStart = (e: React.TouchEvent) => {
        e.stopPropagation(); // Prevent pan from starting
        setIsSliderDragging(true);
    };
    const handleSliderTouchEnd = () => setIsSliderDragging(false);
    const handleSliderTouchMove = (e: TouchEvent) => { if (isSliderDragging) handleSliderChange(e.touches[0].clientX); };
    
    // Pan Logic
    const handlePanStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (zoom <= 1) return;
        e.preventDefault();
        setIsPanning(true);
        const point = 'touches' in e ? e.touches[0] : e;
        panStartRef.current = { x: point.clientX - pan.x, y: point.clientY - pan.y };
    };
    const handlePanMove = (e: MouseEvent | TouchEvent) => {
        if (!isPanning || !imageContainerRef.current) return;
        const point = 'touches' in e ? e.touches[0] : e;
        const newX = point.clientX - panStartRef.current.x;
        const newY = point.clientY - panStartRef.current.y;
        setPan({ x: newX, y: newY });
    };
    const handlePanEnd = () => setIsPanning(false);

    const handleZoomIn = () => setZoom(z => Math.min(z * 1.5, 8));
    const handleZoomOut = () => {
        const newZoom = Math.max(zoom / 1.5, 1);
        if (newZoom <= 1) {
            setPan({x:0, y:0});
        }
        setZoom(newZoom);
    };

    const handleContainerMouseUp = () => {
        handleSliderMouseUp();
        handlePanEnd();
    };

    const handleContainerMouseMove = (e: React.MouseEvent<HTMLElement>) => {
        handleSliderMouseMove(e.nativeEvent);
        handlePanMove(e.nativeEvent);
    };

    const handleContainerTouchEnd = () => {
        handleSliderTouchEnd();
        handlePanEnd();
    };

    const handleContainerTouchMove = (e: React.TouchEvent<HTMLElement>) => {
        handleSliderTouchMove(e.nativeEvent);
        handlePanMove(e.nativeEvent);
    };

    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in text-dark-text-primary">
        <div className="bg-dark-surface rounded-xl shadow-2xl w-full max-w-7xl h-[95vh] md:h-[90vh] flex flex-col">
          <header className="flex justify-between items-center p-3 border-b border-dark-border flex-shrink-0">
            <h2 className="text-xl font-bold">Image Upscale Orchestrator</h2>
            <button onClick={onCancel} className="text-dark-text-secondary hover:text-dark-text-primary rounded-full p-1"><XIcon className="h-6 w-6" /></button>
          </header>

          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            <main ref={imageContainerRef} className="flex-1 flex items-center justify-center bg-dark-bg p-4 overflow-hidden relative" 
                  onMouseUp={handleContainerMouseUp}
                  onMouseLeave={handleContainerMouseUp}
                  onMouseMove={handleContainerMouseMove}
                  onTouchEnd={handleContainerTouchEnd}
                  onTouchMove={handleContainerTouchMove}
                  onMouseDown={handlePanStart as any}
                  onTouchStart={handlePanStart as any}>
                
                {isProcessing ? (
                     <div className="relative w-full h-full flex items-center justify-center">
                        <img src={image.src} alt="Generating preview..." className="max-w-full max-h-full filter blur-md opacity-50"/>
                        <div className="absolute inset-0 bg-dark-input rounded-xl overflow-hidden">
                           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-600/20 to-transparent -translate-x-full animate-shimmer"></div>
                        </div>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                           <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                           <p className="mt-3 text-md font-semibold">Generating preview...</p>
                        </div>
                    </div>
                ) : (
                    <div ref={compareContainerRef} className="relative select-none max-w-full max-h-full" style={{lineHeight: 0, cursor: isPanning ? 'grabbing' : zoom > 1 ? 'grab' : 'default'}}>
                        <div style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`, transition: isPanning ? 'none' : 'transform 0.1s ease-out' }}>
                            <img src={image.src} alt="Original" className="block max-w-full max-h-[60vh] md:max-h-[75vh] rounded-lg pointer-events-none" />
                            {previewSrc && (
                                <>
                                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-lg" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}>
                                        <img src={previewSrc} alt="Upscaled Preview" className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none" />
                                    </div>
                                </>
                            )}
                        </div>
                         {previewSrc && zoom === 1 && (
                            <div className="absolute inset-y-0 w-1 bg-white/80" style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)', cursor: 'ew-resize' }}>
                                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white rounded-full p-1 shadow-lg text-dark-bg cursor-ew-resize"
                                    onMouseDown={handleSliderMouseDown} onTouchStart={handleSliderTouchStart}>
                                    <SliderIcon className="w-6 h-6" />
                                </div>
                            </div>
                        )}
                        {!previewSrc && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                                <p className="text-white font-semibold">Generate a preview to compare</p>
                            </div>
                        )}
                    </div>
                )}
                 <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                    <button onClick={handleZoomIn} className="bg-dark-surface/80 p-2 rounded-md hover:bg-dark-surface"><PlusIcon className="w-5 h-5"/></button>
                    <button onClick={handleZoomOut} disabled={zoom <= 1} className="bg-dark-surface/80 p-2 rounded-md hover:bg-dark-surface disabled:opacity-40"><XIcon className="w-5 h-5"/></button>
                </div>
            </main>
            
            <aside className="w-full md:w-80 border-t md:border-t-0 md:border-l border-dark-border flex flex-col bg-dark-bg">
              <fieldset disabled={isProcessing} className="p-4 flex-grow overflow-y-auto space-y-3">
                    <AccordionSection title="1. Upscale Factor" sectionId="factor" activeSection={activeSection} setActiveSection={setActiveSection}>
                        <div className="flex space-x-2">
                            <RadioButton label="2x" value={2} name="factor" checked={factor === 2} onChange={(val) => setFactor(Number(val) as UpscaleFactor)} />
                            <RadioButton label="4x" value={4} name="factor" checked={factor === 4} onChange={(val) => setFactor(Number(val) as UpscaleFactor)} />
                            <RadioButton label="8x" value={8} name="factor" checked={factor === 8} onChange={(val) => setFactor(Number(val) as UpscaleFactor)} />
                        </div>
                    </AccordionSection>

                    <AccordionSection title="2. Image Profile" sectionId="profile" activeSection={activeSection} setActiveSection={setActiveSection}>
                         <select value={profile} onChange={e => setProfile(e.target.value as UpscaleProfile)} className="w-full rounded-md border-dark-border bg-dark-input shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm">
                            <option>Default</option>
                            <option>Photo</option>
                            <option>Product</option>
                            <option>Text / Artwork</option>
                         </select>
                    </AccordionSection>

                    <AccordionSection title="3. Refinements" sectionId="refinements" activeSection={activeSection} setActiveSection={setActiveSection}>
                        <div className="space-y-2">
                            <Toggle label="Artifact Removal" enabled={removeArtifacts} onToggle={setRemoveArtifacts} description="Clean JPEG & compression noise." />
                            <Toggle label="Face Preservation" enabled={preserveFaces} onToggle={setPreserveFaces} description="Restore faces with high fidelity." disabled={profile !== 'Photo'}/>
                            <Toggle label="Enhance Details" enabled={enhanceDetails} onToggle={setEnhanceDetails} description="Subtly add plausible details." />
                        </div>
                    </AccordionSection>
                  
                  {error && <p className="text-sm text-red-500 bg-red-500/10 p-2 rounded-md">{error}</p>}
              </fieldset>
              <div className="p-4 border-t border-dark-border bg-dark-surface flex flex-col gap-2 flex-shrink-0">
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
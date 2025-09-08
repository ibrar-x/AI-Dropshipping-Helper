import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useAppStore } from '../../store';
import { GeneratedImage, AdBrief, AdCreativeState, LibraryImage } from '../../types';
import ImageUploader from '../ImageUploader';
import { createThumbnail, downloadImage } from '../../utils/imageUtils';
import { generateAdImage, generateAdCopy, enhancePromptStream, suggestVisualPrompts, generatePlatformContentStream } from '../../services/geminiService';
import { PaperclipIcon } from '../icons/PaperclipIcon';
import { RefreshIcon } from '../icons/RefreshIcon';
import { XIcon } from '../icons/XIcon';
import AdCreativeEditor from '../AdCreativeEditor';
import ImageEditor from '../ImageEditor';
import { BrushIcon } from '../icons/BrushIcon';
import { MagicWandIcon } from '../icons/MagicWandIcon';
import AdCopyDisplay from '../AdCopyDisplay';
import { DownloadIcon } from '../icons/DownloadIcon';
import PlatformContentGenerator from '../PlatformContentGenerator';
import { PhotoIcon } from '../icons/PhotoIcon';
import { ChatIcon } from '../icons/ChatIcon';
import ToggleSwitch from '../ToggleSwitch';
import { UpscaleIcon } from '../icons/UpscaleIcon';

interface AdGeneratorTabProps {
    initialImage?: GeneratedImage | null;
}

interface AdCopyTabsProps {
    adCopyContent: React.ReactNode;
    platformContent: React.ReactNode;
}

const AdCopyTabs: React.FC<AdCopyTabsProps> = ({ adCopyContent, platformContent }) => {
    const [activeTab, setActiveTab] = useState<'copy' | 'platform'>('copy');

    const tabs = [
        { id: 'copy', label: 'AI-Generated Ad Copy' },
        { id: 'platform', label: 'Platform-Specific Content' }
    ];

    return (
        <div className="w-full">
            <div className="flex justify-center items-center space-x-8">
                {tabs.map(tab => (
                    <div key={tab.id} className="relative flex flex-col items-center">
                        <button
                            onClick={() => setActiveTab(tab.id as 'copy' | 'platform')}
                            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300
                                ${activeTab === tab.id
                                    ? 'bg-black text-white shadow-lg'
                                    : 'text-dark-text-secondary hover:text-white'
                                }`
                            }
                        >
                            {tab.label}
                        </button>
                        {activeTab === tab.id && (
                           <div className="absolute -bottom-1.5 w-4 h-3 bg-black" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }}></div>
                        )}
                    </div>
                ))}
            </div>

            <div className="bg-black p-4 sm:p-6 rounded-2xl border border-dark-border mt-4">
                {activeTab === 'copy' ? adCopyContent : platformContent}
            </div>
        </div>
    );
};


type AdGenStep = 'UPLOAD' | 'PLACEMENT' | 'VISUALS' | 'GENERATING' | 'RESULTS';
type ResultsView = 'creatives' | 'copy_and_tools';

const INITIAL_PLATFORMS = ['Generic Web Ad', 'Facebook Feed', 'Instagram Post', 'Instagram Story', 'TikTok Ad', 'Shopify Main Image', 'Etsy Listing', 'eBay Main Image'];
const IMAGE_TYPES = ['Ad Creative', 'Visual Only'];
const ASPECT_RATIOS = [
    { label: 'Square (1:1)', value: '1:1' },
    { label: 'Portrait (9:16)', value: '9:16' },
    { label: 'Landscape (16:9)', value: '16:9' },
    { label: 'Standard (4:3)', value: '4:3' },
];

const initialAdBrief: AdBrief = {
    platforms: ['Facebook/Instagram Feed'],
    campaignGoal: 'Sales',
    targetAudience: { types: [], painPoints: '', desires: '', objections: '', custom: '' },
    product: { name: '', category: '', features: '', benefits: '', usp: '', price: '', offer: '', proof: '' },
    tone: { primary: 'Professional & Trustworthy', secondary: '' },
    structure: [],
    compliance: { region: 'UK/£', wordsToAvoid: '', mustInclude: '', charLimits: '' },
    visuals: { hasImages: true, needsPrompts: true, style: 'Minimalist clean (Shopify-style)', palette: '', onImageText: '', numberOfImages: 3 }
};

const initialCreativeState: AdCreativeState = {
    headline: 'Your Headline Here',
    body: 'Describe your product or offer in a few words.',
    cta: 'Shop Now',
    textColor: '#FFFFFF',
    font: 'Inter',
    templateId: 'standard-v1',
    showLogo: true,
    backgroundColor: '#6D28D9',
    showHeadline: true,
    showCta: true,
    headlineSize: 8,
    headlineAlign: 'center',
    headlinePosition: { x: 50, y: 15 },
    ctaSize: 5,
    ctaPosition: { x: 50, y: 88 },
    logoPosition: { x: 92, y: 8 },
    logoScale: 12,
    textShadow: true,
    textOutline: false,
    textOutlineColor: '#000000',
    textOutlineWidth: 2,
};

const CreativesContent: React.FC<{
    finalCreatives: GeneratedImage[];
    setViewingImageSrc: (src: string | null) => void;
    setEditingFinalCreativeIndex: (index: number | null) => void;
    handleDownloadFinalCreative: (image: GeneratedImage) => void;
    isDownloading: string | null;
    openUpscaler: (image: GeneratedImage) => void;
}> = ({ finalCreatives, setViewingImageSrc, setEditingFinalCreativeIndex, handleDownloadFinalCreative, isDownloading, openUpscaler }) => {
    return (
        <>
            <h3 className="text-xl font-bold mb-4">Final Creatives</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {finalCreatives.map((img, index) => (
                    img.src ? (
                        <div key={img.id} className="space-y-2 animate-fade-in">
                            <div className="relative">
                                <img src={img.thumbnailSrc || img.src} onClick={() => setViewingImageSrc(img.src)} alt="Final ad creative" className="rounded-lg w-full aspect-square object-cover cursor-pointer"/>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setEditingFinalCreativeIndex(index)} className="flex-1 flex items-center justify-center gap-2 bg-dark-input hover:bg-dark-border text-dark-text-primary text-sm font-semibold px-3 py-2 rounded-md transition-colors"><BrushIcon className="w-4 h-4" /> <span>Edit</span></button>
                                <button onClick={() => openUpscaler(img)} className="flex-1 flex items-center justify-center gap-2 bg-dark-input hover:bg-dark-border text-dark-text-primary text-sm font-semibold px-3 py-2 rounded-md transition-colors"><UpscaleIcon className="w-4 h-4" /> <span>Upscale</span></button>
                                <button onClick={() => handleDownloadFinalCreative(img)} disabled={isDownloading === img.id} className="p-2 bg-dark-input hover:bg-dark-border text-dark-text-primary rounded-md transition-colors disabled:opacity-50" title="Download">
                                    {isDownloading === img.id ? <RefreshIcon className="w-5 h-5 animate-spin" /> : <DownloadIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div key={img.id || index} className="aspect-square bg-dark-input rounded-xl border-2 border-red-500/50 flex items-center justify-center text-center p-2">
                            <p className="text-sm font-semibold text-red-400">Generation Failed</p>
                        </div>
                    )
                ))}
            </div>
        </>
    );
}

const TabButton: React.FC<{
    label: string;
    view: ResultsView;
    icon: React.ReactNode;
    activeView: ResultsView;
    onClick: (view: ResultsView) => void;
}> = ({ label, view, icon, activeView, onClick }) => (
    <button onClick={() => onClick(view)} className={`flex-1 flex flex-col items-center justify-center gap-1 p-2 text-xs font-semibold rounded-md transition-colors ${activeView === view ? 'bg-dark-input text-dark-text-primary' : 'text-dark-text-secondary hover:bg-dark-input'}`}>
        {icon} {label}
    </button>
);


const AdGeneratorTab: React.FC<AdGeneratorTabProps> = ({ initialImage }) => {
    const { 
        addToast, 
        addImagesToLibrary, 
        clearRecreationData,
        adGeneratorResults: finalCreatives,
        setAdGeneratorResults,
        updateAdGeneratorResult,
        openLibrarySelector,
        openUpscaler,
    } = useAppStore();
    
    const [step, setStep] = useState<AdGenStep>('UPLOAD');
    const [sourceImage, setSourceImage] = useState<GeneratedImage | null>(null);
    
    // Brief Step State
    const [productTopic, setProductTopic] = useState('');
    
    // Placement Step State
    const [placementCreativeState, setPlacementCreativeState] = useState<AdCreativeState>(initialCreativeState);
    const placementEditorContainerRef = useRef<HTMLDivElement>(null);
    
    // Visuals Step State
    const [numVariations, setNumVariations] = useState(2);
    const [visualPrompts, setVisualPrompts] = useState<string[]>(Array(2).fill(''));
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [isEnhancingPrompt, setIsEnhancingPrompt] = useState<number | null>(null);
    const [styleReferenceImage, setStyleReferenceImage] = useState<File | null>(null);

    const [platforms, setPlatforms] = useState<string[]>(INITIAL_PLATFORMS);
    const [platform, setPlatform] = useState(INITIAL_PLATFORMS[0]);
    const [isAddingCustomPlatform, setIsAddingCustomPlatform] = useState(false);
    const [customPlatform, setCustomPlatform] = useState('');
    const [imageType, setImageType] = useState(IMAGE_TYPES[0]);
    const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[0].value);
    
    const [editingFinalCreativeIndex, setEditingFinalCreativeIndex] = useState<number | null>(null);

    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);

    const [isProcessing, setIsProcessing] = useState(false);
    const [processingMessage, setProcessingMessage] = useState('');
    
    const [viewingImageSrc, setViewingImageSrc] = useState<string | null>(null);
    const [resultsView, setResultsView] = useState<ResultsView>('creatives');
    const [isDownloading, setIsDownloading] = useState<string | null>(null);

    const [pendingEdit, setPendingEdit] = useState<{ sourceId: string; dataUrl: string } | null>(null);
    
    // State for Ad Copy
    const [adCopyHtml, setAdCopyHtml] = useState('');
    const [isGeneratingAdCopy, setIsGeneratingAdCopy] = useState(false);

    // State for Platform Content
    const [platformGeneratedContent, setPlatformGeneratedContent] = useState('');
    const [isGeneratingPlatformContent, setIsGeneratingPlatformContent] = useState(false);


    const handlePlacementStateChange = useCallback((newState: Partial<AdCreativeState>) => {
        setPlacementCreativeState(prevState => ({ ...prevState, ...newState }));
    }, []);

    const resetState = () => {
        setStep('UPLOAD');
        setSourceImage(null);
        setProductTopic('');
        setPlacementCreativeState(initialCreativeState);
        setNumVariations(2);
        setVisualPrompts(Array(2).fill(''));
        setPlatforms(INITIAL_PLATFORMS);
        setPlatform(INITIAL_PLATFORMS[0]);
        setImageType(IMAGE_TYPES[0]);
        setAspectRatio(ASPECT_RATIOS[0].value);
        setAdGeneratorResults([]);
        setEditingFinalCreativeIndex(null);
        setLogoFile(null);
        setLogoImage(null);
        setIsProcessing(false);
        setProcessingMessage('');
        setViewingImageSrc(null);
        setResultsView('creatives');
        setStyleReferenceImage(null);
        setAdCopyHtml('');
        setIsGeneratingAdCopy(false);
        setPlatformGeneratedContent('');
        setIsGeneratingPlatformContent(false);
    }

    const handleImageUpload = useCallback(async (image: GeneratedImage) => {
        setSourceImage(image);
        setPlacementCreativeState(prev => ({...prev, headline: '', cta: ''})); // Clear default text
        setStep('PLACEMENT');
    }, []);

    const handleSelectFromLibrary = () => {
        openLibrarySelector({
            multiple: false,
            onSelect: (images) => {
                if (images[0]) {
                    handleImageUpload(images[0]);
                }
            }
        });
    };

    useEffect(() => {
        if (initialImage && !sourceImage) {
            handleImageUpload(initialImage);
            clearRecreationData();
        }
    }, [initialImage, sourceImage, handleImageUpload, clearRecreationData]);

    // Adjust the visual prompts array size when numVariations changes
    useEffect(() => {
        setVisualPrompts(currentPrompts => {
            const newPrompts = Array(numVariations).fill('');
            for (let i = 0; i < Math.min(currentPrompts.length, numVariations); i++) {
                newPrompts[i] = currentPrompts[i];
            }
            return newPrompts;
        });
    }, [numVariations]);
    
    const handleStyleReferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 4 * 1024 * 1024) { // 4MB limit for Gemini
                addToast({
                    title: 'Image Too Large',
                    message: 'Please select an image smaller than 4MB.',
                    type: 'error',
                });
                e.target.value = ''; // Clear the input
                return;
            }
            setStyleReferenceImage(file);
        }
    };

    const handleSelectStyleFromLibrary = () => {
        openLibrarySelector({
            multiple: false,
            onSelect: async (selectedImages) => {
                if (selectedImages[0]) {
                    const image = selectedImages[0];
                    const res = await fetch(image.src);
                    const blob = await res.blob();
                    const file = new File([blob], "style_ref.png", { type: blob.type });
                    setStyleReferenceImage(file);
                }
            }
        });
    };

    const handleSuggestPrompts = async () => {
        if (!sourceImage || isLoadingSuggestions) return;
        
        setIsLoadingSuggestions(true);
        try {
            const res = await fetch(sourceImage.src);
            const blob = await res.blob();
            const imageFile = new File([blob], "product.png", { type: blob.type });
            const suggestions = await suggestVisualPrompts(imageFile, numVariations, styleReferenceImage || undefined);
            
            const finalSuggestions = Array(numVariations).fill('');
             for (let i = 0; i < numVariations; i++) {
                finalSuggestions[i] = suggestions[i] || '';
            }
            setVisualPrompts(finalSuggestions);

        } catch (error) {
            console.error("Failed to get prompt suggestions", error);
            addToast({ title: 'Suggestion Error', message: 'Could not fetch AI prompt ideas.', type: 'error'});
        } finally {
            setIsLoadingSuggestions(false);
        }
    };


    const handlePromptChange = (index: number, value: string) => {
        setVisualPrompts(current => {
            const newPrompts = [...current];
            newPrompts[index] = value;
            return newPrompts;
        });
    };

    const handleEnhancePrompt = async (index: number) => {
        const currentPrompt = visualPrompts[index];
        if (!currentPrompt.trim() || isEnhancingPrompt !== null) return;
        
        const systemInstruction = "You are a creative assistant that expands upon user prompts for an AI image generator. Rewrite the following prompt to be more descriptive, vivid, and detailed, focusing on creating a photorealistic, high-quality ad visual. Only return the enhanced prompt text, without any preamble.";
        setIsEnhancingPrompt(index);
        handlePromptChange(index, ''); // Clear the box while enhancing

        try {
            const stream = enhancePromptStream(currentPrompt, systemInstruction);
            let fullText = '';
            for await (const chunk of stream) {
                fullText += chunk;
                handlePromptChange(index, fullText);
            }
        } catch (e) {
            handlePromptChange(index, currentPrompt); // Restore on error
            addToast({ title: 'Enhancement Failed', message: 'Could not enhance prompt.', type: 'error' });
        } finally {
            setIsEnhancingPrompt(null);
        }
    };

    const handleAddBlendingCommand = () => {
        const blendingCommand = " CRITICAL COMMAND: You MUST perfectly blend the entire subject from the reference image (including any logos or text) into the new scene. Do not alter, redraw, or change the subject.";
        setVisualPrompts(prompts => prompts.map(p => {
            if (p.trim() && !p.trim().endsWith(blendingCommand.trim())) {
                return p.trim() + blendingCommand;
            }
            return p;
        }));
        addToast({ title: 'Blending Command Added', message: 'A special instruction has been added to your prompts.', type: 'success' });
    };

    const handleGenerateVisuals = async () => {
        if (!sourceImage) {
            addToast({ title: 'Generation Error', message: 'Missing source product image.', type: 'error' });
            return;
        }

        const promptsToGenerate = visualPrompts.slice(0, numVariations).filter(p => p.trim() !== '');
        if (promptsToGenerate.length === 0) {
            addToast({ title: 'Missing Prompt', message: 'Please enter at least one visual prompt.', type: 'error' });
            return;
        }
        
        setStep('GENERATING');
        const placeholders: GeneratedImage[] = Array(promptsToGenerate.length).fill(null).map((_, i) => ({
            id: `loading_${i}_${Date.now()}`,
            src: '',
            isLoading: true,
        }));
        setAdGeneratorResults(placeholders);
        
        const referenceInputs: (File | { dataUrl: string })[] = [];
        referenceInputs.push({ dataUrl: sourceImage.src });
        
        let logoIndex = -1;
        if (logoFile && placementCreativeState.showLogo) {
            referenceInputs.push(logoFile);
            logoIndex = referenceInputs.length -1;
        }
        
        if (styleReferenceImage) {
            referenceInputs.push(styleReferenceImage);
        }
        
        const allResults: GeneratedImage[] = [];

        for (let i = 0; i < promptsToGenerate.length; i++) {
            setProcessingMessage(`Generating visual ${i + 1} of ${promptsToGenerate.length}...`);
            try {
                const userPrompt = promptsToGenerate[i];
                
                let placementInstructions = `Composite the provided product image (the first reference image) into a new scene based on the user prompt. `;
                
                if (imageType === 'Ad Creative') {
                    if (placementCreativeState.showHeadline && placementCreativeState.headline) {
                        placementInstructions += `The headline "${placementCreativeState.headline}" should be placed prominently on the image as text, styled according to the scene's aesthetic. Position it near the coordinates X=${Math.round(placementCreativeState.headlinePosition.x)}%, Y=${Math.round(placementCreativeState.headlinePosition.y)}%. `;
                    }
                    if (placementCreativeState.showCta && placementCreativeState.cta) {
                        placementInstructions += `A call-to-action button with the text "${placementCreativeState.cta}" should be included in a suitable location. Position it near the coordinates X=${Math.round(placementCreativeState.ctaPosition.x)}%, Y=${Math.round(placementCreativeState.ctaPosition.y)}%. `;
                    }
                    if (logoFile && placementCreativeState.showLogo) {
                        placementInstructions += `The provided logo (reference image at index ${logoIndex}) should be placed tastefully, usually in a corner. Position it near the coordinates X=${Math.round(placementCreativeState.logoPosition.x)}%, Y=${Math.round(placementCreativeState.logoPosition.y)}%. `;
                    }
                }
                
                placementInstructions += `Blend all elements seamlessly and photorealistically. The final output must be a single, cohesive image.`;
                
                const finalPrompt = `You are an expert AI image editor and compositor. Your task is to generate an image based on a user prompt and then composite several elements into it according to detailed instructions.

User prompt for the new background scene: "${userPrompt}"

CRITICAL COMPOSITING INSTRUCTIONS:
${placementInstructions}`;
                
                const [newImage] = await generateAdImage(finalPrompt, aspectRatio, 1, referenceInputs);
                
                // Save to library with metadata
                const [savedImage] = await addImagesToLibrary([{
                    src: newImage.src,
                    prompt: userPrompt,
                    originalId: sourceImage?.id,
                }]);

                const result = { ...savedImage, isLoading: false };
                allResults.push(result);
                updateAdGeneratorResult('replace', result, placeholders[i].id);
            } catch (error) {
                console.error(`Failed to generate visual ${i + 1}`, error);
                addToast({ title: `Visual ${i + 1} Failed`, message: error instanceof Error ? error.message : 'Unknown error.', type: 'error' });
                const errorResult = { id: `error_${i}_${Date.now()}`, src: '', isLoading: false };
                allResults.push(errorResult);
                updateAdGeneratorResult('replace', errorResult, placeholders[i].id);
            }
        }
        
        setProcessingMessage('');
        setStep('RESULTS');
    };


    const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogoFile(file);

            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.onload = () => setLogoImage(img);
                    img.src = event.target.result as string;
                    addToast({ title: 'Logo Loaded', message: 'Your logo has been added to the canvas.', type: 'success' });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    
    const handleSaveEditedFinalCreative = useCallback((finalImageDataUrl: string) => {
        if (editingFinalCreativeIndex === null) return;
        const sourceImage = finalCreatives[editingFinalCreativeIndex];
        if (!sourceImage?.id) return;
        setPendingEdit({ sourceId: sourceImage.id, dataUrl: finalImageDataUrl });
        setEditingFinalCreativeIndex(null);
    }, [editingFinalCreativeIndex, finalCreatives]);

    const resolvePendingEdit = useCallback(async (action: 'replace' | 'copy') => {
        if (!pendingEdit) return;
        
        const { sourceId, dataUrl } = pendingEdit;

        const [savedImage] = await addImagesToLibrary([{
            src: dataUrl,
            originalId: sourceId,
            prompt: `Edited from creative ${sourceId}`,
        }]);

        updateAdGeneratorResult(action, savedImage, sourceId);
        
        addToast({ 
            title: 'Creative Saved', 
            message: `Your edited creative has been saved ${action === 'copy' ? 'as a copy.' : 'by replacing the original.'}`, 
            type: 'success', 
            imageSrc: savedImage.thumbnailSrc 
        });
        
        setPendingEdit(null);
    }, [pendingEdit, addImagesToLibrary, updateAdGeneratorResult, addToast]);
    
    const briefForAdCopy = useMemo((): AdBrief => ({
        ...initialAdBrief,
        platforms: [platform],
        product: { ...initialAdBrief.product, name: productTopic || 'Product', benefits: placementCreativeState.headline },
        visuals: { ...initialAdBrief.visuals, onImageText: placementCreativeState.headline }
    }), [platform, placementCreativeState, productTopic]);
    
    const handleGenerateAdCopy = useCallback(async () => {
        setIsGeneratingAdCopy(true);
        setAdCopyHtml('');
        try {
            const stream = generateAdCopy(briefForAdCopy);
            let fullText = '';
            for await (const chunk of stream) {
                fullText += chunk;
                setAdCopyHtml(fullText);
            }
        } catch (error) {
            console.error("Ad copy generation failed", error);
            setAdCopyHtml("<p>Sorry, there was an error generating the ad copy.</p>");
        } finally {
            setIsGeneratingAdCopy(false);
        }
    }, [briefForAdCopy]);

    const adCopyContent = useMemo(() => {
        if (isGeneratingAdCopy) {
            return <AdCopyDisplay htmlContent="" isLoading={true} />;
        }
        if (adCopyHtml) {
            return <AdCopyDisplay htmlContent={adCopyHtml} isLoading={false} />;
        }
        return (
            <div className="text-center p-8 space-y-4 rounded-lg bg-dark-input/50">
                <h3 className="text-xl font-bold text-white">Ready to Generate Ad Copy?</h3>
                <p className="text-dark-text-secondary max-w-sm mx-auto">Click the button to generate platform-specific copy, A/B test ideas, and more based on your ad creative.</p>
                <button
                    onClick={handleGenerateAdCopy}
                    className="flex items-center justify-center gap-2 bg-brand-secondary text-white font-bold py-2.5 px-6 rounded-lg hover:bg-purple-700 transition-colors"
                >
                    <MagicWandIcon className="w-5 h-5" />
                    Generate Copy with AI
                </button>
            </div>
        );
    }, [adCopyHtml, isGeneratingAdCopy, handleGenerateAdCopy]);
    
    const handleGeneratePlatformContent = useCallback(async (prompt: string) => {
        setIsGeneratingPlatformContent(true);
        setPlatformGeneratedContent('');
        try {
            const stream = generatePlatformContentStream(platform, briefForAdCopy, prompt);
            let fullText = '';
            for await (const chunk of stream) {
                fullText += chunk;
                setPlatformGeneratedContent(fullText);
            }
        } catch (error) {
            console.error("Platform content generation error:", error);
            addToast({
                title: 'Content Generation Failed',
                message: error instanceof Error ? error.message : 'Could not generate platform-specific content.',
                type: 'error'
            });
        } finally {
            setIsGeneratingPlatformContent(false);
        }
    }, [platform, briefForAdCopy, addToast]);

    const platformContent = useMemo(() => <PlatformContentGenerator
        platform={platform}
        brief={briefForAdCopy}
        generatedContent={platformGeneratedContent}
        isLoading={isGeneratingPlatformContent}
        onGenerate={handleGeneratePlatformContent}
    />, [platform, briefForAdCopy, platformGeneratedContent, isGeneratingPlatformContent, handleGeneratePlatformContent]);

    const handleDownloadFinalCreative = (image: GeneratedImage) => {
        setIsDownloading(image.id);
        try {
            downloadImage(image.src, `creative-${image.id.slice(-6)}`, 'png');
        } catch (error) {
            addToast({ title: 'Download Failed', message: 'Could not download the image.', type: 'error' });
        } finally {
            setTimeout(() => setIsDownloading(null), 1000);
        }
    };

    const handleAddNewPlatform = () => {
        if(customPlatform.trim() && !platforms.includes(customPlatform.trim())) {
            const newPlatforms = [...platforms, customPlatform.trim()];
            setPlatforms(newPlatforms);
            setPlatform(customPlatform.trim());
            setCustomPlatform('');
            setIsAddingCustomPlatform(false);
        }
    }
    
    if (step === 'UPLOAD') {
        return <ImageUploader onUpload={(images) => handleImageUpload(images[0])} onSelectFromLibrary={handleSelectFromLibrary} title="Ad Generator" subtitle="Upload a product image to generate an ad campaign." multiple={false} />;
    }

    const renderStepContent = () => {
        switch (step) {
            case 'PLACEMENT':
                return (
                    <div className="flex-1 flex flex-col md:flex-row h-full overflow-y-auto md:overflow-hidden">
                        <div ref={placementEditorContainerRef} className="flex-1 flex flex-col items-center justify-center p-2 bg-dark-bg relative">
                             {sourceImage ? (
                                <AdCreativeEditor
                                    backgroundImage={sourceImage}
                                    logoImage={logoImage}
                                    creativeState={placementCreativeState}
                                    onStateChange={handlePlacementStateChange}
                                />
                            ) : <p>Loading image...</p>}
                        </div>
                        <aside className="w-full md:w-80 border-t md:border-t-0 md:border-l border-dark-border flex flex-col bg-dark-surface">
                            <div className="p-4 flex-grow overflow-y-auto space-y-3">
                                <h3 className="text-xl font-bold mb-2">Configure Ad Elements</h3>
                                <p className="text-xs text-dark-text-secondary -mt-2">Drag elements on the canvas to reposition them. The AI will use this layout as a reference.</p>
                                <div>
                                    <label className="text-sm font-semibold block mb-1">Product Description</label>
                                    <input 
                                        type="text"
                                        value={productTopic}
                                        onChange={(e) => setProductTopic(e.target.value)}
                                        placeholder="e.g., A luxury phone case"
                                        className="w-full text-sm rounded-lg border-dark-border bg-dark-input p-2"
                                    />
                                    <p className="text-xs text-dark-text-secondary mt-1">This helps generate more accurate ad copy later.</p>
                                </div>
                                <ToggleSwitch 
                                    label="Show Headline" 
                                    enabled={placementCreativeState.showHeadline} 
                                    onToggle={(enabled) => setPlacementCreativeState(prev => ({ ...prev, showHeadline: enabled }))}
                                />
                                <ToggleSwitch 
                                    label="Show CTA Button" 
                                    enabled={placementCreativeState.showCta} 
                                    onToggle={(enabled) => setPlacementCreativeState(prev => ({ ...prev, showCta: enabled }))}
                                />
                                <div>
                                    <label className="text-sm font-semibold block mb-1">Headline</label>
                                    <textarea disabled={!placementCreativeState.showHeadline} value={placementCreativeState.headline} onChange={e => setPlacementCreativeState(p => ({ ...p, headline: e.target.value }))} rows={2} className="w-full text-sm rounded-lg border-dark-border bg-dark-input p-2 disabled:opacity-50" />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold block mb-1">CTA Button Text</label>
                                    <input type="text" disabled={!placementCreativeState.showCta} value={placementCreativeState.cta} onChange={e => setPlacementCreativeState(p => ({ ...p, cta: e.target.value }))} className="w-full text-sm rounded-lg border-dark-border bg-dark-input p-2 disabled:opacity-50" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold block">Logo</label>
                                    <label htmlFor="logo-upload" className="cursor-pointer bg-dark-input border border-dark-border rounded-md py-1.5 px-2.5 text-sm font-medium text-dark-text-secondary hover:bg-dark-border flex items-center gap-2">
                                        <PaperclipIcon className="w-4 h-4" />
                                        <span className="truncate">{logoFile?.name ?? 'Upload Logo'}</span>
                                    </label>
                                    <input id="logo-upload" type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleLogoFileChange} />
                                     {logoImage && (
                                        <div className="pt-2">
                                            <label className="block text-sm font-medium text-dark-text-secondary mb-1">Logo Size: <span className="font-semibold text-dark-text-primary">{placementCreativeState.logoScale.toFixed(0)}%</span></label>
                                            <input 
                                                type="range" 
                                                min="1" 
                                                max="50" 
                                                step="0.5"
                                                value={placementCreativeState.logoScale} 
                                                onChange={(e) => setPlacementCreativeState(p => ({ ...p, logoScale: parseFloat(e.target.value) }))}
                                                className="w-full h-2 bg-dark-input rounded-lg appearance-none cursor-pointer accent-brand-primary" 
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                             <div className="p-4 border-t border-dark-border bg-dark-surface/50 flex items-center gap-2 flex-shrink-0">
                                <button onClick={() => setStep('UPLOAD')} className="text-sm font-semibold bg-dark-input hover:bg-dark-border border border-dark-border px-4 py-3 rounded-md">Back</button>
                                <button onClick={() => setStep('VISUALS')} className="flex-1 w-full bg-brand-primary hover:bg-brand-secondary text-white font-bold px-4 py-3 rounded-md">
                                    Continue
                                </button>
                            </div>
                        </aside>
                    </div>
                );
            case 'VISUALS':
                 return (
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="flex-1 overflow-y-auto">
                           <fieldset disabled={isLoadingSuggestions || isEnhancingPrompt !== null} className="w-full max-w-3xl mx-auto p-4 md:p-6 space-y-4">
                                <h2 className="text-3xl font-bold text-center">Design Your Ad Visuals</h2>
                                <p className="text-center text-dark-text-secondary">Describe the background scene for your ad. The AI will blend your product and text into it.</p>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-2">
                                     <div>
                                        <label className="font-semibold text-sm block mb-1">Platform</label>
                                        <select value={isAddingCustomPlatform ? 'add_new' : platform} onChange={e => e.target.value === 'add_new' ? setIsAddingCustomPlatform(true) : (setPlatform(e.target.value), setIsAddingCustomPlatform(false))} className="w-full text-sm rounded-lg border-dark-border bg-dark-input p-2">
                                            {platforms.map(p => <option key={p}>{p}</option>)}
                                            <option value="add_new">+ Add Custom</option>
                                        </select>
                                        {isAddingCustomPlatform && (
                                            <div className="flex items-center gap-1 mt-1">
                                                <input type="text" value={customPlatform} onChange={e => setCustomPlatform(e.target.value)} placeholder="New platform" className="w-full text-xs rounded-lg border-dark-border bg-dark-input p-1.5"/>
                                                <button onClick={handleAddNewPlatform} className="p-1.5 bg-dark-input rounded-md text-xs">Add</button>
                                            </div>
                                        )}
                                    </div>
                                     <div>
                                        <label className="font-semibold text-sm block mb-1">Image Type</label>
                                        <select value={imageType} onChange={e => setImageType(e.target.value)} className="w-full text-sm rounded-lg border-dark-border bg-dark-input p-2">
                                            {IMAGE_TYPES.map(p => <option key={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="font-semibold text-sm block mb-1">Aspect Ratio</label>
                                        <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="w-full text-sm rounded-lg border-dark-border bg-dark-input p-2">
                                            {ASPECT_RATIOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="font-semibold text-sm block mb-1">Variations</label>
                                        <input type="number" min="1" max="8" value={numVariations} onChange={e => setNumVariations(parseInt(e.target.value, 10) || 1)} className="w-full text-sm rounded-lg border-dark-border bg-dark-input p-2" />
                                    </div>
                                </div>

                                <div className="bg-dark-surface p-3 rounded-lg border border-dark-border">
                                    <label className="font-semibold text-sm block mb-2 text-dark-text-secondary">Style Reference (Optional)</label>
                                    <p className="text-xs text-dark-text-secondary mb-2">Upload an image to influence the style and composition of the generated visuals.</p>
                                    <div className="flex items-center gap-2">
                                        <label htmlFor="style-ref-upload" className="flex-1 cursor-pointer bg-dark-input border border-dark-border rounded-md py-1.5 px-2.5 text-sm font-medium text-dark-text-secondary hover:bg-dark-border flex items-center gap-2">
                                            <PaperclipIcon className="w-4 h-4" />
                                            <span className="truncate">{styleReferenceImage?.name ?? 'Upload style reference'}</span>
                                        </label>
                                        <input id="style-ref-upload" type="file" accept="image/png, image/jpeg, image/webp" className="hidden" onChange={handleStyleReferenceChange} />
                                        <button onClick={handleSelectStyleFromLibrary} className="p-2 bg-dark-input rounded-md hover:bg-dark-border" title="Select from Library">
                                            <PhotoIcon className="w-5 h-5" />
                                        </button>
                                        {styleReferenceImage && (
                                            <button onClick={() => setStyleReferenceImage(null)} className="p-2 bg-dark-input rounded-md hover:bg-dark-border" title="Remove style reference">
                                                <XIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    {visualPrompts.map((prompt, index) => (
                                        <div key={index}>
                                            <label className="font-semibold text-sm text-dark-text-secondary">Variation {index + 1} Prompt</label>
                                            <div className="relative mt-1">
                                                <textarea value={prompt} onChange={(e) => handlePromptChange(index, e.target.value)} rows={3} className="w-full text-sm rounded-lg border-dark-border bg-dark-input shadow-sm px-3 py-2 resize-y" placeholder="e.g., On a marble countertop..."/>
                                                <button onClick={() => handleEnhancePrompt(index)} disabled={isEnhancingPrompt !== null} className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-dark-surface border border-dark-border rounded-md text-xs text-brand-primary hover:bg-dark-input disabled:opacity-50">
                                                    <MagicWandIcon className={`w-4 h-4 ${isEnhancingPrompt === index ? 'animate-pulse' : ''}`} />
                                                    {isEnhancingPrompt === index ? 'Enhancing...' : 'Enhance'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={handleSuggestPrompts} disabled={isLoadingSuggestions} className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold bg-dark-input hover:bg-dark-border border border-dark-border px-4 py-2 rounded-md">
                                        <MagicWandIcon className={`w-4 h-4 ${isLoadingSuggestions ? 'animate-pulse' : ''}`} />
                                        {isLoadingSuggestions ? 'Getting ideas...' : 'Suggest Prompts'}
                                    </button>
                                    <button onClick={handleAddBlendingCommand} className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold bg-dark-input hover:bg-dark-border border border-dark-border px-4 py-2 rounded-md text-brand-secondary">
                                        <MagicWandIcon className="w-4 h-4" />
                                        Add Blend Cmd
                                    </button>
                                </div>
                            </fieldset>
                        </div>
                        <div className="flex-shrink-0 p-4 border-t border-dark-border bg-dark-surface">
                            <div className="w-full max-w-3xl mx-auto">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setStep('PLACEMENT')} className="text-sm font-semibold bg-dark-input hover:bg-dark-border border border-dark-border px-4 py-3 rounded-md">Back</button>
                                    <button onClick={handleGenerateVisuals} disabled={isProcessing || isLoadingSuggestions || isEnhancingPrompt !== null} className="flex-1 bg-brand-primary hover:bg-brand-secondary text-white font-bold px-4 py-3 rounded-md disabled:opacity-50">
                                        {isProcessing ? processingMessage : `Generate ${numVariations} Visuals`}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'GENERATING':
                return (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-dark-bg animate-fade-in text-center">
                        <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                        <h2 className="text-2xl font-bold mb-2">{processingMessage || 'Generating your campaign...'}</h2>
                        <p className="text-dark-text-secondary mb-8">This may take a minute. Please don't close the tab.</p>
                        <div className="w-full max-w-2xl grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {finalCreatives.map((img) => (
                                <div key={img.id} className="aspect-square bg-dark-surface rounded-xl overflow-hidden relative w-full border-2 border-dark-border">
                                    {img.src && !img.isLoading ? (
                                        <img src={img.thumbnailSrc || img.src} alt="Generated visual" className="w-full h-full object-cover animate-fade-in" />
                                    ) : (
                                        <div className="absolute inset-0 bg-dark-input">
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-600/50 to-transparent -translate-x-full animate-shimmer"></div>
                                        </div>
                                    )}
                                    <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs font-semibold px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                                        {img.isLoading ? 'Generating...' : (img.src ? 'Done' : 'Waiting...')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'RESULTS': {
                if (finalCreatives.length === 0) {
                    return (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-dark-bg animate-fade-in text-center">
                            <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                            <h2 className="text-2xl font-bold mb-2">Loading Results...</h2>
                            <p className="text-dark-text-secondary">Please wait a moment while the campaign assets are prepared.</p>
                        </div>
                    );
                }
            
                return (
                    <div className="w-full max-w-5xl mx-auto p-4 pt-8 md:p-6 space-y-6">
                        <div className="flex justify-between items-center flex-wrap gap-4">
                            <h2 className="text-3xl font-bold">Your Campaign is Ready!</h2>
                            <button onClick={resetState} className="text-sm font-semibold bg-dark-input hover:bg-dark-border border border-dark-border px-4 py-2 rounded-md">Start Over</button>
                        </div>
                        <div className="md:hidden sticky top-0 bg-dark-bg/80 backdrop-blur-sm py-2 z-10 -mx-4 px-4">
                            <div className="flex items-center justify-around gap-2 bg-dark-surface p-1 rounded-lg border border-dark-border">
                                <TabButton label="Creatives" view="creatives" icon={<PhotoIcon className="w-5 h-5" />} activeView={resultsView} onClick={setResultsView} />
                                <TabButton label="Copy & Tools" view="copy_and_tools" icon={<ChatIcon className="w-5 h-5" />} activeView={resultsView} onClick={setResultsView} />
                            </div>
                        </div>
                        <div className="hidden md:grid md:grid-cols-2 md:gap-6">
                            <div className="space-y-6">
                                <CreativesContent 
                                    finalCreatives={finalCreatives}
                                    setViewingImageSrc={setViewingImageSrc}
                                    setEditingFinalCreativeIndex={setEditingFinalCreativeIndex}
                                    handleDownloadFinalCreative={handleDownloadFinalCreative}
                                    isDownloading={isDownloading}
                                    openUpscaler={openUpscaler}
                                />
                            </div>
                            <div className="space-y-6">
                                <AdCopyTabs
                                    adCopyContent={adCopyContent}
                                    platformContent={platformContent}
                                />
                            </div>
                        </div>
                        <div className="md:hidden mt-4">
                            {resultsView === 'creatives' && 
                                <CreativesContent 
                                    finalCreatives={finalCreatives}
                                    setViewingImageSrc={setViewingImageSrc}
                                    setEditingFinalCreativeIndex={setEditingFinalCreativeIndex}
                                    handleDownloadFinalCreative={handleDownloadFinalCreative}
                                    isDownloading={isDownloading}
                                    openUpscaler={openUpscaler}
                                />
                            }
                            {resultsView === 'copy_and_tools' && 
                                <AdCopyTabs
                                    adCopyContent={adCopyContent}
                                    platformContent={platformContent}
                                />
                            }
                        </div>
                    </div>
                );
            }
        }
    };
    
    return (
        <div className="flex-1 flex flex-col w-full h-full bg-dark-bg">
            {renderStepContent()}
            {viewingImageSrc && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setViewingImageSrc(null)}>
                    <img src={viewingImageSrc} alt="Viewing creative" className="max-w-full max-h-full object-contain" />
                    <button className="absolute top-4 right-4 text-white p-2 bg-black/50 rounded-full hover:bg-black/70"><XIcon className="w-6 h-6" /></button>
                </div>
            )}
            {editingFinalCreativeIndex !== null && finalCreatives[editingFinalCreativeIndex] && (
                <ImageEditor image={finalCreatives[editingFinalCreativeIndex]!} onSave={handleSaveEditedFinalCreative} onCancel={() => setEditingFinalCreativeIndex(null)}/>
            )}
            {pendingEdit && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-dark-surface rounded-xl shadow-2xl w-full max-w-md p-6 text-center">
                        <h2 className="text-xl font-bold mb-2">Save Your Edit</h2>
                        <p className="text-dark-text-secondary mb-6">How would you like to save the changes to this creative?</p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => resolvePendingEdit('replace')}
                                className="flex-1 px-4 py-2 text-sm font-semibold bg-dark-input hover:bg-dark-border border border-dark-border rounded-md"
                            >
                                Replace Original
                            </button>
                            <button
                                onClick={() => resolvePendingEdit('copy')}
                                className="flex-1 px-4 py-2 text-sm font-semibold bg-brand-primary text-white rounded-md hover:bg-brand-secondary"
                            >
                                Save as a Copy
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdGeneratorTab;
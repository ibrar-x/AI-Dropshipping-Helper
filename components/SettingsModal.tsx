
import React from 'react';
import { XIcon } from './icons/XIcon';
import { MagicWandIcon } from './icons/MagicWandIcon';
import { Prompts } from '../types';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ExternalLinkIcon } from './icons/ExternalLinkIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { UploadIcon } from './icons/UploadIcon';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentApiKey: string;
    currentPrompts: Prompts;
    onSave: (settings: { apiKey: string, newPrompts: Prompts }) => void;
    onClearData: () => void;
    onEnhancePrompt: (prompt: string, systemInstruction: string) => AsyncGenerator<string, void, unknown>;
}

const PromptEditor: React.FC<{
  label: string;
  description: string;
  value: string;
  onChange: (newValue: string) => void;
  onEnhance: () => AsyncGenerator<string, void, unknown>;
}> = ({ label, description, value, onChange, onEnhance }) => {
    const [isEnhancing, setIsEnhancing] = React.useState(false);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const handleEnhanceClick = async () => {
        if (!value.trim() || isEnhancing) return;
        const currentPrompt = value;
        setIsEnhancing(true);
        onChange('');
        try {
            const stream = onEnhance();
            let fullText = '';
            for await (const chunk of stream) {
                fullText += chunk;
                onChange(fullText);
            }
        } catch (e) {
            onChange(currentPrompt);
        } finally {
            setIsEnhancing(false);
        }
    };
    
    const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
    };

    React.useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [value]);


    return (
        <div className="space-y-2">
            <h4 className="font-semibold">{label}</h4>
            <p className="text-sm text-dark-text-secondary">{description}</p>
            <div className="relative">
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={handlePromptChange}
                    rows={5}
                    disabled={isEnhancing}
                    className="block w-full rounded-lg border-dark-border bg-dark-input shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm resize-none px-3 py-2 disabled:opacity-70"
                />
                <button
                    onClick={handleEnhanceClick}
                    disabled={isEnhancing || !value.trim()}
                    className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-dark-surface border border-dark-border rounded-md text-xs text-brand-primary hover:bg-dark-input disabled:opacity-50"
                >
                    <MagicWandIcon className={`w-4 h-4 ${isEnhancing ? 'animate-pulse' : ''}`} />
                    {isEnhancing ? 'Enhancing...' : 'Enhance with AI'}
                </button>
            </div>
        </div>
    )
};


const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, currentApiKey, currentPrompts, onSave, onClearData, onEnhancePrompt }) => {
    const [apiKey, setApiKey] = React.useState(currentApiKey);
    const [prompts, setPrompts] = React.useState(currentPrompts);
    const [isApiKeyVisible, setIsApiKeyVisible] = React.useState(false);
    const [isAdvancedOpen, setIsAdvancedOpen] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    if (!isOpen) return null;
    
    const handleSave = () => {
        onSave({ apiKey, newPrompts: prompts });
        onClose();
    };
    
    const handlePromptChange = (key: keyof Prompts, value: string) => {
        setPrompts(prev => ({ ...prev, [key]: value }));
    };

    const handleDownloadPrompts = () => {
        const jsonString = JSON.stringify(prompts, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'prompts.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleUploadPrompts = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("File is not readable");
                const uploadedPrompts = JSON.parse(text);
                
                // Validate and merge prompts
                const newPrompts = { ...prompts };
                for (const key in uploadedPrompts) {
                    if (key in newPrompts) {
                        newPrompts[key as keyof Prompts] = String(uploadedPrompts[key]);
                    }
                }
                setPrompts(newPrompts);
            } catch (error) {
                console.error("Failed to parse prompts file:", error);
                alert("Invalid JSON file. Please upload a valid prompts file.");
            }
        };
        reader.readAsText(file);
    };

    const promptDefinitions: { key: keyof Prompts; label: string; description: string; }[] = [
        { key: 'removeBackground', label: 'Background Removal', description: 'Instructs the AI on how to perform background removal.' },
        { key: 'analyzeSelection', label: 'Selection Analysis', description: 'System prompt for analyzing a selected image region and suggesting edits.' },
        { key: 'detectProductCategory', label: 'Product Category Detection', description: 'Instructs the AI on how to describe and categorize a product image.' },
        { key: 'generateCreativeOptions', label: 'Creative Options Generation', description: 'System prompt for generating creative ideas for a product photoshoot.' },
        { key: 'generateLifestyle', label: 'Lifestyle Image Generation', description: 'Main prompt for creating a new lifestyle scene. Use {prompt} as a placeholder for the user\'s input.' },
        { key: 'refineLifestyle', label: 'Image Refinement', description: 'Main prompt for refining an existing image. Use {prompt} for the user\'s instruction.' },
        { key: 'generateImageAdPrompt', label: 'Image Ad Prompt Generation', description: 'System prompt to generate a text-to-image prompt from an ad brief.' },
        { key: 'generateAdCopy', label: 'Ad Copy Generation', description: 'System prompt to generate all ad copy and campaign text from a brief.' },
        { key: 'editImageWithMask', label: 'Masked Image Editing', description: 'Instructions for editing only the masked area of an image. Use {prompt} for the user\'s instruction.' },
        { key: 'upscaleImage', label: 'Image Upscaling', description: 'Detailed instructions for the upscaling engine. Uses {factor}, {profile}, etc., as placeholders.' },
        { key: 'enhancePrompt', label: 'Prompt Enhancement', description: 'System prompt that defines how the "Enhance with AI" feature rewrites other prompts.' },
    ];


    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in text-dark-text-primary" onClick={onClose}>
            <div className="bg-dark-surface rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-dark-border flex-shrink-0">
                    <h2 className="text-xl font-bold">Settings</h2>
                    <button onClick={onClose} className="text-dark-text-secondary hover:text-dark-text-primary rounded-full p-1">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    {/* API Key Section */}
                    <div className="space-y-2">
                        <h3 className="font-semibold">Google API Key</h3>
                        <p className="text-sm text-dark-text-secondary">
                            Your key is stored securely in your browser's local storage and is never sent to our servers.
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline ml-1">
                                Get your key here.
                            </a>
                        </p>
                        <div className="flex items-center gap-2">
                            <input
                                type={isApiKeyVisible ? 'text' : 'password'}
                                value={apiKey}
                                onChange={e => setApiKey(e.target.value)}
                                placeholder="Enter your Google API Key"
                                className="flex-1 block w-full rounded-lg border-dark-border bg-dark-input shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm px-3 py-2"
                            />
                            <button onClick={() => setIsApiKeyVisible(!isApiKeyVisible)} className="text-sm font-semibold p-2 rounded-md bg-dark-input hover:bg-dark-border">
                                {isApiKeyVisible ? 'Hide' : 'Show'}
                            </button>
                        </div>
                    </div>
                    
                    {/* Billing Section */}
                    <div className="space-y-2">
                        <h3 className="font-semibold">Billing & Usage</h3>
                        <p className="text-sm text-dark-text-secondary">
                            Manage your API key billing and monitor your usage on the Google Cloud Console.
                        </p>
                        <a href="https://console.cloud.google.com/billing" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-dark-input hover:bg-dark-border border border-dark-border rounded-md text-dark-text-primary">
                            Go to Google Cloud Billing
                            <ExternalLinkIcon className="w-4 h-4" />
                        </a>
                    </div>

                    {/* System Prompt Section */}
                    <PromptEditor
                        label="AI System Prompt"
                        description="Define the AI's main persona and instructions for all new chats."
                        value={prompts.system}
                        onChange={(v) => handlePromptChange('system', v)}
                        onEnhance={() => onEnhancePrompt(prompts.system, prompts.enhancePrompt)}
                     />

                    {/* Prompt Management */}
                    <div className="space-y-2">
                        <h3 className="font-semibold">Prompt Management</h3>
                        <p className="text-sm text-dark-text-secondary">
                           Download a template of all customizable prompts, edit it, and upload it to tailor the AI's behavior to your needs.
                        </p>
                        <div className="flex items-center gap-3">
                            <button onClick={handleDownloadPrompts} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-dark-input hover:bg-dark-border border border-dark-border rounded-md text-dark-text-primary">
                                <DownloadIcon className="w-4 h-4" /> Download Prompts
                            </button>
                            <input type="file" ref={fileInputRef} accept=".json" onChange={handleUploadPrompts} className="hidden" />
                            <button onClick={() => fileInputRef.current?.click()} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-dark-input hover:bg-dark-border border border-dark-border rounded-md text-dark-text-primary">
                                <UploadIcon className="w-4 h-4" /> Upload Prompts
                            </button>
                        </div>
                    </div>
                     
                     {/* Advanced Prompts */}
                     <div className="border border-dark-border rounded-lg">
                        <button onClick={() => setIsAdvancedOpen(!isAdvancedOpen)} className="w-full flex justify-between items-center p-3 font-semibold">
                           <span>Advanced Prompts</span>
                           <ChevronDownIcon className={`w-5 h-5 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isAdvancedOpen && (
                            <div className="p-4 border-t border-dark-border space-y-6">
                                {promptDefinitions.map(def => (
                                     <PromptEditor
                                        key={def.key}
                                        label={def.label}
                                        description={def.description}
                                        value={prompts[def.key]}
                                        onChange={(v) => handlePromptChange(def.key, v)}
                                        onEnhance={() => onEnhancePrompt(prompts[def.key], prompts.enhancePrompt)}
                                     />
                                ))}
                            </div>
                        )}
                     </div>
                    
                    {/* Data Management Section */}
                    <div className="space-y-2 pt-4 border-t border-dark-border">
                        <h3 className="font-semibold text-red-400">Danger Zone</h3>
                         <div className="flex items-center justify-between bg-dark-input p-3 rounded-lg border border-dark-border">
                            <div>
                                <p className="font-medium">Clear All Data</p>
                                <p className="text-sm text-dark-text-secondary">This will permanently delete all your chat sessions and settings.</p>
                            </div>
                            <button onClick={onClearData} className="px-4 py-2 text-sm font-semibold bg-red-600/80 text-white rounded-md hover:bg-red-600 transition-colors">
                                Clear Data
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end items-center p-4 border-t border-dark-border flex-shrink-0 bg-dark-bg/50 rounded-b-xl">
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-dark-input hover:bg-dark-border border border-dark-border rounded-md">
                            Cancel
                        </button>
                        <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold bg-brand-primary text-white rounded-md hover:bg-brand-secondary">
                            Save & Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;

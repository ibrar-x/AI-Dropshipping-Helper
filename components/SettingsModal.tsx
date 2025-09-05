import React, { useState, useRef } from 'react';
import { useAppStore } from '../store';
import { XIcon } from './icons/XIcon';
import { Prompts, ModelConfig, SafetySetting, ModelType, HarmCategory, HarmBlockThreshold } from '../types';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { UploadIcon } from './icons/UploadIcon';

const PREDEFINED_MODELS: Record<ModelType, { value: string; label: string; }[]> = {
    text: [{ value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recommended)' }],
    visual: [{ value: 'imagen-4.0-generate-001', label: 'Imagen 4.0 (Recommended)' }],
    edit: [{ value: 'gemini-2.5-flash-image-preview', label: 'Gemini 2.5 Flash Image Preview (Recommended)' }],
    upscale: [{ value: 'imagen-v002-upscale', label: 'Imagen (v.002) (Recommended)' }],
};

const CollapsibleSection: React.FC<{ title: string; children: React.ReactNode; isOpen: boolean; onToggle: () => void; }> = ({ title, children, isOpen, onToggle }) => (
    <div className="border border-dark-border rounded-lg">
        <button onClick={onToggle} className="w-full flex justify-between items-center p-3 font-semibold">
           <span>{title}</span>
           <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
            <div className="p-4 border-t border-dark-border space-y-6">
                {children}
            </div>
        )}
    </div>
);

const SettingsModal: React.FC = () => {
    const { 
        prompts: currentPrompts,
        modelConfig: currentModelConfig,
        safetySettings: currentSafetySettings,
        customApiKey: currentCustomApiKey,
        closeSettings,
        saveSettings,
        clearData
    } = useAppStore();

    const [prompts, setPrompts] = useState(currentPrompts);
    const [modelConfig, setModelConfig] = useState(currentModelConfig);
    const [safetySettings, setSafetySettings] = useState(currentSafetySettings);
    const [customApiKey, setCustomApiKey] = useState(currentCustomApiKey);
    
    const [openSection, setOpenSection] = useState('api');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSave = () => {
        saveSettings({ 
            newPrompts: prompts, 
            newModelConfig: modelConfig, 
            newSafetySettings: safetySettings,
            newCustomApiKey: customApiKey,
        });
    };
    
    const handleModelChange = (type: ModelType, value: string) => {
        setModelConfig(prev => ({ ...prev, [type]: value }));
    };

    const handleSafetyChange = (category: HarmCategory, threshold: HarmBlockThreshold) => {
        setSafetySettings(prev => prev.map(s => s.category === category ? { ...s, threshold } : s));
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

    const renderModelSelector = (type: ModelType, label: string) => {
        const predefined = PREDEFINED_MODELS[type];
        const currentValue = modelConfig[type];
        const isPredefined = predefined.some(p => p.value === currentValue);

        const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
            const value = e.target.value;
            if (value === 'custom') {
                handleModelChange(type, ''); 
            } else {
                handleModelChange(type, value);
            }
        };

        return (
            <div>
                <label className="font-semibold text-sm">{label}</label>
                <select 
                    value={isPredefined ? currentValue : 'custom'} 
                    onChange={handleSelectChange}
                    className="w-full mt-1 text-sm rounded-lg border-dark-border bg-dark-input p-2"
                >
                    {predefined.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    <option value="custom">Custom...</option>
                </select>
                {!isPredefined && (
                    <input
                        type="text"
                        value={currentValue}
                        onChange={e => handleModelChange(type, e.target.value)}
                        placeholder="Enter custom model ID"
                        className="w-full mt-2 text-sm rounded-lg border-dark-border bg-dark-input p-2"
                        autoFocus
                    />
                )}
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in text-dark-text-primary" onClick={closeSettings}>
            <div className="bg-dark-surface rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-dark-border flex-shrink-0">
                    <h2 className="text-xl font-bold">Settings</h2>
                    <button onClick={closeSettings} className="text-dark-text-secondary hover:text-dark-text-primary rounded-full p-1">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-4">
                     <CollapsibleSection title="API & Billing" isOpen={openSection === 'api'} onToggle={() => setOpenSection(openSection === 'api' ? '' : 'api')}>
                        <div>
                            <label htmlFor="api-key-input" className="font-semibold text-sm">Your Google AI API Key</label>
                            <p className="text-xs text-dark-text-secondary mb-2">Your key is stored securely in your browser's local storage and never sent to our servers.</p>
                            <div className="flex items-center gap-2">
                                <input 
                                    id="api-key-input"
                                    type="password"
                                    value={customApiKey}
                                    onChange={(e) => setCustomApiKey(e.target.value)}
                                    placeholder="Enter your API key here"
                                    className="flex-1 w-full text-sm rounded-lg border-dark-border bg-dark-input p-2"
                                />
                                <button onClick={() => setCustomApiKey('')} className="px-3 py-2 text-xs font-semibold bg-dark-input hover:bg-dark-border border border-dark-border rounded-md">
                                    Clear
                                </button>
                            </div>
                            <p className={`text-xs mt-2 font-semibold ${currentCustomApiKey ? 'text-green-400' : 'text-yellow-400'}`}>
                                Status: Currently using {currentCustomApiKey ? 'your custom API key.' : 'the pre-configured key.'}
                            </p>
                        </div>
                    </CollapsibleSection>

                    <CollapsibleSection title="Model Configuration" isOpen={openSection === 'models'} onToggle={() => setOpenSection(openSection === 'models' ? '' : 'models')}>
                        <p className="text-sm text-dark-text-secondary -mt-2 mb-4">Select which AI models to use for different tasks.</p>
                         <div className="space-y-3">
                            {renderModelSelector('text', 'Text Generation')}
                            {renderModelSelector('visual', 'Visual Generation')}
                            {renderModelSelector('edit', 'Image Editing & Compositing')}
                            {renderModelSelector('upscale', 'Image Upscaling')}
                        </div>
                    </CollapsibleSection>

                    <CollapsibleSection title="Content Safety" isOpen={openSection === 'safety'} onToggle={() => setOpenSection(openSection === 'safety' ? '' : 'safety')}>
                        <p className="text-sm text-dark-text-secondary -mt-2 mb-4">Adjust the block threshold for harmful content. Stricter settings may reduce responses.</p>
                        <div className="space-y-3">
                            {safetySettings.map(setting => (
                                <div key={setting.category}>
                                    <label className="font-semibold text-sm capitalize">{setting.category.replace('HARM_CATEGORY_', '').replace('_', ' ').toLowerCase()}</label>
                                    <select value={setting.threshold} onChange={e => handleSafetyChange(setting.category, e.target.value as HarmBlockThreshold)} className="w-full mt-1 text-sm rounded-lg border-dark-border bg-dark-input p-2">
                                        <option value="BLOCK_NONE">Block None</option>
                                        <option value="BLOCK_ONLY_HIGH">Block High Severity</option>
                                        <option value="BLOCK_LOW_AND_ABOVE">Block Low & Above</option>
                                        <option value="BLOCK_MEDIUM_AND_ABOVE">Block Medium & Above</option>
                                    </select>
                                </div>
                            ))}
                        </div>
                    </CollapsibleSection>

                    <CollapsibleSection title="Prompt Management" isOpen={openSection === 'prompts'} onToggle={() => setOpenSection(openSection === 'prompts' ? '' : 'prompts')}>
                        <p className="text-sm text-dark-text-secondary -mt-2 mb-4">
                           Download a template of all customizable system prompts, edit it, and upload it to tailor the AI's behavior to your needs.
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
                    </CollapsibleSection>
                    
                    <CollapsibleSection title="Danger Zone" isOpen={openSection === 'danger'} onToggle={() => setOpenSection(openSection === 'danger' ? '' : 'danger')}>
                         <div className="flex items-center justify-between bg-dark-input p-3 rounded-lg border border-red-500/30">
                            <div>
                                <p className="font-medium text-red-400">Clear All Data</p>
                                <p className="text-sm text-dark-text-secondary">This will permanently delete your library, folders, and all custom settings (including API key).</p>
                            </div>
                            <button onClick={clearData} className="px-4 py-2 text-sm font-semibold bg-red-600/80 text-white rounded-md hover:bg-red-600 transition-colors">
                                Clear Data
                            </button>
                        </div>
                    </CollapsibleSection>
                </div>

                <div className="flex justify-end items-center p-4 border-t border-dark-border flex-shrink-0 bg-dark-bg/50 rounded-b-xl">
                    <div className="flex gap-3">
                        <button onClick={closeSettings} className="px-4 py-2 text-sm font-semibold bg-dark-input hover:bg-dark-border border border-dark-border rounded-md">
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
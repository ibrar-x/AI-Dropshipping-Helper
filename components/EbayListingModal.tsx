
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { LibraryImage } from '../types';
import { XIcon } from './icons/XIcon';
import { MagicWandIcon } from './icons/MagicWandIcon';
import { generateEbayDescription } from '../services/geminiService';
import { createEbayListing } from '../services/ebayService';

interface EbayListingModalProps {
  image: LibraryImage;
  onClose: () => void;
}

const EbayListingModal: React.FC<EbayListingModalProps> = ({ image, onClose }) => {
    const { addToast } = useAppStore();
    const [title, setTitle] = useState(image.notes || '');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [condition, setCondition] = useState('NEW');
    const [categoryId, setCategoryId] = useState('');

    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
    const [isListing, setIsListing] = useState(false);

    useEffect(() => {
        if (image.prompt) {
            // Attempt to create a sensible default title from the prompt
            const simplePrompt = image.prompt.split(',')[0].replace(/style of/i, '').trim();
            setTitle(simplePrompt.charAt(0).toUpperCase() + simplePrompt.slice(1));
        }
    }, [image]);

    const handleGenerateDescription = async () => {
        if (!title.trim()) {
            addToast({ title: "Title Required", message: "Please enter a product title first.", type: 'error' });
            return;
        }
        setIsGeneratingDesc(true);
        setDescription('');
        try {
            const stream = generateEbayDescription(title, image.tags?.join(', ') || '');
            let fullText = '';
            for await (const chunk of stream) {
                fullText += chunk;
                setDescription(fullText);
            }
        } catch (error) {
            console.error(error);
            addToast({ title: 'Description Failed', message: 'Could not generate description.', type: 'error' });
        } finally {
            setIsGeneratingDesc(false);
        }
    };
    
    const handleList = async () => {
        if (!title || !description || !price || !categoryId || !condition) {
             addToast({ title: "Fields Required", message: "Please fill in all fields before listing.", type: 'error' });
            return;
        }
        setIsListing(true);
        try {
            // This function is stubbed in the service but would make the real API calls.
            await createEbayListing({
                title,
                description,
                price,
                condition,
                categoryId,
                imageUrl: image.src, // In a real app, this would be uploaded to eBay first
            });
            addToast({ title: 'Listing Submitted!', message: `"${title}" is being processed by eBay.`, type: 'success' });
            onClose();
        } catch(err) {
            addToast({ title: 'Listing Failed', message: err instanceof Error ? err.message : 'Could not create listing.', type: 'error' });
        } finally {
            setIsListing(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/80 z-[52] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-dark-surface rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-dark-border flex-shrink-0">
                    <h2 className="text-xl font-bold">Create New eBay Listing</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-dark-input disabled:opacity-50" disabled={isListing}>
                        <XIcon className="w-5 h-5" />
                    </button>
                </header>

                <main className="flex-1 p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <img src={image.thumbnailSrc || image.src} alt="Product to list" className="w-full aspect-square object-cover rounded-lg border border-dark-border" />
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-semibold text-dark-text-secondary mb-1 block">Price (GBP)</label>
                                <input
                                    type="number"
                                    value={price}
                                    onChange={e => setPrice(e.target.value)}
                                    placeholder="e.g., 29.99"
                                    className="w-full text-sm rounded-lg border-dark-border bg-dark-input p-2"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-dark-text-secondary mb-1 block">Condition</label>
                                <select value={condition} onChange={e => setCondition(e.target.value)} className="w-full text-sm rounded-lg border-dark-border bg-dark-input p-2">
                                    <option value="NEW">New</option>
                                    <option value="USED_EXCELLENT">Used - Excellent</option>
                                    <option value="USED_VERY_GOOD">Used - Very Good</option>
                                    <option value="USED_GOOD">Used - Good</option>
                                    <option value="USED_ACCEPTABLE">Used - Acceptable</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4 flex flex-col">
                        <div>
                            <label className="text-sm font-semibold text-dark-text-secondary mb-1 block">Listing Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Enter a descriptive title"
                                className="w-full text-sm rounded-lg border-dark-border bg-dark-input p-2"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-dark-text-secondary mb-1 block">eBay Category ID</label>
                            <input
                                type="text"
                                value={categoryId}
                                onChange={e => setCategoryId(e.target.value)}
                                placeholder="e.g., 175672 for Mugs"
                                className="w-full text-sm rounded-lg border-dark-border bg-dark-input p-2"
                            />
                        </div>
                        <div className="flex flex-col flex-grow">
                             <div className="flex justify-between items-center mb-1">
                                <label className="text-sm font-semibold text-dark-text-secondary">Description</label>
                                <button onClick={handleGenerateDescription} disabled={isGeneratingDesc} className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold bg-dark-input hover:bg-dark-border border border-dark-border rounded-md disabled:opacity-50">
                                    <MagicWandIcon className={`w-3 h-3 ${isGeneratingDesc ? 'animate-pulse' : ''}`}/>
                                    {isGeneratingDesc ? 'Generating...' : 'Generate with AI'}
                                </button>
                            </div>
                             <div className="flex-grow rounded-lg border-dark-border bg-dark-input p-2 overflow-y-auto" style={{ minHeight: '200px' }}>
                                 {isGeneratingDesc && !description ? (
                                    <div className="text-sm text-dark-text-secondary">Generating...</div>
                                 ) : (
                                    <div 
                                        className="prose prose-sm prose-invert max-w-none text-dark-text-secondary [&>h2]:font-bold [&>h2]:text-dark-text-primary [&>h3]:font-semibold [&>h3]:text-dark-text-primary [&>ul]:list-disc [&>ul]:pl-5 [&>p]:my-2"
                                        dangerouslySetInnerHTML={{ __html: description }}
                                    />
                                 )}
                            </div>
                        </div>
                    </div>
                </main>

                <footer className="flex justify-end items-center gap-4 p-4 border-t border-dark-border bg-dark-bg/50 rounded-b-xl">
                    <button onClick={onClose} disabled={isListing} className="px-4 py-2 text-sm font-semibold bg-dark-input hover:bg-dark-border border border-dark-border rounded-md disabled:opacity-50">
                        Cancel
                    </button>
                    <button
                        onClick={handleList}
                        disabled={isListing || isGeneratingDesc}
                        className="px-6 py-2 text-sm font-bold bg-brand-primary text-white rounded-md hover:bg-brand-secondary disabled:bg-gray-600 disabled:cursor-wait"
                    >
                        {isListing ? 'Listing...' : 'List on eBay'}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default EbayListingModal;

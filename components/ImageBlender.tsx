
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GeneratedImage, BlendedImage, ToastInfo } from '../types';
import { blendImages, enhancePromptStream } from '../services/geminiService';
import { createThumbnail } from '../utils/imageUtils';
import { MagicWandIcon } from './icons/MagicWandIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ArrowUpIcon } from './icons/ArrowUpIcon';
import { ArrowDownIcon } from './icons/ArrowDownIcon';

interface ImageBlenderProps {
  images: GeneratedImage[];
  onBlend: (compositeImage: GeneratedImage, resultImage: GeneratedImage, prompt: string) => void;
  onCancel: () => void;
  addToast: (toast: Omit<ToastInfo, 'id'>) => void;
}

const ImageBlender: React.FC<ImageBlenderProps> = ({ images, onBlend, onCancel, addToast }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [blendedObjects, setBlendedObjects] = useState<BlendedImage[]>([]);
    const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [resultImage, setResultImage] = useState<GeneratedImage | null>(null);

    const [dragState, setDragState] = useState<{ objectId: string, startX: number, startY: number, objectStartX: number, objectStartY: number } | null>(null);
    
    // Load initial images onto canvas
    useEffect(() => {
        const loadImages = async () => {
            const objects: BlendedImage[] = await Promise.all(
                images.map((img, index) => new Promise<BlendedImage>((resolve) => {
                    const imageEl = new Image();
                    imageEl.crossOrigin = "anonymous";
                    imageEl.src = img.src;
                    imageEl.onload = () => {
                        const aspectRatio = imageEl.width / imageEl.height;
                        const initialWidth = 200;
                        resolve({
                            id: img.id,
                            image: imageEl,
                            x: 50 + index * 30,
                            y: 50 + index * 30,
                            width: initialWidth,
                            height: initialWidth / aspectRatio,
                            opacity: 1,
                            zIndex: index,
                        });
                    };
                }))
            );
            setBlendedObjects(objects);
        };
        loadImages();
    }, [images]);

    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const sortedObjects = [...blendedObjects].sort((a, b) => a.zIndex - b.zIndex);

        for (const obj of sortedObjects) {
            ctx.globalAlpha = obj.opacity;
            ctx.drawImage(obj.image, obj.x, obj.y, obj.width, obj.height);
        }
        
        ctx.globalAlpha = 1;

        // Draw selection box
        const selectedObject = sortedObjects.find(obj => obj.id === selectedObjectId);
        if (selectedObject) {
            ctx.strokeStyle = '#6d28d9';
            ctx.lineWidth = 2;
            ctx.strokeRect(selectedObject.x, selectedObject.y, selectedObject.width, selectedObject.height);
        }
    }, [blendedObjects, selectedObjectId]);

    useEffect(drawCanvas, [drawCanvas]);
    
    // Canvas resizing
    useEffect(() => {
        const resizeCanvas = () => {
            if (containerRef.current && canvasRef.current) {
                canvasRef.current.width = containerRef.current.clientWidth;
                canvasRef.current.height = containerRef.current.clientHeight;
                drawCanvas();
            }
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, [drawCanvas]);
    
    const getEventCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const source = 'touches' in e ? e.touches[0] : e;
        return { x: source.clientX - rect.left, y: source.clientY - rect.top };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const coords = getEventCoordinates(e);
        // Find clicked object (reverse order for top-most)
        const clickedObject = [...blendedObjects].sort((a, b) => b.zIndex - a.zIndex).find(obj => 
            coords.x >= obj.x && coords.x <= obj.x + obj.width &&
            coords.y >= obj.y && coords.y <= obj.y + obj.height
        );

        if (clickedObject) {
            setSelectedObjectId(clickedObject.id);
            setDragState({
                objectId: clickedObject.id,
                startX: e.clientX,
                startY: e.clientY,
                objectStartX: clickedObject.x,
                objectStartY: clickedObject.y,
            });
        } else {
            setSelectedObjectId(null);
        }
    };
    
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragState) return;
        const deltaX = e.clientX - dragState.startX;
        const deltaY = e.clientY - dragState.startY;
        
        setBlendedObjects(prev => prev.map(obj => 
            obj.id === dragState.objectId
            ? { ...obj, x: dragState.objectStartX + deltaX, y: dragState.objectStartY + deltaY }
            : obj
        ));
    };

    const handleMouseUp = () => {
        setDragState(null);
    };

    const updateSelectedObject = (updates: Partial<BlendedImage>) => {
        if (!selectedObjectId) return;
        setBlendedObjects(prev => prev.map(obj => 
            obj.id === selectedObjectId ? { ...obj, ...updates } : obj
        ));
    };
    
    const deleteSelectedObject = () => {
        if (!selectedObjectId) return;
        setBlendedObjects(prev => prev.filter(obj => obj.id !== selectedObjectId));
        setSelectedObjectId(null);
    };
    
    const changeZIndex = (direction: 'up' | 'down') => {
        if (!selectedObjectId) return;
        setBlendedObjects(prev => {
            const maxZ = Math.max(...prev.map(o => o.zIndex));
            return prev.map(obj => {
                if (obj.id === selectedObjectId) {
                    const newZ = direction === 'up' ? obj.zIndex + 1 : obj.zIndex - 1;
                    return { ...obj, zIndex: Math.min(newZ, maxZ + 1) };
                }
                return obj;
            });
        });
    };
    
    const handleEnhancePrompt = async () => {
        if (!prompt.trim() || isEnhancing) return;
        const currentPrompt = prompt;
        const systemInstruction = "You are a creative assistant that expands upon user prompts for an AI image generator. Rewrite the following prompt to be more descriptive, vivid, and detailed, focusing on creating a photorealistic, high-quality blended image. Only return the enhanced prompt text, without any preamble.";
        setIsEnhancing(true);
        setPrompt('');
        try {
            const stream = enhancePromptStream(currentPrompt, systemInstruction);
            let fullText = '';
            for await (const chunk of stream) {
                fullText += chunk;
                setPrompt(fullText);
            }
        } catch(e) {
            setPrompt(currentPrompt);
            addToast({ title: 'Enhancement Failed', message: 'Could not enhance prompt.', type: 'error' });
        } finally {
            setIsEnhancing(false);
        }
    };

    const handleAddBlendingCommand = () => {
        const blendingCommand = " CRITICAL COMMAND: You MUST perfectly blend all elements from the reference image into a new, single, cohesive scene. Do not alter, redraw, or change the subjects.";
        if (prompt.trim() && !prompt.trim().endsWith(blendingCommand.trim())) {
            setPrompt(p => p.trim() + blendingCommand);
        }
        addToast({ title: 'Blending Command Added', message: 'A special instruction has been added to your prompt.', type: 'success' });
    };

    const handleBlend = async () => {
        if (!prompt.trim()) {
            addToast({ title: 'Prompt Missing', message: 'Please describe what you want to create.', type: 'error' });
            return;
        }
        setIsProcessing(true);
        setSelectedObjectId(null); // Deselect to remove selection box from final image
        
        // Timeout to allow canvas to redraw without selection box before capturing
        setTimeout(async () => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const compositeDataUrl = canvas.toDataURL('image/png');
            try {
                const result = await blendImages(compositeDataUrl, prompt);
                setResultImage(result);
                
                const compositeThumbnail = await createThumbnail(compositeDataUrl, 256, 256);
                const compositeImage: GeneratedImage = { id: `composite_${Date.now()}`, src: compositeDataUrl, thumbnailSrc: compositeThumbnail };
                
                onBlend(compositeImage, result, prompt);
                
            } catch (err) {
                console.error(err);
                addToast({ title: 'Blend Failed', message: err instanceof Error ? err.message : 'Unknown error.', type: 'error' });
            } finally {
                setIsProcessing(false);
            }
        }, 100);
    };
    
    const selectedObject = blendedObjects.find(o => o.id === selectedObjectId);

    return (
      <div className="flex-1 flex flex-col md:flex-row h-full overflow-y-auto md:overflow-hidden">
        <main ref={containerRef} className="flex-1 bg-dark-bg relative">
            <canvas 
                ref={canvasRef} 
                className="w-full h-full"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            />
             {isProcessing && (
                <div className="absolute inset-0 bg-dark-bg/70 flex flex-col items-center justify-center z-20">
                    <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-3 text-md font-semibold">Blending your masterpiece...</p>
                </div>
            )}
        </main>
        <aside className="w-full md:w-80 border-t md:border-t-0 md:border-l border-dark-border flex flex-col bg-dark-surface">
            <fieldset disabled={isProcessing || isEnhancing} className="p-4 flex-grow overflow-y-auto space-y-4">
                <h3 className="text-xl font-bold">Blender Controls</h3>
                {selectedObject ? (
                    <div className="bg-dark-input p-3 rounded-lg border border-dark-border space-y-3 animate-fade-in">
                        <h4 className="font-semibold text-sm">Selected Image</h4>
                        <div>
                            <label className="block text-xs font-medium text-dark-text-secondary mb-1">Opacity: {Math.round(selectedObject.opacity * 100)}%</label>
                            <input type="range" min="0" max="1" step="0.05" value={selectedObject.opacity} onChange={(e) => updateSelectedObject({ opacity: parseFloat(e.target.value) })} className="w-full h-2 bg-dark-border rounded-lg appearance-none cursor-pointer accent-brand-primary" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-dark-text-secondary mb-1">Scale: {Math.round(selectedObject.width)}px</label>
                             <input type="range" min="50" max="1000" step="1" value={selectedObject.width} onChange={(e) => {
                                 const newWidth = parseFloat(e.target.value);
                                 const aspectRatio = selectedObject.image.width / selectedObject.image.height;
                                 updateSelectedObject({ width: newWidth, height: newWidth / aspectRatio });
                            }} className="w-full h-2 bg-dark-border rounded-lg appearance-none cursor-pointer accent-brand-primary" />
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                             <button onClick={() => changeZIndex('down')} title="Send Backward" className="p-2 bg-dark-surface rounded-md hover:bg-dark-border"><ArrowDownIcon className="w-5 h-5"/></button>
                             <button onClick={() => changeZIndex('up')} title="Bring Forward" className="p-2 bg-dark-surface rounded-md hover:bg-dark-border"><ArrowUpIcon className="w-5 h-5"/></button>
                             <div className="flex-1"></div>
                             <button onClick={deleteSelectedObject} className="p-2 bg-red-500/20 text-red-400 rounded-md hover:bg-red-500/40"><TrashIcon className="w-5 h-5"/></button>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-dark-text-secondary p-3 bg-dark-input rounded-lg border border-dark-border">Click an image on the canvas to select and edit it.</p>
                )}
                 <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the final image you want to create..." rows={4} className="block w-full rounded-lg border-dark-border bg-dark-input shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm px-3 py-2" />
                 <div className="flex items-center gap-2">
                    <button onClick={handleEnhancePrompt} disabled={isEnhancing} className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold bg-dark-input hover:bg-dark-border border border-dark-border px-4 py-2 rounded-md">
                        <MagicWandIcon className={`w-4 h-4 ${isEnhancing ? 'animate-pulse' : ''}`} />
                        {isEnhancing ? 'Enhancing...' : 'Enhance Prompt'}
                    </button>
                    <button onClick={handleAddBlendingCommand} className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold bg-dark-input hover:bg-dark-border border border-dark-border px-4 py-2 rounded-md text-brand-secondary">
                        <MagicWandIcon className="w-4 h-4" />
                        Add Blend Cmd
                    </button>
                 </div>
            </fieldset>
            <div className="p-4 border-t border-dark-border bg-dark-surface/50 flex items-center gap-2 flex-shrink-0">
                <button onClick={onCancel} disabled={isProcessing || isEnhancing} className="text-sm font-semibold bg-dark-input hover:bg-dark-border border border-dark-border px-4 py-3 rounded-md disabled:opacity-50">Cancel</button>
                <button onClick={handleBlend} disabled={isProcessing || isEnhancing} className="flex-1 flex items-center justify-center gap-2 w-full bg-brand-primary hover:bg-brand-secondary text-white font-bold px-4 py-3 rounded-md disabled:opacity-50">
                    <MagicWandIcon className="w-5 h-5" />
                    {isProcessing ? 'Processing...' : 'Blend'}
                </button>
            </div>
        </aside>
      </div>
    );
};

export default ImageBlender;

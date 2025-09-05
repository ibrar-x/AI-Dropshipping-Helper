import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Transformer } from 'react-konva';
import { GeneratedImage, BlendedImage, ToastInfo, ExportBundle } from '../types';
import { generateSurpriseImage } from '../services/geminiService';
// FIX: Imported the missing downloadImage utility.
import { createExportBundle, createThumbnail, downloadImage } from '../../utils/imageUtils';
import { MagicWandIcon } from './icons/MagicWandIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ArrowUpIcon } from './icons/ArrowUpIcon';
import { ArrowDownIcon } from './icons/ArrowDownIcon';
import { XIcon } from './icons/XIcon';
import { RefreshIcon } from './icons/RefreshIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { SliderIcon } from './icons/SliderIcon';
import { LockIcon } from './icons/LockIcon';
import { UnlockIcon } from './icons/UnlockIcon';


interface ImageBlenderProps {
  images: GeneratedImage[];
  onBlend: (compositeImage: GeneratedImage, resultImage: GeneratedImage, prompt: string, bundle: ExportBundle, seed: number) => void;
  onCancel: () => void;
  addToast: (toast: Omit<ToastInfo, 'id'>) => void;
}

const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 900;

const BlenderLayer: React.FC<{
    shapeProps: any;
    isSelected: boolean;
    onSelect: () => void;
    onChange: (newAttrs: any) => void;
}> = ({ shapeProps, isSelected, onSelect, onChange }) => {
    const shapeRef = React.useRef<any>();
    const trRef = React.useRef<any>();

    useEffect(() => {
        if (isSelected && trRef.current) {
            trRef.current.nodes([shapeRef.current]);
            trRef.current.getLayer().batchDraw();
        }
    }, [isSelected]);

    return (
        <>
            <KonvaImage
                onClick={onSelect}
                onTap={onSelect}
                ref={shapeRef}
                {...shapeProps}
                draggable
                onDragEnd={(e) => {
                    onChange({ ...shapeProps, x: e.target.x(), y: e.target.y() });
                }}
                onTransformEnd={(e) => {
                    const node = e.target;
                    // FIX: Use getAttr to work around faulty Konva type definitions for scale getters.
                    const scaleX = node.getAttr('scaleX');
                    const scaleY = node.getAttr('scaleY');
                    node.scaleX(1);
                    node.scaleY(1);
                    onChange({
                        ...shapeProps,
                        x: node.x(),
                        y: node.y(),
                        width: Math.max(5, shapeProps.width * scaleX),
                        height: Math.max(5, shapeProps.height * scaleY),
                        rotation: node.rotation(),
                    });
                }}
            />
            {isSelected && (
                <Transformer
                    ref={trRef}
                    boundBoxFunc={(oldBox, newBox) => {
                        if (newBox.width < 5 || newBox.height < 5) {
                            return oldBox;
                        }
                        return newBox;
                    }}
                />
            )}
        </>
    );
};


const BlenderSidebar: React.FC<{
    layers: BlendedImage[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onUpdate: (id: string, updates: Partial<BlendedImage>) => void;
    onDelete: (id: string) => void;
    onReorder: (id: string, direction: 'up' | 'down') => void;
}> = ({ layers, selectedId, onSelect, onUpdate, onDelete, onReorder }) => {

    const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);

    return (
        <div className="p-4 flex-grow overflow-y-auto space-y-2">
            <h3 className="text-lg font-bold">Layers</h3>
            {sortedLayers.map(layer => (
                <div key={layer.id} onClick={() => onSelect(layer.id)}
                    className={`p-2 rounded-lg border-2 cursor-pointer ${selectedId === layer.id ? 'bg-dark-input border-brand-primary' : 'bg-dark-surface border-dark-border hover:border-dark-text-secondary'}`}>
                    <div className="flex items-center gap-3">
                        <img src={layer.image.src} className="w-10 h-10 rounded-md object-cover bg-dark-bg"/>
                        <input
                            type="text"
                            value={layer.name}
                            onChange={(e) => onUpdate(layer.id, { name: e.target.value })}
                            className="flex-1 bg-transparent text-sm font-semibold focus:outline-none focus:bg-dark-input/50 rounded p-1"
                        />
                         <div className="flex items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); onReorder(layer.id, 'up') }} className="p-1 hover:bg-dark-border rounded-md"><ArrowUpIcon className="w-4 h-4" /></button>
                            <button onClick={(e) => { e.stopPropagation(); onReorder(layer.id, 'down') }} className="p-1 hover:bg-dark-border rounded-md"><ArrowDownIcon className="w-4 h-4" /></button>
                            <button onClick={(e) => { e.stopPropagation(); onDelete(layer.id) }} className="p-1 text-red-400 hover:bg-red-500/20 rounded-md"><TrashIcon className="w-4 h-4" /></button>
                        </div>
                    </div>
                     {selectedId === layer.id && (
                        <div className="mt-2 space-y-2">
                            <label className="block text-xs font-medium text-dark-text-secondary">Opacity: {Math.round(layer.opacity * 100)}%</label>
                            <input type="range" min="0" max="1" step="0.05" value={layer.opacity} onChange={(e) => onUpdate(layer.id, { opacity: parseFloat(e.target.value) })} className="w-full h-2 bg-dark-border rounded-lg appearance-none cursor-pointer accent-brand-primary" />
                        </div>
                     )}
                </div>
            ))}
        </div>
    );
};


const ImageBlender: React.FC<ImageBlenderProps> = ({ images, onBlend, onCancel, addToast }) => {
    const stageRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [blendedObjects, setBlendedObjects] = useState<BlendedImage[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [styleHint, setStyleHint] = useState('');
    
    const [stageState, setStageState] = useState<{scale: number, x: number, y: number}>({scale: 1, x: 0, y: 0});
    
    // Result State
    const [step, setStep] = useState<'SETUP' | 'PROCESSING' | 'RESULT'>('SETUP');
    const [processingMessage, setProcessingMessage] = useState('');
    const [resultData, setResultData] = useState<{
        compositeImage: GeneratedImage;
        generatedImage: GeneratedImage;
        bundle: ExportBundle;
        prompt: string;
        seed: number;
    } | null>(null);
    const [isSeedLocked, setIsSeedLocked] = useState(false);
    const [currentSeed, setCurrentSeed] = useState<number>(0);
    const [sliderPosition, setSliderPosition] = useState(50);
    
    // Load initial images
    useEffect(() => {
        const loadImages = async () => {
            const objects: BlendedImage[] = await Promise.all(
                images.map((img, index) => new Promise<BlendedImage>((resolve, reject) => {
                    const imageEl = new Image();
                    imageEl.crossOrigin = "anonymous";
                    imageEl.src = img.src;
                    imageEl.onload = () => {
                        const aspectRatio = imageEl.width / imageEl.height;
                        const initialWidth = CANVAS_WIDTH / 5;
                        resolve({
                            id: img.id,
                            name: `Layer ${index + 1}`,
                            image: imageEl,
                            x: 50 + index * 40,
                            y: 50 + index * 40,
                            scale: 1,
                            rotation: 0,
                            opacity: 1,
                            zIndex: index,
                            width: initialWidth,
                            height: initialWidth / aspectRatio
                        });
                    };
                    imageEl.onerror = reject;
                }))
            );
            setBlendedObjects(objects);
            if(objects.length > 0) setSelectedId(objects[objects.length -1].id);
        };
        loadImages().catch(err => addToast({title: 'Image Load Error', message: 'Could not load one or more images.', type: 'error'}));
    }, [images, addToast]);
    
    const fitStageToContainer = useCallback(() => {
        if (!containerRef.current || !stageRef.current) return;
        const containerWidth = containerRef.current.offsetWidth;
        const containerHeight = containerRef.current.offsetHeight;
        const scale = Math.min(containerWidth / CANVAS_WIDTH, containerHeight / CANVAS_HEIGHT);
        setStageState({
            scale,
            x: (containerWidth - CANVAS_WIDTH * scale) / 2,
            y: (containerHeight - CANVAS_HEIGHT * scale) / 2,
        });
    }, []);

    useEffect(() => {
        fitStageToContainer();
        window.addEventListener('resize', fitStageToContainer);
        return () => window.removeEventListener('resize', fitStageToContainer);
    }, [fitStageToContainer]);

    const handleUpdateLayer = (id: string, updates: Partial<BlendedImage>) => {
        setBlendedObjects(prev => prev.map(obj => obj.id === id ? { ...obj, ...updates } : obj));
    };

    const handleDeleteLayer = (id: string) => {
        setBlendedObjects(prev => prev.filter(obj => obj.id !== id));
        if (selectedId === id) setSelectedId(null);
    };

    const handleReorderLayer = (id: string, direction: 'up' | 'down') => {
        setBlendedObjects(prev => {
            const layers = [...prev].sort((a,b) => a.zIndex - b.zIndex);
            const currentIndex = layers.findIndex(l => l.id === id);
            if (currentIndex === -1) return prev;
            
            if (direction === 'up' && currentIndex < layers.length - 1) {
                [layers[currentIndex].zIndex, layers[currentIndex + 1].zIndex] = [layers[currentIndex + 1].zIndex, layers[currentIndex].zIndex];
            } else if (direction === 'down' && currentIndex > 0) {
                 [layers[currentIndex].zIndex, layers[currentIndex - 1].zIndex] = [layers[currentIndex - 1].zIndex, layers[currentIndex].zIndex];
            }
            return prev.map(originalLayer => layers.find(l => l.id === originalLayer.id) || originalLayer);
        });
    };

    const handleCreateSurprise = async () => {
        if (blendedObjects.length === 0) {
            addToast({ title: 'No Images', message: 'Please add images to the canvas first.', type: 'error' });
            return;
        }
        
        setProcessingMessage('Preparing assets...');
        setStep('PROCESSING');
        setSelectedId(null);

        setTimeout(async () => {
            if (!stageRef.current) return;
            try {
                const bundle = await createExportBundle(stageRef.current, blendedObjects, CANVAS_WIDTH, CANVAS_HEIGHT);
                const compositeThumbnail = await createThumbnail(bundle.compositePng, 256, 256);
                const compositeImage: GeneratedImage = { id: `composite_${Date.now()}`, src: bundle.compositePng, thumbnailSrc: compositeThumbnail };
                
                setProcessingMessage('Generating surprise image...');
                const seedToUse = isSeedLocked ? currentSeed : undefined;
                const result = await generateSurpriseImage(bundle, styleHint, seedToUse);

                setResultData({
                    compositeImage,
                    generatedImage: result.image,
                    bundle,
                    prompt: styleHint,
                    seed: result.seed
                });
                setCurrentSeed(result.seed);
                setStep('RESULT');

            } catch (err) {
                console.error(err);
                addToast({ title: 'Blend Failed', message: err instanceof Error ? err.message : 'Unknown error.', type: 'error' });
                setStep('SETUP');
            }
        }, 100);
    };

    const handleDownloadResult = () => {
        if (resultData) {
            downloadImage(resultData.generatedImage.src, `surprise-${resultData.seed}`);
        }
    };
    
    if (step === 'RESULT' && resultData) {
        return (
             <div className="flex-1 flex flex-col md:flex-row h-full overflow-y-auto md:overflow-hidden">
                <main ref={containerRef} className="flex-1 bg-dark-bg relative flex items-center justify-center p-4">
                     <div className="relative select-none max-w-full max-h-full aspect-video" onMouseMove={(e) => setSliderPosition((e.clientX - e.currentTarget.getBoundingClientRect().left) / e.currentTarget.offsetWidth * 100)}>
                        <img src={resultData.compositeImage.src} alt="Original Composite" className="absolute inset-0 w-full h-full object-contain pointer-events-none"/>
                        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}>
                           <img src={resultData.generatedImage.src} alt="Generated Surprise" className="absolute inset-0 w-full h-full object-contain" />
                        </div>
                        <div className="absolute inset-y-0 w-1 bg-white/80" style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)', cursor: 'ew-resize' }}>
                            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white rounded-full p-1 shadow-lg text-dark-bg cursor-ew-resize"><SliderIcon className="w-6 h-6" /></div>
                        </div>
                    </div>
                </main>
                 <aside className="w-full md:w-80 border-t md:border-t-0 md:border-l border-dark-border flex flex-col bg-dark-surface">
                     <div className="p-4 flex-grow overflow-y-auto space-y-4">
                        <h3 className="text-xl font-bold">Surprise Result</h3>
                        <p className="text-sm text-dark-text-secondary">Use the slider to compare. Re-roll with the same seed for deterministic changes or unlock for a new surprise.</p>
                        <div>
                            <label className="text-sm font-semibold block mb-1">Style Hint</label>
                            <input type="text" value={styleHint} onChange={e => setStyleHint(e.target.value)} className="w-full text-sm rounded-lg border-dark-border bg-dark-input p-2" placeholder="e.g., cinematic, golden hour"/>
                        </div>
                         <div>
                            <label className="text-sm font-semibold block mb-1">Seed</label>
                            <div className="flex items-center gap-2">
                                <input type="number" value={currentSeed} onChange={e => setCurrentSeed(parseInt(e.target.value, 10) || 0)} className="flex-1 w-full text-sm rounded-lg border-dark-border bg-dark-input p-2" disabled={isSeedLocked}/>
                                <button onClick={() => setIsSeedLocked(!isSeedLocked)} className="p-2 bg-dark-input rounded-md hover:bg-dark-border">{isSeedLocked ? <LockIcon className="w-5 h-5 text-brand-primary"/> : <UnlockIcon className="w-5 h-5"/>}</button>
                            </div>
                        </div>
                        <button onClick={handleCreateSurprise} className="w-full flex items-center justify-center gap-2 bg-dark-input hover:bg-dark-border border border-dark-border px-4 py-2 rounded-md font-semibold">
                            <RefreshIcon className="w-5 h-5"/> Re-roll
                        </button>
                    </div>
                    <div className="p-4 border-t border-dark-border bg-dark-surface/50 flex flex-col gap-2 flex-shrink-0">
                        <button onClick={() => onBlend(resultData.compositeImage, resultData.generatedImage, styleHint, resultData.bundle, resultData.seed)} className="w-full bg-brand-primary hover:bg-brand-secondary text-white font-bold px-4 py-2.5 rounded-md">
                            Accept & Save to Library
                        </button>
                         <div className="flex items-center gap-2">
                            <button onClick={onCancel} className="text-sm font-semibold bg-dark-input hover:bg-dark-border border border-dark-border px-4 py-2.5 rounded-md">Cancel</button>
                            <button onClick={handleDownloadResult} className="flex-1 flex items-center justify-center gap-2 bg-dark-input hover:bg-dark-border border border-dark-border px-4 py-2.5 rounded-md">
                                <DownloadIcon className="w-5 h-5"/> Download
                            </button>
                        </div>
                    </div>
                </aside>
            </div>
        );
    }


    return (
      <div className="flex-1 flex flex-col md:flex-row h-full overflow-y-auto md:overflow-hidden">
        <main ref={containerRef} className="flex-1 bg-dark-bg relative" onMouseDown={(e) => {
            if(e.target === e.currentTarget.querySelector('canvas')) setSelectedId(null);
        }}>
            {step === 'PROCESSING' && (
                <div className="absolute inset-0 bg-dark-bg/80 flex flex-col items-center justify-center z-20">
                    <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-3 text-md font-semibold">{processingMessage}</p>
                </div>
            )}
            <Stage
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                ref={stageRef}
                className="absolute"
                style={{ top: stageState.y, left: stageState.x, transform: `scale(${stageState.scale})`, transformOrigin: 'top left' }}
            >
                <Layer>
                    {blendedObjects.sort((a,b) => a.zIndex - b.zIndex).map(obj => (
                        <BlenderLayer
                            key={obj.id}
                            shapeProps={{
                                x: obj.x,
                                y: obj.y,
                                width: obj.width,
                                height: obj.height,
                                rotation: obj.rotation,
                                opacity: obj.opacity,
                                image: obj.image
                            }}
                            isSelected={obj.id === selectedId}
                            onSelect={() => setSelectedId(obj.id)}
                            onChange={(newAttrs) => {
                                const newObjs = blendedObjects.slice();
                                const index = newObjs.findIndex(o => o.id === obj.id);
                                newObjs[index] = { ...newObjs[index], ...newAttrs };
                                setBlendedObjects(newObjs);
                            }}
                        />
                    ))}
                </Layer>
            </Stage>
        </main>
        <aside className="w-full md:w-80 border-t md:border-t-0 md:border-l border-dark-border flex flex-col bg-dark-surface">
            <BlenderSidebar 
                layers={blendedObjects}
                selectedId={selectedId}
                onSelect={(id) => setSelectedId(id)}
                onUpdate={handleUpdateLayer}
                onDelete={handleDeleteLayer}
                onReorder={handleReorderLayer}
            />
            <fieldset disabled={step === 'PROCESSING'} className="p-4 border-t border-dark-border space-y-3">
                 <textarea value={styleHint} onChange={(e) => setStyleHint(e.target.value)} placeholder="Add a style hint (e.g., cinematic, golden hour)" rows={3} className="block w-full rounded-lg border-dark-border bg-dark-input shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm px-3 py-2" />
            </fieldset>
            <div className="p-4 border-t border-dark-border bg-dark-surface/50 flex items-center gap-2 flex-shrink-0">
                <button onClick={onCancel} disabled={step === 'PROCESSING'} className="text-sm font-semibold bg-dark-input hover:bg-dark-border border border-dark-border px-4 py-3 rounded-md disabled:opacity-50">Cancel</button>
                <button onClick={handleCreateSurprise} disabled={step === 'PROCESSING'} className="flex-1 flex items-center justify-center gap-2 w-full bg-brand-primary hover:bg-brand-secondary text-white font-bold px-4 py-3 rounded-md disabled:opacity-50">
                    <MagicWandIcon className="w-5 h-5" />
                    {step === 'PROCESSING' ? 'Processing...' : 'Create Surprise'}
                </button>
            </div>
        </aside>
      </div>
    );
};

export default ImageBlender;

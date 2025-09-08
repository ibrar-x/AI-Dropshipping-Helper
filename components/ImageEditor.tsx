
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { GeneratedImage, EditLayer, SelectionAnalysis } from '../types';
import { analyzeSelection, editImageWithMask } from '../services/geminiService';
import { createHighlightImage } from '../utils/imageUtils';
import { useAppStore } from '../store';
import { BrushIcon } from './icons/BrushIcon';
import { LassoIcon } from './icons/LassoIcon';
import { RectIcon } from './icons/RectIcon';
import { UndoIcon } from './icons/UndoIcon';
import { RedoIcon } from './icons/RedoIcon';
import { EyeIcon } from './icons/EyeIcon';
import { EyeOffIcon } from './icons/EyeOffIcon';
import { TrashIcon } from './icons/TrashIcon';
import { XIcon } from './icons/XIcon';
import { SliderIcon } from './icons/SliderIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { PlusIcon } from './icons/PlusIcon';
import { PhotoIcon } from './icons/PhotoIcon';

interface ImageEditorProps {
  image: GeneratedImage;
  onSave: (finalImageDataUrl: string) => void;
  onCancel: () => void;
}

type Tool = 'brush' | 'lasso' | 'rect';

const ImageEditor: React.FC<ImageEditorProps> = ({ image, onSave, onCancel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const layersCanvasRef = useRef<HTMLCanvasElement>(null);
  const selectionCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const uiCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [history, setHistory] = useState<EditLayer[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const layers = history[historyIndex];

  const [activeTool, setActiveTool] = useState<Tool>('brush');
  const [brushSize, setBrushSize] = useState(40);
  const [feather, setFeather] = useState(10);
  const [prompt, setPrompt] = useState('');
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [lassoPoints, setLassoPoints] = useState<{x: number, y: number}[]>([]);
  const [rectStart, setRectStart] = useState<{x: number, y: number} | null>(null);

  const [previewLayer, setPreviewLayer] = useState<EditLayer | null>(null);
  const [compareSlider, setCompareSlider] = useState(50);
  const [isSliderDragging, setIsSliderDragging] = useState(false);
  
  const [analysis, setAnalysis] = useState<SelectionAnalysis | null>(null);
  const [isLayersOpen, setIsLayersOpen] = useState(false);

  const scaleRef = useRef(1);
  const openLibrarySelector = useAppStore(state => state.openLibrarySelector);

  const referenceImageUrls = useMemo(() => referenceImages.map(file => URL.createObjectURL(file)), [referenceImages]);

  useEffect(() => {
    return () => {
        referenceImageUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [referenceImageUrls]);
  
  const updateHistory = (newLayers: EditLayer[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newLayers);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };
  const setLayers = (newLayers: EditLayer[]) => updateHistory(newLayers);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) setHistoryIndex(prev => prev - 1);
  }, [historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) setHistoryIndex(prev => prev + 1);
  }, [historyIndex, history.length]);
  
  const redrawAll = useCallback(() => {
    const canvases = [baseCanvasRef.current, layersCanvasRef.current, selectionCanvasRef.current, previewCanvasRef.current, uiCanvasRef.current];
    if (canvases.some(c => !c)) return;

    const baseCtx = baseCanvasRef.current!.getContext('2d')!;
    const layersCtx = layersCanvasRef.current!.getContext('2d')!;
    const previewCtx = previewCanvasRef.current!.getContext('2d')!;
    
    previewCtx.clearRect(0, 0, previewCtx.canvas.width, previewCtx.canvas.height);
    
    layersCtx.clearRect(0, 0, layersCtx.canvas.width, layersCtx.canvas.height);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = image.src;
    img.onload = () => {
        const container = containerRef.current!;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const imgAspectRatio = img.width / img.height;
        const containerAspectRatio = containerWidth / containerHeight;
        
        let canvasWidth, canvasHeight;
        if (imgAspectRatio > containerAspectRatio) {
            canvasWidth = containerWidth;
            canvasHeight = containerWidth / imgAspectRatio;
        } else {
            canvasHeight = containerHeight;
            canvasWidth = containerHeight * imgAspectRatio;
        }

        scaleRef.current = img.width / canvasWidth;

        canvases.forEach(canvas => {
            if (canvas) {
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;
            }
        });

        baseCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        baseCtx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
        
        // Redraw layers
        const visibleLayers = layers.filter(l => l.isVisible);
        Promise.all(visibleLayers.map(layer => {
            return new Promise<HTMLImageElement>(resolve => {
                const layerImg = new Image();
                layerImg.src = layer.imageDataUrl;
                layerImg.onload = () => resolve(layerImg);
            });
        })).then(loadedImages => {
            layersCtx.clearRect(0, 0, layersCtx.canvas.width, layersCtx.canvas.height);
            loadedImages.forEach((layerImg, index) => {
                const layer = visibleLayers[index];
                layersCtx.globalAlpha = layer.opacity;
                layersCtx.drawImage(layerImg, 0, 0, layersCtx.canvas.width, layersCtx.canvas.height);
            });
            layersCtx.globalAlpha = 1.0;
        });

        // Redraw preview if it exists
        if (previewLayer) {
            const previewImg = new Image();
            previewImg.src = previewLayer.imageDataUrl;
            previewImg.onload = () => {
                previewCtx.globalAlpha = previewLayer.opacity;
                previewCtx.drawImage(previewImg, 0, 0, previewCtx.canvas.width, previewCtx.canvas.height);
                previewCtx.globalAlpha = 1.0;
            };
        }
    };
  }, [image.src, layers, previewLayer]);

  useEffect(() => {
    redrawAll();
    const handleResize = () => redrawAll();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redrawAll]);
  
   useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
            e.preventDefault();
            if (e.shiftKey) handleRedo(); else handleUndo();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const getEventCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = uiCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const source = 'touches' in e ? e.touches[0] : e;
    return { x: source.clientX - rect.left, y: source.clientY - rect.top };
  };
  
  const clearSelectionCanvas = useCallback(() => {
    const ctx = selectionCanvasRef.current?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    setAnalysis(null);
  }, []);
  
  const startDrawing = (coords: { x: number; y: number }) => {
    setIsDrawing(true);
    setAnalysis(null);
    const selCtx = selectionCanvasRef.current?.getContext('2d')!;
    
    if (activeTool === 'brush') {
        selCtx.beginPath();
        selCtx.moveTo(coords.x, coords.y);
    } else if (activeTool === 'lasso') {
        clearSelectionCanvas();
        setLassoPoints([coords]);
    } else if (activeTool === 'rect') {
        clearSelectionCanvas();
        setRectStart(coords);
    }
  };

  const draw = (coords: { x: number; y: number }) => {
    if (!isDrawing) return;
    const selCtx = selectionCanvasRef.current?.getContext('2d')!;
    
    if (activeTool === 'brush') {
        selCtx.lineWidth = brushSize;
        selCtx.lineCap = 'round';
        selCtx.strokeStyle = 'white';
        selCtx.lineTo(coords.x, coords.y);
        selCtx.stroke();
    } else if (activeTool === 'lasso' && lassoPoints.length > 0) {
        const tempPoints = [...lassoPoints, coords];
        const uiCtx = uiCanvasRef.current!.getContext('2d')!;
        uiCtx.clearRect(0, 0, uiCtx.canvas.width, uiCtx.canvas.height);
        uiCtx.beginPath();
        uiCtx.moveTo(tempPoints[0].x, tempPoints[0].y);
        tempPoints.forEach(p => uiCtx.lineTo(p.x, p.y));
        uiCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        uiCtx.stroke();
        setLassoPoints(tempPoints);
    } else if (activeTool === 'rect' && rectStart) {
        clearSelectionCanvas();
        selCtx.fillStyle = 'white';
        selCtx.fillRect(rectStart.x, rectStart.y, coords.x - rectStart.x, coords.y - rectStart.y);
    }
  };

  const endDrawing = () => {
    setIsDrawing(false);
    const selCtx = selectionCanvasRef.current?.getContext('2d')!;
    if (activeTool === 'lasso' && lassoPoints.length > 2) {
        selCtx.beginPath();
        selCtx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
        lassoPoints.forEach(p => selCtx.lineTo(p.x, p.y));
        selCtx.closePath();
        selCtx.fillStyle = 'white';
        selCtx.fill();
        setLassoPoints([]);
        uiCanvasRef.current?.getContext('2d')?.clearRect(0,0,10000,10000);
    }
    if(activeTool === 'rect') {
        setRectStart(null);
    }
  };
  
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    startDrawing(getEventCoordinates(e));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getEventCoordinates(e);
    const uiCtx = uiCanvasRef.current?.getContext('2d');
    if (uiCtx && activeTool === 'brush') { // Draw brush cursor
        uiCtx.clearRect(0, 0, uiCtx.canvas.width, uiCtx.canvas.height);
        uiCtx.beginPath();
        uiCtx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2);
        uiCtx.strokeStyle = 'white';
        uiCtx.stroke();
    }
    draw(coords);
  };

  const handleMouseUp = () => {
    endDrawing();
  };
  
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 1) return;
    e.preventDefault();
    startDrawing(getEventCoordinates(e));
  };
  
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || e.touches.length > 1) return;
    e.preventDefault();
    draw(getEventCoordinates(e));
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    endDrawing();
  };

  const createFullResMask = async (sourceCanvas: HTMLCanvasElement, featherAmount: number): Promise<string> => {
      const baseImg = await new Promise<HTMLImageElement>(resolve => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = image.src;
          img.onload = () => resolve(img);
      });

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = baseImg.width;
      tempCanvas.height = baseImg.height;
      const tempCtx = tempCanvas.getContext('2d')!;
      
      // Draw the low-res mask, scaled up to full resolution
      tempCtx.drawImage(sourceCanvas, 0, 0, baseImg.width, baseImg.height);
      
      if (featherAmount > 0) {
          const scaledFeather = featherAmount * (baseImg.width / sourceCanvas.width);
          // Applying blur and re-masking to get feathered edges without growing the shape
          const blurCanvas = document.createElement('canvas');
          blurCanvas.width = baseImg.width;
          blurCanvas.height = baseImg.height;
          const blurCtx = blurCanvas.getContext('2d')!;
          blurCtx.filter = `blur(${scaledFeather}px)`;
          blurCtx.drawImage(tempCanvas, 0, 0);
          
          tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
          tempCtx.drawImage(blurCanvas, 0, 0);
          tempCtx.globalCompositeOperation = 'source-in';
          tempCtx.drawImage(sourceCanvas, 0, 0, baseImg.width, baseImg.height);
      }
      
      return tempCanvas.toDataURL('image/png');
  };
  
  const handleGenerateOrAnalyze = async (actionPrompt?: string) => {
    setError(null);
    setAnalysis(null);
    
    const selCanvas = selectionCanvasRef.current!;
    const selCtx = selCanvas.getContext('2d')!;
    const imageData = selCtx.getImageData(0, 0, selCanvas.width, selCanvas.height);
    if (!imageData.data.some(channel => channel !== 0)) {
        setError("Please make a selection on the image first.");
        return;
    }
    
    const finalPrompt = actionPrompt || prompt;
    
    setIsProcessing(true);
    setPreviewLayer(null);
    try {
        const maskDataUrl = await createFullResMask(selCanvas, feather);
        const highlightDataUrl = await createHighlightImage(image.src, selCanvas);

        if (!finalPrompt.trim()) {
            // Analysis Mode
            const analysisResult = await analyzeSelection(image.src, maskDataUrl, highlightDataUrl);
            setAnalysis(analysisResult);
        } else {
            // Edit Mode
            const result = await editImageWithMask(image.src, maskDataUrl, highlightDataUrl, finalPrompt, referenceImages);
            const newPreviewLayer: EditLayer = {
                id: `preview_${Date.now()}`,
                imageDataUrl: result.src,
                maskUrl: maskDataUrl,
                prompt: finalPrompt,
                editType: 'inpaint', // Generic type for display
                featherPx: feather,
                isVisible: true,
                opacity: 1,
                createdAt: Date.now()
            };
            setPreviewLayer(newPreviewLayer);
            clearSelectionCanvas();
        }

    } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
        setIsProcessing(false);
    }
  };


  const handleAcceptPreview = () => {
    if (previewLayer) {
      setLayers([...layers, previewLayer]);
      setPreviewLayer(null);
      setPrompt('');
      setReferenceImages([]);
    }
  };
  
  const handleFinishAndSave = () => {
    setIsProcessing(true);
    const baseImg = new Image();
    baseImg.crossOrigin = 'anonymous';
    baseImg.src = image.src;

    baseImg.onload = async () => {
        try {
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = baseImg.naturalWidth;
            finalCanvas.height = baseImg.naturalHeight;
            const ctx = finalCanvas.getContext('2d');
            if (!ctx) {
                throw new Error("Could not create canvas context for saving.");
            }
            ctx.drawImage(baseImg, 0, 0);

            const visibleLayers = layers.filter(l => l.isVisible);
            for (const layer of visibleLayers) {
                const layerImg = await new Promise<HTMLImageElement>((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.src = layer.imageDataUrl;
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                });
                ctx.globalAlpha = layer.opacity;
                // Draw layer scaled to full resolution
                ctx.drawImage(layerImg, 0, 0, finalCanvas.width, finalCanvas.height);
            }
            
            ctx.globalAlpha = 1.0;
            onSave(finalCanvas.toDataURL('image/png'));
        } catch (err) {
            console.error("Failed to compose final image:", err);
            setError("Could not save the image due to a layer loading error.");
        } finally {
            setIsProcessing(false);
        }
    };
    baseImg.onerror = () => {
        setError("Could not load the original image for saving.");
        setIsProcessing(false);
    };
};

  const handleUpdateLayer = (id: string, updates: Partial<EditLayer>) => {
    const newLayers = layers.map(l => l.id === id ? { ...l, ...updates } : l);
    setLayers(newLayers);
  };
  
  const handleSliderMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSliderDragging(true);
  };
  
  const handleSliderTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSliderDragging(true);
  };

  const handleCompareMouseMove = (e: React.MouseEvent) => {
      if(!isSliderDragging) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      let percentage = (x / rect.width) * 100;
      if (percentage < 0) percentage = 0;
      if (percentage > 100) percentage = 100;
      setCompareSlider(percentage);
  };
  
  const handleCompareTouchMove = (e: React.TouchEvent) => {
    if (!isSliderDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;
    const x = touch.clientX - rect.left;
    let percentage = (x / rect.width) * 100;
    if (percentage < 0) percentage = 0;
    if (percentage > 100) percentage = 100;
    setCompareSlider(percentage);
  };

  const handleReferenceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        setReferenceImages(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleRemoveReferenceImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSelectFromLibrary = () => {
    openLibrarySelector({
      multiple: true,
      onSelect: async (selectedImages) => {
        const files = await Promise.all(selectedImages.map(async (img) => {
            const res = await fetch(img.src);
            const blob = await res.blob();
            return new File([blob], `library_ref_${img.id}.png`, { type: blob.type });
        }));
        setReferenceImages(prev => [...prev, ...files]);
      }
    });
  };


  const quickEditSuggestions = ['Remove this', 'Make it brighter', 'Change the color to blue'];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex p-4 animate-fade-in text-dark-text-primary font-sans">
      <div className="bg-dark-surface rounded-xl shadow-2xl w-full h-full flex flex-col overflow-y-auto lg:overflow-hidden">
        {/* Header */}
        <header className="flex justify-between items-center p-3 border-b border-dark-border flex-shrink-0 h-14">
            <h2 className="text-xl font-bold">Image Editor</h2>
            <div className="flex items-center gap-4">
                 <button onClick={handleUndo} disabled={historyIndex === 0} className="p-1 disabled:opacity-40" title="Undo (Cmd+Z)"><UndoIcon className="h-5 w-5"/></button>
                 <button onClick={handleRedo} disabled={historyIndex === history.length - 1} className="p-1 disabled:opacity-40" title="Redo (Cmd+Shift+Z)"><RedoIcon className="h-5 w-5"/></button>
                 <button onClick={onCancel} className="text-dark-text-secondary hover:text-dark-text-primary rounded-full p-1"><XIcon className="h-6 w-6" /></button>
            </div>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
            {/* Toolbar */}
            <aside className="w-full lg:w-16 border-b lg:border-b-0 lg:border-r border-dark-border flex flex-row lg:flex-col items-center p-2 space-x-2 lg:space-x-0 lg:space-y-2">
                {[
                    { tool: 'brush' as Tool, icon: <BrushIcon className="w-6 h-6"/>, name: "Brush" },
                    { tool: 'lasso' as Tool, icon: <LassoIcon className="w-6 h-6"/>, name: "Lasso" },
                    { tool: 'rect' as Tool, icon: <RectIcon className="w-6 h-6"/>, name: "Rectangle" },
                ].map(({tool, icon, name}) => (
                    <button key={tool} onClick={() => setActiveTool(tool)} className={`p-3 rounded-lg flex-1 lg:w-full ${activeTool === tool ? 'bg-brand-primary text-white' : 'hover:bg-dark-input'}`} title={name}>
                        {icon}
                    </button>
                ))}
            </aside>
            
            {/* Main Canvas Area */}
            <main
              ref={containerRef}
              className="flex-1 flex items-center justify-center bg-dark-bg relative min-h-[300px] lg:min-h-0"
              onMouseUp={() => setIsSliderDragging(false)}
              onMouseLeave={() => setIsSliderDragging(false)}
              onMouseMove={handleCompareMouseMove}
              onTouchEnd={() => setIsSliderDragging(false)}
              onTouchMove={handleCompareTouchMove}
            >
                <canvas ref={baseCanvasRef} className="absolute inset-0 m-auto" />
                <canvas ref={layersCanvasRef} className="absolute inset-0 m-auto" />
                <canvas ref={previewCanvasRef} className="absolute inset-0 m-auto pointer-events-none" style={{ clipPath: previewLayer ? `inset(0 ${100 - compareSlider}% 0 0)` : 'none' }}/>
                <canvas ref={selectionCanvasRef} className="absolute inset-0 m-auto pointer-events-none opacity-40 mix-blend-overlay" />
                <canvas
                  ref={uiCanvasRef}
                  className="absolute inset-0 m-auto cursor-crosshair"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                />
                
                {isProcessing && (
                    <div className="absolute inset-0 bg-dark-bg/70 flex flex-col items-center justify-center">
                        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-3 text-md font-semibold">Applying AI edit...</p>
                    </div>
                )}
                
                {previewLayer && (
                    <div className="absolute inset-y-0 w-1 bg-white/80" style={{ left: `${compareSlider}%`, transform: 'translateX(-50%)', cursor: 'ew-resize' }}>
                        <div
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white rounded-full p-1 shadow-lg text-dark-bg cursor-ew-resize"
                          onMouseDown={handleSliderMouseDown}
                          onTouchStart={handleSliderTouchStart}
                        >
                            <SliderIcon className="w-6 h-6" />
                        </div>
                    </div>
                )}
            </main>
            
            {/* Right Sidebar */}
            <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-dark-border flex flex-col bg-dark-bg">
                <fieldset disabled={isProcessing} className="p-4 flex-grow overflow-y-auto space-y-3">
                    {/* Card 1: Selection Tools */}
                    <div className="bg-dark-surface rounded-lg p-4 border border-dark-border">
                        <h3 className="text-base font-semibold mb-3">Selection Tools</h3>
                        <div className="space-y-4">
                             <div>
                                <label className="block text-sm font-medium text-dark-text-secondary mb-1">Brush Size: <span className="font-semibold text-dark-text-primary">{brushSize}px</span></label>
                                <input type="range" min="5" max="150" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value, 10))} className="w-full h-2 bg-dark-input rounded-lg appearance-none cursor-pointer accent-brand-primary" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-dark-text-secondary mb-1">Feather: <span className="font-semibold text-dark-text-primary">{feather}px</span></label>
                                <input type="range" min="0" max="50" value={feather} onChange={(e) => setFeather(parseInt(e.target.value, 10))} className="w-full h-2 bg-dark-input rounded-lg appearance-none cursor-pointer accent-brand-primary" />
                            </div>
                            <button onClick={clearSelectionCanvas} className="w-full text-center bg-dark-input border border-dark-border hover:bg-dark-border px-4 py-2 rounded-md text-sm font-semibold">Clear Mask</button>
                        </div>
                    </div>

                    {/* Card 2: AI Edit */}
                     <div className="bg-dark-surface rounded-lg p-4 border border-dark-border space-y-3">
                        <h3 className="text-base font-semibold">AI Edit</h3>
                        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe your edit, or leave blank to get suggestions..." rows={3} className="block w-full rounded-lg border-dark-border bg-dark-input shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm px-3 py-2" />
                        
                        <div className="pt-1">
                            <label className="text-sm font-medium text-dark-text-secondary block mb-2">Reference Images (Optional)</label>
                             <div className="flex flex-wrap gap-2 items-center">
                                {referenceImageUrls.map((url, index) => (
                                    <div key={index} className="relative group">
                                        <img src={url} alt={referenceImages[index].name} className="w-12 h-12 rounded-md object-cover border border-dark-border"/>
                                        <button onClick={() => handleRemoveReferenceImage(index)} className="absolute -top-1.5 -right-1.5 bg-dark-surface border border-dark-border rounded-full p-0.5 text-dark-text-secondary hover:text-dark-text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                            <XIcon className="w-3 h-3"/>
                                        </button>
                                    </div>
                                ))}
                                <div className="flex flex-col gap-2">
                                     <label htmlFor="reference-upload" className="w-12 h-12 flex items-center justify-center bg-dark-input border-2 border-dashed border-dark-border rounded-md cursor-pointer hover:border-brand-primary transition-colors" title="Upload from device">
                                        <PlusIcon className="w-6 h-6 text-dark-text-secondary" />
                                    </label>
                                    <input id="reference-upload" type="file" multiple accept="image/*" className="hidden" onChange={handleReferenceImageChange} />
                                </div>
                                <button onClick={handleSelectFromLibrary} className="w-12 h-12 flex items-center justify-center bg-dark-input border-2 border-dashed border-dark-border rounded-md cursor-pointer hover:border-brand-primary transition-colors" title="Select from Library">
                                    <PhotoIcon className="w-6 h-6 text-dark-text-secondary" />
                                </button>
                            </div>
                        </div>

                        {!prompt.trim() && !analysis && (
                             <div className="flex flex-wrap gap-2 pt-1">
                                {quickEditSuggestions.map(suggestion => (
                                    <button key={suggestion} onClick={() => setPrompt(suggestion)} className="px-2 py-1 rounded-md text-xs font-medium transition-colors bg-dark-input text-dark-text-primary hover:bg-dark-border border border-dark-border">
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        )}

                        <button onClick={() => handleGenerateOrAnalyze()} disabled={isProcessing} className="w-full bg-brand-secondary text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-600">
                           {isProcessing ? 'Processing...' : (prompt.trim() ? 'Generate Preview' : 'Analyze Selection')}
                        </button>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        
                        {analysis && !isProcessing && (
                             <div className="p-3 bg-dark-input rounded-lg border border-dark-border space-y-2 animate-fade-in">
                                <h4 className="text-sm font-semibold">AI Analysis</h4>
                                <p className="text-sm text-dark-text-secondary italic">"{analysis.selection_summary}"</p>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {analysis.suggested_actions.map(action => (
                                        <button key={action} onClick={() => { setPrompt(action); handleGenerateOrAnalyze(action); }} className="px-2 py-1 rounded-md text-xs font-medium transition-colors bg-dark-surface text-dark-text-primary hover:bg-dark-border border border-dark-border">
                                            {action}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {previewLayer && (
                            <div className="p-3 bg-dark-input rounded-lg border border-dark-border space-y-2">
                                <p className="text-sm font-semibold">Preview Ready</p>
                                <div className="flex gap-2">
                                    <button onClick={() => setPreviewLayer(null)} className="flex-1 text-center bg-dark-surface border border-dark-border hover:bg-dark-border px-4 py-2 rounded-md text-sm font-semibold">Cancel</button>
                                    <button onClick={handleAcceptPreview} className="flex-1 bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">Accept</button>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Card 3: Layers Panel (collapsible) */}
                    <div className="bg-dark-surface rounded-lg border border-dark-border">
                        <button onClick={() => setIsLayersOpen(!isLayersOpen)} className="w-full flex justify-between items-center p-4">
                            <h3 className="text-base font-semibold">Layers</h3>
                            <ChevronDownIcon className={`w-5 h-5 transition-transform ${isLayersOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isLayersOpen && (
                            <div className="p-4 border-t border-dark-border space-y-2">
                               {layers.slice().reverse().map(layer => (
                                    <div key={layer.id} className="bg-dark-input p-2 rounded-md border border-dark-border">
                                        <div className="flex items-center justify-between gap-2">
                                            <button onClick={() => handleUpdateLayer(layer.id, { isVisible: !layer.isVisible })}>
                                                {layer.isVisible ? <EyeIcon className="h-4 w-4"/> : <EyeOffIcon className="h-4 w-4 text-gray-400" />}
                                            </button>
                                            <p className="text-xs font-medium truncate flex-1" title={layer.prompt}>{layer.editType}: {layer.prompt}</p>
                                        </div>
                                        <label className="text-xs text-dark-text-secondary mt-2 block">Opacity</label>
                                        <input type="range" min="0" max="1" step="0.05" value={layer.opacity} onChange={(e) => handleUpdateLayer(layer.id, { opacity: parseFloat(e.target.value) })} className="w-full h-1 mt-1 bg-dark-border rounded-lg appearance-none cursor-pointer accent-brand-primary" />
                                    </div>
                               ))}
                               <div className="bg-dark-bg p-2 rounded-md border border-dark-border text-center text-xs text-dark-text-secondary font-medium">Base Image</div>
                            </div>
                        )}
                    </div>
                </fieldset>
                {/* Footer */}
                <div className="p-4 border-t border-dark-border bg-dark-surface flex-shrink-0">
                    <button onClick={handleFinishAndSave} disabled={isProcessing} className="w-full bg-brand-primary text-white font-bold py-2.5 px-4 rounded-lg hover:bg-purple-700 transition-colors">
                      {isProcessing ? 'Saving...' : 'Finish & Save'}
                    </button>
                </div>
            </aside>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GeneratedImage, EditLayer } from '../types';
import { analyzeEditIntent, editImageWithMask } from '../services/geminiService';

interface ImageEditorProps {
  image: GeneratedImage;
  onSave: (finalImageDataUrl: string) => void;
  onCancel: () => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ image, onSave, onCancel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const layersCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [layers, setLayers] = useState<EditLayer[]>([]);
  const [history, setHistory] = useState<EditLayer[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(40);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateHistory = (newLayers: EditLayer[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newLayers);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setLayers(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setLayers(history[historyIndex + 1]);
    }
  };

  useEffect(() => {
    const baseCanvas = baseCanvasRef.current;
    const layersCanvas = layersCanvasRef.current;
    const drawCanvas = drawCanvasRef.current;
    const baseCtx = baseCanvas?.getContext('2d');
    const layersCtx = layersCanvas?.getContext('2d');
    if (!baseCanvas || !layersCanvas || !drawCanvas || !baseCtx || !layersCtx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = image.src;
    img.onload = () => {
      const container = containerRef.current;
      if (!container) return;

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

      [baseCanvas, layersCanvas, drawCanvas].forEach(canvas => {
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
      });

      baseCtx.clearRect(0, 0, canvasWidth, canvasHeight);
      baseCtx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

      layersCtx.clearRect(0, 0, canvasWidth, canvasHeight);
      layers.forEach(layer => {
        if (layer.isVisible) {
          const layerImg = new Image();
          layerImg.src = layer.imageDataUrl;
          layerImg.onload = () => {
            layersCtx.globalAlpha = layer.opacity;
            layersCtx.drawImage(layerImg, 0, 0, canvasWidth, canvasHeight);
            layersCtx.globalAlpha = 1.0;
          };
        }
      });
    };
  }, [image.src, layers]);


  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e.nativeEvent ? e.nativeEvent.touches[0].clientX : e.nativeEvent.clientX;
    const clientY = 'touches' in e.nativeEvent ? e.nativeEvent.touches[0].clientY : e.nativeEvent.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCoordinates(e);
    if (!coords) return;
    const ctx = drawCanvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      setIsDrawing(true);
    }
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const coords = getCoordinates(e);
    if (!coords) return;
    const ctx = drawCanvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(109, 40, 217, 0.7)';
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  }, [isDrawing, brushSize]);

  const endDrawing = useCallback(() => setIsDrawing(false), []);
  
  const clearDrawCanvas = () => {
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  const handleApplyEdit = async () => {
    setError(null);
    if (!prompt.trim()) {
        setError("Please enter a prompt describing your edit.");
        return;
    }
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = drawCanvas.width;
    maskCanvas.height = drawCanvas.height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    maskCtx.fillStyle = 'black';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    maskCtx.drawImage(drawCanvas, 0, 0);
    maskCtx.globalCompositeOperation = 'source-in';
    maskCtx.fillStyle = 'white';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    const maskDataUrl = maskCanvas.toDataURL('image/png');

    const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    let hasWhitePixel = false;
    for (let i = 0; i < imageData.data.length; i += 4) {
        if (imageData.data[i] === 255) {
            hasWhitePixel = true;
            break;
        }
    }
    if (!hasWhitePixel) {
        setError("Please draw a mask on the image before applying an edit.");
        return;
    }
    
    setIsProcessing(true);
    try {
        const job = await analyzeEditIntent(prompt);
        const result = await editImageWithMask(image.src, maskDataUrl, job.model_prompt);

        const newLayer: EditLayer = {
            id: `layer_${Date.now()}`,
            imageDataUrl: result.src,
            opacity: 1,
            isVisible: true,
            editParams: {
                maskDataUrl,
                userPrompt: prompt,
                modelPrompt: job.model_prompt,
                editType: job.edit_type,
            }
        };

        const newLayers = [...layers, newLayer];
        setLayers(newLayers);
        updateHistory(newLayers);
        
        clearDrawCanvas();
        setPrompt('');

    } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "An unknown error occurred during editing.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleFinishAndSave = () => {
    const finalCanvas = document.createElement('canvas');
    const baseCanvas = baseCanvasRef.current;
    if (!baseCanvas) return;
    
    finalCanvas.width = baseCanvas.width;
    finalCanvas.height = baseCanvas.height;
    const ctx = finalCanvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(baseCanvas, 0, 0);
    
    const layersCanvas = layersCanvasRef.current;
    if (layersCanvas) {
        ctx.drawImage(layersCanvas, 0, 0);
    }

    onSave(finalCanvas.toDataURL('image/png'));
  };

  const updateLayer = (id: string, updates: Partial<EditLayer>) => {
    const newLayers = layers.map(l => l.id === id ? { ...l, ...updates } : l);
    setLayers(newLayers);
  };


  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in text-dark-text-primary">
      <div className="bg-dark-surface rounded-xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-3 border-b border-dark-border flex-shrink-0">
            <h2 className="text-xl font-bold">Image Edit Orchestrator</h2>
            <div className="flex items-center gap-4">
                 <button onClick={handleUndo} disabled={historyIndex === 0} className="p-1 disabled:opacity-40"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
                 <button onClick={handleRedo} disabled={historyIndex === history.length - 1} className="p-1 disabled:opacity-40"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></button>
                 <button onClick={onCancel} className="text-dark-text-secondary hover:text-dark-text-primary rounded-full p-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
            {/* Main Canvas Area */}
            <main ref={containerRef} className="flex-1 flex items-center justify-center bg-dark-bg relative" onMouseUp={endDrawing} onMouseLeave={endDrawing}>
                <canvas ref={baseCanvasRef} className="absolute inset-0 m-auto" />
                <canvas ref={layersCanvasRef} className="absolute inset-0 m-auto" />
                <canvas ref={drawCanvasRef} className="absolute inset-0 m-auto cursor-crosshair" onMouseDown={startDrawing} onMouseMove={draw} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={endDrawing} />
                {isProcessing && (
                    <div className="absolute inset-0 bg-dark-bg/70 flex flex-col items-center justify-center">
                        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-3 text-md font-semibold">Applying AI edit...</p>
                    </div>
                )}
            </main>
            
            {/* Right Sidebar */}
            <aside className="w-80 border-l border-dark-border flex flex-col">
                <div className="p-4 flex-grow overflow-y-auto">
                    {/* Controls */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold">1. Mask Area & Describe Change</label>
                            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., 'make this matte black'" rows={3} className="mt-2 block w-full rounded-md border-dark-border bg-dark-input shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="brushSize" className="block text-sm font-medium text-dark-text-secondary mb-1">Brush Size: <span className="font-semibold text-dark-text-primary">{brushSize}px</span></label>
                            <input type="range" id="brushSize" min="5" max="100" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value, 10))} className="w-full h-2 bg-dark-input rounded-lg appearance-none cursor-pointer accent-brand-primary" />
                        </div>
                        <button onClick={clearDrawCanvas} className="w-full text-center bg-dark-input border border-dark-border hover:bg-dark-border px-4 py-2 rounded-md text-sm font-semibold">Clear Mask</button>
                        <button onClick={handleApplyEdit} disabled={isProcessing || !prompt.trim()} className="w-full bg-brand-secondary text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-600">Apply Edit as Layer</button>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                    </div>
                    <hr className="my-4 border-dark-border"/>
                    {/* Layers Panel */}
                    <div>
                        <h3 className="text-sm font-semibold mb-2">Layers</h3>
                        <div className="space-y-2">
                           {layers.slice().reverse().map(layer => (
                                <div key={layer.id} className="bg-dark-input p-2 rounded-md border border-dark-border">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-medium truncate flex-1 pr-2" title={layer.editParams.userPrompt}>{layer.editParams.editType}: {layer.editParams.userPrompt}</p>
                                        <button onClick={() => updateLayer(layer.id, { isVisible: !layer.isVisible })}>
                                            {layer.isVisible ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.05 10.05 0 01-4.125 5.175M17 17l-3.59-3.59" /></svg>}
                                        </button>
                                    </div>
                                    <input type="range" min="0" max="1" step="0.05" value={layer.opacity} onChange={(e) => updateLayer(layer.id, { opacity: parseFloat(e.target.value) })} className="w-full h-1 mt-2 bg-dark-border rounded-lg appearance-none cursor-pointer accent-brand-primary" />
                                </div>
                           ))}
                           <div className="bg-dark-bg p-2 rounded-md border border-dark-border text-center text-xs text-dark-text-secondary font-medium">Base Image</div>
                        </div>
                    </div>
                </div>
                {/* Footer */}
                <div className="p-4 border-t border-dark-border bg-dark-surface flex-shrink-0">
                    <button onClick={handleFinishAndSave} className="w-full bg-brand-primary text-white font-bold py-2.5 px-4 rounded-lg hover:bg-purple-700 transition-colors">Finish & Save</button>
                </div>
            </aside>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
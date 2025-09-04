




import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { AdCreativeState, GeneratedImage } from '../types';
import { adTemplates } from '../adTemplates';

interface AdCreativeEditorProps {
  backgroundImage: GeneratedImage;
  logoImage: HTMLImageElement | null;
  creativeState: AdCreativeState;
  onStateChange: (newState: Partial<AdCreativeState>) => void;
}

type DraggableElement = 'logo' | 'headline' | 'cta' | null;

const AdCreativeEditor: React.FC<AdCreativeEditorProps> = ({
  backgroundImage,
  logoImage,
  creativeState,
  onStateChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [draggingElement, setDraggingElement] = useState<DraggableElement>(null);
  
  // Refs to store the calculated bounding boxes of draggable elements on the canvas
  const elementRectsRef = useRef<{ [key in NonNullable<DraggableElement>]: DOMRectReadOnly }>({
    logo: new DOMRectReadOnly(),
    headline: new DOMRectReadOnly(),
    cta: new DOMRectReadOnly(),
  });

  const getEventCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const source = 'touches' in e ? e.touches[0] : e;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { 
      x: (source.clientX - rect.left) * scaleX, 
      y: (source.clientY - rect.top) * scaleY 
    };
  };

  const isPointInRect = (point: {x: number, y: number}, rect: DOMRectReadOnly) => {
    return point.x >= rect.x && point.x <= rect.x + rect.width &&
           point.y >= rect.y && point.y <= rect.y + rect.height;
  };
  
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getEventCoordinates(e);
    for (const key in elementRectsRef.current) {
        const elementKey = key as NonNullable<DraggableElement>;
        if (isPointInRect(coords, elementRectsRef.current[elementKey])) {
            // Check visibility based on state
            if ((elementKey === 'logo' && creativeState.showLogo) ||
                (elementKey === 'headline' && creativeState.showHeadline) ||
                (elementKey === 'cta' && creativeState.showCta)) {
                setDraggingElement(elementKey);
                e.currentTarget.style.cursor = 'grabbing';
                return;
            }
        }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const coords = getEventCoordinates(e);

    if (draggingElement) {
      const newPosition = {
        x: (coords.x / canvas.width) * 100,
        y: (coords.y / canvas.height) * 100,
      };
      
      if (draggingElement === 'logo') {
        onStateChange({ logoPosition: newPosition });
      } else if (draggingElement === 'headline') {
        onStateChange({ headlinePosition: newPosition });
      } else if (draggingElement === 'cta') {
        onStateChange({ ctaPosition: newPosition });
      }

    } else { // Handle hover cursors
      let cursor: 'grab' | 'default' = 'default';
      for (const key in elementRectsRef.current) {
        const elementKey = key as NonNullable<DraggableElement>;
        if (isPointInRect(coords, elementRectsRef.current[elementKey])) {
            if ((elementKey === 'logo' && creativeState.showLogo) ||
                (elementKey === 'headline' && creativeState.showHeadline) ||
                (elementKey === 'cta' && creativeState.showCta)) {
                cursor = 'grab';
                break;
            }
        }
      }
      canvas.style.cursor = cursor;
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setDraggingElement(null);
    e.currentTarget.style.cursor = 'default'; // Revert to default, hover will fix it
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const bgImg = new Image();
    bgImg.crossOrigin = 'anonymous';
    bgImg.src = backgroundImage.src;

    const handleDraw = () => {
      canvas.width = bgImg.naturalWidth;
      canvas.height = bgImg.naturalHeight;
      ctx.drawImage(bgImg, 0, 0);

      const template = adTemplates.find(t => t.id === creativeState.templateId);
      if (template) {
        const updatedRects = template.draw(ctx, canvas, creativeState, logoImage || undefined);
        // Store the calculated bounding boxes for hit detection
        if (updatedRects) {
          elementRectsRef.current = updatedRects;
        }
      }
    };

    if (bgImg.complete && bgImg.naturalWidth > 0) {
        handleDraw();
    } else {
        bgImg.onload = handleDraw;
    }
  }, [backgroundImage, logoImage, creativeState]);
  
  // We use useMemo to create a stable key for the useEffect dependency array.
  // This prevents re-renders on every mouse move.
  const stateKey = useMemo(() => JSON.stringify(creativeState), [creativeState]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas, stateKey]);

  return (
    <div className="w-full h-full bg-dark-bg flex items-center justify-center p-2">
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full object-contain rounded-md"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} // End drag if mouse leaves canvas
      />
    </div>
  );
};

export default AdCreativeEditor;
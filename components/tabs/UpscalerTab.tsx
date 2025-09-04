

import React, { useState, useCallback, useEffect } from 'react';
import { GeneratedImage, ToastInfo } from '../../types';
import { createThumbnail } from '../../utils/imageUtils';
import ImageUploader from '../ImageUploader';
import ImageUpscaler from '../ImageUpscaler';

interface UpscalerTabProps {
  addToast: (toast: Omit<ToastInfo, 'id'>) => void;
  addImageToLibrary: (images: GeneratedImage[]) => void;
  initialImage?: GeneratedImage;
  onDone?: () => void;
}

const UpscalerTab: React.FC<UpscalerTabProps> = ({ addToast, addImageToLibrary, initialImage, onDone }) => {
  const [upscalingImage, setUpscalingImage] = useState<GeneratedImage | null>(initialImage || null);

  useEffect(() => {
    if (initialImage) {
      setUpscalingImage(initialImage);
      onDone?.();
    }
  }, [initialImage, onDone]);

  const handleFinalUpscaleSave = useCallback(async (finalImageDataUrl: string, sourceImageId: string) => {
    if (!upscalingImage) return;
    
    setUpscalingImage(null);
    const thumbnailSrc = await createThumbnail(finalImageDataUrl, 256, 256);

    const upscaledImage: GeneratedImage = {
        id: `upscaled_${Date.now()}`,
        src: finalImageDataUrl,
        thumbnailSrc: thumbnailSrc,
    };
    
    addImageToLibrary([upscaledImage]);

    addToast({
        title: 'Image Upscaled & Saved',
        message: 'Your high-resolution image has been saved to the library.',
        type: 'success',
        imageSrc: thumbnailSrc
    });
  }, [addToast, addImageToLibrary, upscalingImage]);

  if (!upscalingImage) {
    return <ImageUploader onUpload={(images) => setUpscalingImage(images[0])} title="Image Upscaler" subtitle="Upload a low-resolution image to enhance its quality." multiple={false} />;
  }

  return (
    <ImageUpscaler
      image={upscalingImage}
      onSave={handleFinalUpscaleSave}
      onCancel={() => setUpscalingImage(null)}
    />
  );
};

export default UpscalerTab;
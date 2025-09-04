

// FIX: Import `useRef` to resolve "Cannot find name 'useRef'" error.
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GeneratedImage, ToastInfo } from '../../types';
import { createThumbnail } from '../../utils/imageUtils';
import ImageUploader from '../ImageUploader';
import ImageEditor from '../ImageEditor';

interface EditorTabProps {
  addToast: (toast: Omit<ToastInfo, 'id'>) => void;
  addImageToLibrary: (images: GeneratedImage[]) => void;
  initialImage?: GeneratedImage;
  onDone?: () => void;
}

const EditorTab: React.FC<EditorTabProps> = ({ addToast, addImageToLibrary, initialImage, onDone }) => {
  const [editingImage, setEditingImage] = useState<GeneratedImage | null>(initialImage || null);
  const sourceImageRef = useRef<GeneratedImage | null>(initialImage || null);

  useEffect(() => {
    if (initialImage) {
        setEditingImage(initialImage);
        sourceImageRef.current = initialImage;
        onDone?.();
    }
  }, [initialImage, onDone]);
  
  const handleImageUpload = (image: GeneratedImage) => {
      setEditingImage(image);
      sourceImageRef.current = image;
  };

  const handleFinalImageSave = useCallback(async (finalImageDataUrl: string) => {
    const originalImage = sourceImageRef.current;
    if (!originalImage) return;

    setEditingImage(null);
    const thumbnailSrc = await createThumbnail(finalImageDataUrl, 256, 256);
    
    const savedImage: GeneratedImage = {
        id: `edited_${Date.now()}`,
        src: finalImageDataUrl,
        thumbnailSrc: thumbnailSrc,
    };

    addImageToLibrary([savedImage]);

    addToast({
        title: 'Image Saved to Library',
        message: 'Your edited image has been saved to the library.',
        type: 'success',
        imageSrc: thumbnailSrc
    });
  }, [addToast, addImageToLibrary]);

  if (!editingImage) {
    return <ImageUploader onUpload={(images) => handleImageUpload(images[0])} title="Image Editor" subtitle="Upload an image to start making advanced edits." multiple={false} />;
  }
  
  return (
    <ImageEditor 
      image={editingImage}
      onSave={handleFinalImageSave}
      onCancel={() => setEditingImage(null)}
    />
  );
};

export default EditorTab;
import React, { useState, useCallback, useEffect, useRef } from 'react';
// FIX: Correct import path for the Zustand store.
import { useAppStore } from '../../store';
// FIX: Correct import path for types.
import { GeneratedImage, LibraryImage } from '../../types';
import { createThumbnail } from '../../utils/imageUtils';
import ImageUploader from '../ImageUploader';
import ImageEditor from '../ImageEditor';

interface EditorTabProps {
  initialImage?: LibraryImage;
}

const EditorTab: React.FC<EditorTabProps> = ({ initialImage }) => {
  const { addToast, addImagesToLibrary, clearRecreationData, openLibrarySelector } = useAppStore();
  const [editingImage, setEditingImage] = useState<GeneratedImage | null>(initialImage || null);
  const sourceImageRef = useRef<GeneratedImage | null>(initialImage || null);

  useEffect(() => {
    if (initialImage) {
        setEditingImage(initialImage);
        sourceImageRef.current = initialImage;
        clearRecreationData();
    }
  }, [initialImage, clearRecreationData]);
  
  const handleImageUpload = (images: GeneratedImage[]) => {
      const image = images[0];
      if (image) {
        setEditingImage(image);
        sourceImageRef.current = image;
      }
  };

  const handleSelectFromLibrary = () => {
    openLibrarySelector({
        multiple: false,
        onSelect: (images) => {
            // handleImageUpload takes GeneratedImage[]
            handleImageUpload(images);
        }
    });
  };

  const handleFinalImageSave = useCallback(async (finalImageDataUrl: string) => {
    const originalId = sourceImageRef.current?.id;
    
    const [savedImage] = await addImagesToLibrary([{
        src: finalImageDataUrl,
        originalId: originalId,
        notes: `Edited from ${originalId}`,
    }]);

    addToast({
        title: 'Image Saved to Library',
        message: 'Your edited image has been saved.',
        type: 'success',
        imageSrc: savedImage.thumbnailSrc
    });
    
    setEditingImage(null);
    sourceImageRef.current = null;
  }, [addToast, addImagesToLibrary]);

  if (!editingImage) {
    return <ImageUploader onUpload={handleImageUpload} onSelectFromLibrary={handleSelectFromLibrary} title="Image Editor" subtitle="Upload an image to start making advanced edits." multiple={false} />;
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

import React, { useEffect } from 'react';
import { useAppStore } from '../../store';
import { GeneratedImage } from '../../types';
import ImageUploader from '../ImageUploader';

interface UpscalerTabProps {
  initialImage?: GeneratedImage;
}

const UpscalerTab: React.FC<UpscalerTabProps> = ({ initialImage }) => {
  const { openUpscaler, clearRecreationData, openLibrarySelector } = useAppStore();

  useEffect(() => {
    if (initialImage) {
      openUpscaler(initialImage);
      clearRecreationData();
    }
  }, [initialImage, openUpscaler, clearRecreationData]);
  
  const handleUpload = (images: GeneratedImage[]) => {
    if (images[0]) {
      openUpscaler(images[0]);
    }
  };

  const handleSelectFromLibrary = () => {
    openLibrarySelector({
      multiple: false,
      onSelect: (images) => {
        if(images[0]) {
          openUpscaler(images[0]);
        }
      }
    });
  }

  return (
      <ImageUploader 
        onUpload={handleUpload} 
        onSelectFromLibrary={handleSelectFromLibrary}
        title="Image Upscaler" 
        subtitle="Upload a low-resolution image to enhance its quality and details." 
        multiple={false} 
      />
  );
};

export default UpscalerTab;
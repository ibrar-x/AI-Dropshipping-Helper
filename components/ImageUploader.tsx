
import React, { useCallback, useState } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { ensureSupportedImageFormat, createThumbnail } from '../utils/imageUtils';
// FIX: Correct import path for types.
import { GeneratedImage } from '../types';
import { PhotoIcon } from './icons/PhotoIcon';

interface ImageUploaderProps {
  onUpload: (images: GeneratedImage[]) => void;
  title: string;
  subtitle: string;
  multiple?: boolean;
  onSelectFromLibrary?: () => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onUpload, title, subtitle, multiple = false, onSelectFromLibrary }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(async (files: FileList) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      return;
    }

    try {
        const processedImages = await Promise.all(imageFiles.map(async (file) => {
            const { base64, mimeType } = await ensureSupportedImageFormat(file);
            const src = `data:${mimeType};base64,${base64}`;
            const thumbnailSrc = await createThumbnail(src, 256, 256);
            return { id: `upload_${Date.now()}_${Math.random()}`, src, thumbnailSrc };
        }));
        onUpload(processedImages);
    } catch (error) {
        console.error("Failed to process files:", error);
    }
  }, [onUpload]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-dark-bg animate-fade-in">
      <div className="flex flex-col items-center justify-center text-center w-full max-w-xl">
        <h1 className="text-3xl md:text-4xl font-bold text-dark-text-primary">
          {title}
        </h1>
        <p className="mt-2 max-w-md text-md text-dark-text-secondary">
          {subtitle}
        </p>
        <div className="w-full mt-8">
          <label
            htmlFor={`image-upload-input-${title.replace(/\s+/g, '-')}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            className={`w-full h-64 flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
              isDragging ? 'border-brand-primary bg-brand-primary/10' : 'border-dark-border bg-dark-surface hover:border-brand-secondary'
            }`}
          >
            <div className="text-center">
              <UploadIcon className="mx-auto h-10 w-10 text-dark-text-secondary" />
              <p className="mt-4 text-sm text-brand-primary font-semibold">Click to upload or drag & drop</p>
              <p className="mt-1 text-xs text-dark-text-secondary">PNG, JPG, WEBP accepted {multiple && '(multiple files allowed)'}</p>
            </div>
          </label>
          <input
            id={`image-upload-input-${title.replace(/\s+/g, '-')}`}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            multiple={multiple}
          />
           {onSelectFromLibrary && (
            <>
              <div className="relative flex items-center justify-center my-4">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dark-border"></div>
                <span className="relative bg-dark-bg px-2 text-xs uppercase text-dark-text-secondary">Or</span>
              </div>
              <button
                onClick={onSelectFromLibrary}
                className="w-full flex items-center justify-center gap-2 bg-dark-input border border-dark-border text-dark-text-primary hover:bg-dark-border px-4 py-3 rounded-xl text-sm font-bold transition-colors"
              >
                <PhotoIcon className="w-5 h-5" />
                <span>Select from Library</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageUploader;
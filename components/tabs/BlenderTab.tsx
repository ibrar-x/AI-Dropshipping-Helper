import React, { useState, useCallback, useEffect } from 'react';
import { useAppStore } from '../../store';
import { GeneratedImage, LibraryImage, ExportBundle } from '../../types';
import ImageUploader from '../ImageUploader';
import ImageBlender from '../ImageBlender';

interface BlenderTabProps {
    initialImage?: GeneratedImage | null;
}

const BlenderTab: React.FC<BlenderTabProps> = ({ initialImage }) => {
    const { addToast, addImagesToLibrary, openLibrarySelector, clearRecreationData } = useAppStore();

    const [step, setStep] = useState<'UPLOAD' | 'BLENDING'>('UPLOAD');
    const [initialImages, setInitialImages] = useState<GeneratedImage[]>([]);

    useEffect(() => {
        if (initialImage) {
            setInitialImages([initialImage]);
            clearRecreationData();
        }
    }, [initialImage, clearRecreationData]);
    
     useEffect(() => {
        if (initialImages.length > 0) {
            setStep('BLENDING');
        }
    }, [initialImages]);


    const handleImagesUpload = useCallback((images: GeneratedImage[]) => {
        setInitialImages(prev => {
            const newImages = images.filter(img => !prev.some(p => p.id === img.id));
            return [...prev, ...newImages];
        });
    }, []);

    const handleSelectFromLibrary = () => {
        openLibrarySelector({
            multiple: true,
            onSelect: (images) => {
                handleImagesUpload(images);
            }
        });
    };
    
    const handleBlendComplete = useCallback(async (
        compositeImage: GeneratedImage, 
        resultImage: GeneratedImage, 
        prompt: string,
        bundle: ExportBundle,
        seed: number,
    ) => {
        const [savedImage] = await addImagesToLibrary([{
            src: resultImage.src,
            prompt: prompt,
            notes: `Surprise image created with seed ${seed}. Based on a composite of ${bundle.metadata.layers.length} images.`
        }]);

        addToast({
            title: 'Blend Saved to Library',
            message: 'Your new creation has been saved to the library.',
            type: 'success',
            imageSrc: savedImage.thumbnailSrc
        });
        
        // Reset to upload screen for a new blend
        setStep('UPLOAD');
        setInitialImages([]);

    }, [addToast, addImagesToLibrary]);

    const reset = () => {
        setStep('UPLOAD');
        setInitialImages([]);
        clearRecreationData();
    };

    if (step === 'UPLOAD') {
         return (
            <div className="flex-1 flex flex-col items-center justify-center p-4">
                <ImageUploader 
                    onUpload={handleImagesUpload} 
                    onSelectFromLibrary={handleSelectFromLibrary} 
                    title="Image Blender" 
                    subtitle="Upload multiple images to combine them into a new 'surprise' creation." 
                    multiple={true} 
                />
            </div>
        );
    }

    return <ImageBlender images={initialImages} onBlend={handleBlendComplete} onCancel={reset} addToast={addToast} />;
};

export default BlenderTab;
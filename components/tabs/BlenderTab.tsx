import React, { useState, useCallback, useEffect } from 'react';
import { useAppStore } from '../../store';
import { GeneratedImage, LibraryImage } from '../../types';
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

    const handleImagesUpload = useCallback((images: GeneratedImage[]) => {
        setInitialImages(prev => [...prev, ...images]);
    }, []);

    const handleSelectFromLibrary = () => {
        openLibrarySelector({
            multiple: true,
            onSelect: (images) => {
                handleImagesUpload(images);
            }
        });
    };

    const startBlending = () => {
        if (initialImages.length < 2) {
            addToast({ title: 'Not Enough Images', message: 'Please upload at least two images to blend.', type: 'error' });
            return;
        }
        setStep('BLENDING');
    };

    const handleBlendComplete = useCallback(async (compositeImage: GeneratedImage, resultImage: GeneratedImage, prompt: string) => {
        const [savedImage] = await addImagesToLibrary([{
            src: resultImage.src,
            prompt: prompt,
            notes: `Blended from ${initialImages.length} images.`
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

    }, [addToast, addImagesToLibrary, initialImages.length]);

    const reset = () => {
        setStep('UPLOAD');
        setInitialImages([]);
        clearRecreationData();
    };

    if (step === 'UPLOAD') {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-4">
                <ImageUploader onUpload={handleImagesUpload} onSelectFromLibrary={handleSelectFromLibrary} title="Image Blender" subtitle="Upload multiple images to combine them into a new creation." multiple={true} />
                {initialImages.length > 0 && (
                    <div className="mt-8 text-center animate-fade-in">
                        <div className="flex flex-wrap justify-center gap-4 mb-4">
                            {initialImages.map(img => (
                                <img key={img.id} src={img.thumbnailSrc || img.src} alt="Uploaded" className="w-24 h-24 rounded-lg object-cover border-2 border-dark-border" />
                            ))}
                        </div>
                        <p className="text-dark-text-secondary mb-4">{initialImages.length} image(s) ready. Add more or start blending.</p>
                        <button onClick={startBlending} className="bg-brand-primary text-white font-bold py-3 px-8 rounded-lg hover:bg-brand-secondary transition-colors">
                            Start Blending ({initialImages.length})
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return <ImageBlender images={initialImages} onBlend={handleBlendComplete} onCancel={reset} addToast={addToast} />;
};

export default BlenderTab;
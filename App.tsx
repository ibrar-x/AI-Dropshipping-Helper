import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChatMessage, GeneratedImage, GenerationPayload, UpscaleOptions } from './types';
import { generateLifestyleImage, refineLifestyleImage, detectProductCategory } from './services/geminiService';
import ChatFeed from './components/ResultsDisplay';
import ChatInput from './components/FileUpload';
import ImageEditor from './components/ImageEditor';
import WelcomeScreen from './components/WelcomeScreen';
import ImageUpscaler from './components/ImageUpscaler';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedImageForChat, setSelectedImageForChat] = useState<GeneratedImage | null>(null);
  const [isDetectingCategory, setIsDetectingCategory] = useState(false);
  const [editingImage, setEditingImage] = useState<GeneratedImage | null>(null);
  const [upscalingImage, setUpscalingImage] = useState<GeneratedImage | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const isCancellingRef = useRef(false);

  useEffect(() => {
    if (mainRef.current) {
        mainRef.current.scrollTo({
            top: mainRef.current.scrollHeight,
            behavior: 'smooth',
        });
    }
  }, [messages]);

  const handleFileSelect = useCallback(async (file: File | null) => {
    setUploadedFile(file);
    setSelectedImageForChat(null);
    if (file) {
      setIsDetectingCategory(true);
      
      const userMessage: ChatMessage = {
          id: `user_upload_${Date.now()}`,
          role: 'user',
          images: [{ id: 'preview', src: URL.createObjectURL(file) }],
          text: `Uploaded: ${file.name}`
      };
      setMessages(prev => [...prev, userMessage]);

      try {
        const detectionResult = await detectProductCategory(file);
        
        const optionsMessage: ChatMessage = {
            id: `options_${Date.now()}`,
            role: 'assistant',
            text: `Great! I see you've uploaded a photo of ${detectionResult.description}. What kind of scene would you like to create for it? Here are some ideas:`,
            options: {
                productCategory: detectionResult.category,
                productDescription: detectionResult.description,
            }
        };
        setMessages(prev => [...prev, optionsMessage]);

      } catch (error) {
        console.error("Failed to detect category:", error);
         const errorMessage: ChatMessage = {
            id: `err_detect_${Date.now()}`,
            role: 'assistant',
            text: "Sorry, I couldn't analyze that image. Please try another one."
        };
        setMessages(prev => [...prev, errorMessage]);
        setUploadedFile(null);
      } finally {
        setIsDetectingCategory(false);
      }
    }
  }, []);
  
  const handleSelectImageForChat = useCallback((image: GeneratedImage) => {
    setSelectedImageForChat(image);
    setUploadedFile(null);
  }, []);

  const handleClearSelectedImage = useCallback(() => {
    setSelectedImageForChat(null);
  }, []);
  
  const handleCancelGeneration = () => {
    isCancellingRef.current = true;
  };

  const handleSend = useCallback(async (prompt: string) => {
    if (!prompt.trim() && !selectedImageForChat) return;

    if (selectedImageForChat) {
      const imageToRefine = selectedImageForChat;
      
      const userMessage: ChatMessage = {
        id: `user_refine_chat_${Date.now()}`,
        role: 'user',
        text: prompt,
        images: [{id: imageToRefine.id, src: imageToRefine.src}],
      };

      const loadingMessage: ChatMessage = {
        id: `loading_refine_chat_${Date.now()}`,
        role: 'assistant',
        isLoading: true,
      };
      
      setMessages(prev => [...prev, userMessage, loadingMessage]);
      setSelectedImageForChat(null);

      try {
        const newImage = await refineLifestyleImage(imageToRefine.src, prompt);
        const assistantMessage: ChatMessage = {
          id: `asst_refine_chat_${Date.now()}`,
          role: 'assistant',
          text: "Here is the refined image:",
          images: [newImage],
        };
        setMessages(prev => prev.filter(m => m.id !== loadingMessage.id).concat(assistantMessage));
      } catch (err) {
        console.error(err);
        const errorMessage: ChatMessage = {
          id: `err_refine_chat_${Date.now()}`,
          role: 'assistant',
          text: err instanceof Error ? `Sorry, I ran into an error: ${err.message}` : 'An unknown error occurred. Please try again.',
        };
        setMessages(prev => prev.filter(m => m.id !== loadingMessage.id).concat(errorMessage));
      }
      return;
    }
    
    if (prompt.trim()) {
        const userMessage: ChatMessage = {
          id: `user_${Date.now()}`,
          role: 'user',
          text: prompt,
        };
        const assistantMessage: ChatMessage = {
            id: `err_no_context_${Date.now()}`,
            role: 'assistant',
            text: "Please upload a product photo to get started.",
        };
        setMessages(prev => [...prev, userMessage, assistantMessage]);
    }
  }, [selectedImageForChat]);

  const handleGenerateFromOptions = useCallback(async (payload: GenerationPayload) => {
      if (!uploadedFile) {
        setMessages(prev => [...prev, {
            id: `err_no_file_${Date.now()}`,
            role: 'assistant',
            text: "It seems the original product image was lost. Please upload it again to continue.",
        }]);
        return;
      }
      
      isCancellingRef.current = false;
      const { prompt, count, logoFile, aspectRatio } = payload;
      const currentFile = uploadedFile;

      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        text: prompt,
      };
      setMessages(prev => [...prev, userMessage]);
      
      setUploadedFile(null);
        
      const loadingMessageId = `loading_${Date.now()}`;
      const loadingMessage: ChatMessage = {
        id: loadingMessageId,
        role: 'assistant',
        isLoading: true,
        imageCount: count,
        text: `Preparing to generate ${count} image${count > 1 ? 's' : ''}...`
      };
      setMessages(prev => [...prev, loadingMessage]);
        
      const successfulImages: GeneratedImage[] = [];
      const failedReasons: string[] = [];

      for (let i = 0; i < count; i++) {
        if (isCancellingRef.current) {
            break;
        }
        try {
          setMessages(prev => prev.map(m => 
            m.id === loadingMessageId ? { ...m, text: `Generating image ${i + 1} of ${count}...` } : m
          ));
          
          const newImage = await generateLifestyleImage(currentFile, prompt, null, logoFile, aspectRatio);
          successfulImages.push(newImage);
        } catch (err) {
          const reason = err instanceof Error ? err.message.replace('Error: ', '') : String(err);
          failedReasons.push(reason);
        }
        
        if (i < count - 1) {
          await sleep(1000); 
        }
      }

      const wasCancelled = isCancellingRef.current;
      isCancellingRef.current = false;

      setMessages(prev => {
        const currentMessages = prev.filter(m => m.id !== loadingMessageId);
        const newMessages: ChatMessage[] = [];

        if (wasCancelled) {
             newMessages.push({
                id: `cancel_${Date.now()}`,
                role: 'assistant',
                text: `Image generation cancelled. ${successfulImages.length} image(s) were created before stopping.`
             });
        }
      
        if (successfulImages.length > 0) {
          let successText = "Here's the lifestyle image you requested.";
           if (count > 1 && !wasCancelled) {
            if (failedReasons.length > 0) {
              successText = `Successfully generated ${successfulImages.length} of the ${count} images you requested.`;
            } else {
              successText = `Here are the ${count} lifestyle images you requested.`;
            }
          }
          newMessages.push({
            id: `asst_${Date.now()}`,
            role: 'assistant',
            text: successText,
            images: successfulImages,
          });
        }

        if (failedReasons.length > 0) {
          const uniqueReasons = [...new Set(failedReasons)];
          newMessages.push({
            id: `err_${Date.now()}`,
            role: 'assistant',
            text: `Sorry, I couldn't generate ${failedReasons.length} image${failedReasons.length > 1 ? 's' : ''}. Common reason(s): ${uniqueReasons.join('; ')}`,
          });
        }
        
        return [...currentMessages, ...newMessages];
      });
  }, [uploadedFile]);

  const handleRefine = useCallback(async (image: GeneratedImage, prompt: string) => {
    const userMessage: ChatMessage = {
      id: `user_refine_${Date.now()}`,
      role: 'user',
      text: `Quick Refine: ${prompt}`,
    };
     const loadingMessage: ChatMessage = {
      id: `loading_refine_${Date.now()}`,
      role: 'assistant',
      isLoading: true,
    };
    setMessages(prev => [...prev, userMessage, loadingMessage]);

    try {
      const newImage = await refineLifestyleImage(image.src, prompt);
      const assistantMessage: ChatMessage = {
        id: `asst_refine_${Date.now()}`,
        role: 'assistant',
        text: "Here's the refined image:",
        images: [newImage],
      };
      setMessages(prev => prev.filter(m => m.id !== loadingMessage.id).concat(assistantMessage));
    } catch (err) {
      console.error(err);
      const errorMessage: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        text: err instanceof Error ? `Sorry, I ran into an error: ${err.message}` : 'An unknown error occurred. Please try again.',
      };
      setMessages(prev => prev.filter(m => m.id !== loadingMessage.id).concat(errorMessage));
    }
  }, []);

  const handleStartEdit = (image: GeneratedImage) => setEditingImage(image);
  const handleCancelEdit = () => setEditingImage(null);

  const handleFinalImageSave = (finalImageDataUrl: string) => {
    setEditingImage(null);

    const userMessage: ChatMessage = {
      id: `user_edit_save_${Date.now()}`,
      role: 'user',
      text: `Saved the final version of the edited image.`,
    };
    
    const assistantMessage: ChatMessage = {
      id: `asst_edit_save_${Date.now()}`,
      role: 'assistant',
      text: "Here is your final edited masterpiece:",
      images: [{ id: `edited_${Date.now()}`, src: finalImageDataUrl }],
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
  };

  const handleStartUpscale = (image: GeneratedImage) => setUpscalingImage(image);
  const handleCancelUpscale = () => setUpscalingImage(null);

  const handleFinalUpscaleSave = (finalImageDataUrl: string, sourceImageId: string) => {
    setUpscalingImage(null);

    const assistantMessage: ChatMessage = {
      id: `asst_upscale_${Date.now()}`,
      role: 'assistant',
      text: "Here is the high-resolution upscaled image:",
      images: [{ id: `upscaled_${sourceImageId}`, src: finalImageDataUrl }],
    };

    setMessages(prev => [...prev, assistantMessage]);
  };


  return (
    <>
      <div className="min-h-screen bg-dark-bg text-dark-text-primary font-sans flex flex-col h-screen">
        <main ref={mainRef} className="flex-1 flex flex-col overflow-y-auto">
          {messages.length === 0 ? (
            <WelcomeScreen onPromptSelect={handleSend} />
          ) : (
            <ChatFeed messages={messages} onRefine={handleRefine} onStartEdit={handleStartEdit} onStartUpscale={handleStartUpscale} onSelectForChat={handleSelectImageForChat} onGenerate={handleGenerateFromOptions} onCancelGeneration={handleCancelGeneration} />
          )}
        </main>
        
        <footer className="bg-transparent sticky bottom-0">
          <div className="container mx-auto px-4 py-3 md:py-6">
            {isDetectingCategory && (
              <div className="max-w-3xl mx-auto mb-2 animate-fade-in">
                <p className="text-center text-sm font-semibold text-dark-text-secondary animate-pulse">Analyzing product...</p>
              </div>
            )}
            <ChatInput 
              onSend={handleSend} 
              onFileSelect={handleFileSelect}
              selectedImage={selectedImageForChat}
              onClearSelectedImage={handleClearSelectedImage}
            />
          </div>
        </footer>
      </div>
      {editingImage && (
        <ImageEditor 
          image={editingImage}
          onSave={handleFinalImageSave}
          onCancel={handleCancelEdit}
        />
      )}
      {upscalingImage && (
        <ImageUpscaler
          image={upscalingImage}
          onSave={handleFinalUpscaleSave}
          onCancel={handleCancelUpscale}
        />
      )}
    </>
  );
};

export default App;
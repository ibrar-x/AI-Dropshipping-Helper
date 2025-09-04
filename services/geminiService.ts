

import { GoogleGenAI, Modality, Type, Chat, Content } from "@google/genai";
import { dataURLtoBase64, getImageDimensions, ensureSupportedImageFormat, createThumbnail } from "../utils/imageUtils";
import { ProductCategory, SelectionAnalysis, EditType, DetectionResult, UpscaleOptions, CreativeOptions, GeneratedImage, Prompts, AdBrief } from "../types";
import { defaultPrompts } from "../prompts";

let ai: GoogleGenAI | null = null;
let activePrompts: Prompts = defaultPrompts;
const imageModel = 'gemini-2.5-flash-image-preview';
const textModel = 'gemini-2.5-flash';

export const initializeAi = (apiKey: string, newPrompts?: Prompts) => {
    if (!apiKey) {
        ai = null;
        console.warn("AI Service not initialized: API key is missing.");
        return;
    }
    ai = new GoogleGenAI({ apiKey });
    if (newPrompts) {
        activePrompts = newPrompts;
    }
};

const getClient = (): GoogleGenAI => {
    if (!ai) {
        throw new Error("AI client is not initialized. Please set your API key in settings.");
    }
    return ai;
};

// Define a type for the parts for clarity
type ImagePart = { inlineData: { data: string; mimeType: string; } };
type TextPart = { text: string };
type ContentPart = ImagePart | TextPart;

async function generateImageFromParts(parts: ContentPart[], errorContext: string = 'Image generation'): Promise<GeneratedImage> {
    const client = getClient();
    try {
        const response = await client.models.generateContent({
            model: imageModel,
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const candidate = response.candidates?.[0];
        const imagePart = candidate?.content?.parts?.find(part => part.inlineData);

        if (imagePart?.inlineData) {
            const src = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
            const thumbnailSrc = await createThumbnail(src, 256, 256).catch(err => {
                console.warn("Could not create thumbnail for generated image:", err);
                return undefined; // Fallback to undefined if thumbnail fails
            });
            return {
                id: `gen_${Date.now()}`,
                src,
                thumbnailSrc,
            };
        } else {
            // No image was returned. Let's investigate the reason.
            const finishReason = candidate?.finishReason;
            const safetyRatings = candidate?.safetyRatings;

            // Check for safety blocks first
            if (finishReason === 'SAFETY' || safetyRatings?.some(r => r.blocked)) {
                const blockedCategories = safetyRatings?.filter(r => r.blocked).map(r => r.category.replace('HARM_CATEGORY_', '')).join(', ');
                const message = `Image generation blocked due to safety policies${blockedCategories ? `: ${blockedCategories}` : ''}. Please modify your prompt.`;
                console.warn('Safety block:', { finishReason, safetyRatings });
                throw new Error(message);
            }
            
            // Check if the model responded with text instead
            const textPart = candidate?.content?.parts?.find(p => p.text);
            if (textPart?.text) {
                console.error(`${errorContext} returned text instead of an image:`, textPart.text);
                // The model might explain why it couldn't generate the image. This is a valuable error message.
                throw new Error(`The AI gave a text response instead of an image: "${textPart.text}"`);
            }

            // Fallback for other errors
            console.error('Image generation failed for an unknown reason. Full response:', response);
            let errorMessage = `${errorContext} failed to produce an image.`;
            if (finishReason && finishReason !== 'STOP') {
                errorMessage += ` The process ended unexpectedly (Reason: ${finishReason}). Please try again.`;
            } else if (!candidate) {
                errorMessage += ` The model did not provide a response. This could be a connection issue or an API problem.`;
            }
            else {
                errorMessage += ` No image data was found in the response. Please try rewriting your prompt.`;
            }
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error(`Failed during: ${errorContext}`, error);
        if (error instanceof Error) throw error;
        throw new Error(`An unexpected error occurred during ${errorContext}.`);
    }
}


export async function removeBackground(base64Image: string, mimeType: string): Promise<GeneratedImage> {
    const errorContext = 'Background removal';
    const client = getClient();
    try {
        const response = await client.models.generateContent({
            model: imageModel,
            contents: {
                parts: [
                    { inlineData: { data: base64Image, mimeType } },
                    { text: activePrompts.removeBackground },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const candidate = response.candidates?.[0];
        
        const safetyFeedback = candidate?.safetyRatings;
        if (safetyFeedback?.some(r => r.blocked)) {
            console.warn(`Safety feedback for ${errorContext}:`, safetyFeedback);
            const blockedReason = safetyFeedback.find(r => r.blocked)?.category;
            throw new Error(`Request blocked for safety reasons: ${blockedReason}.`);
        }

        const imagePart = candidate?.content?.parts?.find(part => part.inlineData);
        if (imagePart?.inlineData) {
            const src = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
            const thumbnailSrc = await createThumbnail(src, 256, 256);
            return { id: `bg_removed_${Date.now()}`, src, thumbnailSrc };
        }

        // If no image, check for a text response for better error reporting
        const textPart = candidate?.content?.parts?.find(p => p.text);
        if (textPart?.text) {
            console.error(`${errorContext} returned text instead of an image:`, textPart.text);
            throw new Error(`${errorContext} failed. The model responded with: "${textPart.text}"`);
        }
        
        throw new Error(`${errorContext} failed: No image data was found in the response.`);
    } catch (error) {
        console.error(`${errorContext} error:`, error);
        if (error instanceof Error) {
            // Re-throw the specific error from the try block for better user feedback
            throw new Error(`Could not remove background. Reason: ${error.message}`);
        }
        throw new Error('An unexpected error occurred while removing the background.');
    }
}

export async function* generateTextStream(prompt: string, systemInstruction: string) {
    if (!prompt.trim()) return;
    const client = getClient();
    try {
        const response = await client.models.generateContentStream({
            model: textModel,
            contents: prompt,
            config: { systemInstruction }
        });
        for await (const chunk of response) {
            yield chunk.text;
        }
    } catch (error) {
        console.error("Text stream error:", error);
        if (error instanceof Error) {
            yield `Error: ${error.message}`;
        } else {
            yield "An unknown error occurred while generating the response.";
        }
    }
}

export const analyzeSelection = async (
    baseImageDataUrl: string,
    maskDataUrl: string,
    highlightDataUrl: string,
): Promise<SelectionAnalysis> => {
    const client = getClient();
    const { base64: baseImageBase64, mimeType: baseImageMimeType } = dataURLtoBase64(baseImageDataUrl);
    const { base64: maskImageBase64 } = dataURLtoBase64(maskDataUrl);
    const { base64: highlightImageBase64, mimeType: highlightImageMimeType } = dataURLtoBase64(highlightDataUrl);

    try {
        const response = await client.models.generateContent({
            model: textModel,
            contents: {
                parts: [
                    { inlineData: { data: baseImageBase64, mimeType: baseImageMimeType } },
                    { inlineData: { data: maskImageBase64, mimeType: 'image/png' } },
                    { inlineData: { data: highlightImageBase64, mimeType: highlightImageMimeType } },
                    { text: "Analyze the highlighted selection in the image." },
                ]
            },
            config: {
                systemInstruction: activePrompts.analyzeSelection,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        selection_summary: { type: Type.STRING },
                        suggested_actions: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['selection_summary', 'suggested_actions']
                }
            }
        });
        return JSON.parse(response.text) as SelectionAnalysis;
    } catch (error) {
        console.error("Selection analysis error:", error);
        throw new Error(error instanceof Error ? error.message : 'Failed to analyze selection.');
    }
};

export const detectProductCategory = async (file: File): Promise<DetectionResult> => {
    const client = getClient();
    const { base64, mimeType } = await ensureSupportedImageFormat(file);
    try {
        const response = await client.models.generateContent({
            model: textModel,
            contents: {
                parts: [
                    { inlineData: { data: base64, mimeType } },
                    { text: activePrompts.detectProductCategory },
                ]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        category: { type: Type.STRING, enum: Object.values(ProductCategory) },
                        description: { type: Type.STRING, description: "A short, specific description of the product in the image." }
                    },
                    required: ['category', 'description']
                }
            }
        });
        const jsonResponse = JSON.parse(response.text);
        const { category, description } = jsonResponse;

        if (Object.values(ProductCategory).includes(category) && description) {
            return { category, description };
        }
        
        console.warn(`Unexpected response from category detection.`, jsonResponse);
        return { category: ProductCategory.HOME_GOODS, description: 'product' };
    } catch (error) {
        console.error("Category detection error:", error);
        return { category: ProductCategory.HOME_GOODS, description: 'product' }; // Return a safe default on error
    }
};

const adBriefPrefillSchema = {
    type: Type.OBJECT,
    properties: {
        product: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                category: { type: Type.STRING },
                features: { type: Type.STRING },
                benefits: { type: Type.STRING },
            }
        },
        targetAudience: {
            type: Type.OBJECT,
            properties: {
                types: { type: Type.ARRAY, items: { type: Type.STRING } },
            }
        },
        tone: {
            type: Type.OBJECT,
            properties: {
                primary: { type: Type.STRING },
                secondary: { type: Type.STRING },
            }
        },
        visuals: {
            type: Type.OBJECT,
            properties: {
                style: { type: Type.STRING },
            }
        }
    }
};

export const prefillAdBriefFromImage = async (file: File): Promise<Partial<AdBrief>> => {
    const client = getClient();
    const { base64, mimeType } = await ensureSupportedImageFormat(file);
    try {
        const response = await client.models.generateContent({
            model: textModel,
            contents: {
                parts: [
                    { inlineData: { data: base64, mimeType } },
                    { text: "Analyze the product and generate a marketing brief." },
                ]
            },
            config: {
                systemInstruction: activePrompts.prefillAdBrief,
                responseMimeType: 'application/json',
                responseSchema: adBriefPrefillSchema,
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as Partial<AdBrief>;
    } catch (error) {
        console.error("Ad Brief prefill error:", error);
        return {};
    }
};

const adBriefSchema = {
    type: Type.OBJECT,
    properties: {
        platforms: { type: Type.ARRAY, items: { type: Type.STRING } },
        campaignGoal: { type: Type.STRING },
        targetAudience: {
            type: Type.OBJECT,
            properties: {
                types: { type: Type.ARRAY, items: { type: Type.STRING } },
                painPoints: { type: Type.STRING },
                desires: { type: Type.STRING },
                objections: { type: Type.STRING },
                custom: { type: Type.STRING },
            }
        },
        product: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                category: { type: Type.STRING },
                features: { type: Type.STRING },
                benefits: { type: Type.STRING },
                usp: { type: Type.STRING },
                price: { type: Type.STRING },
                offer: { type: Type.STRING },
                proof: { type: Type.STRING },
            }
        },
        tone: {
            type: Type.OBJECT,
            properties: {
                primary: { type: Type.STRING },
                secondary: { type: Type.STRING },
            }
        },
        structure: { type: Type.ARRAY, items: { type: Type.STRING } },
        compliance: {
            type: Type.OBJECT,
            properties: {
                region: { type: Type.STRING },
                wordsToAvoid: { type: Type.STRING },
                mustInclude: { type: Type.STRING },
                charLimits: { type: Type.STRING },
            }
        },
        visuals: {
            type: Type.OBJECT,
            properties: {
                hasImages: { type: Type.BOOLEAN },
                needsPrompts: { type: Type.BOOLEAN },
                style: { type: Type.STRING },
                palette: { type: Type.STRING },
                onImageText: { type: Type.STRING },
            }
        }
    }
};

export const autocompleteAdBrief = async (partialBrief: Partial<AdBrief>): Promise<Partial<AdBrief>> => {
    const client = getClient();
    const prompt = `Here is the partial ad brief, please complete it:\n\n${JSON.stringify(partialBrief, null, 2)}`;
    try {
        const response = await client.models.generateContent({
            model: textModel,
            contents: prompt,
            config: {
                systemInstruction: activePrompts.autocompleteAdBrief,
                responseMimeType: 'application/json',
                responseSchema: adBriefSchema,
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as Partial<AdBrief>;
    } catch (error) {
        console.error("Ad Brief autocomplete error:", error);
        // Throw the error so the UI can handle it
        throw new Error(error instanceof Error ? `AI Autocomplete Failed: ${error.message}` : 'An unknown error occurred during autocomplete.');
    }
};


export const generateCreativeOptions = async (file: File): Promise<CreativeOptions> => {
    const client = getClient();
    const { base64, mimeType } = await ensureSupportedImageFormat(file);

    try {
        const response = await client.models.generateContent({
            model: textModel,
            contents: {
                parts: [
                    { inlineData: { data: base64, mimeType } },
                    { text: "Generate creative ideas for this product." },
                ]
            },
            config: {
                systemInstruction: activePrompts.generateCreativeOptions,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        Style: { type: Type.ARRAY, items: { type: Type.STRING } },
                        Setting: { type: Type.ARRAY, items: { type: Type.STRING } },
                        Vibe: { type: Type.ARRAY, items: { type: Type.STRING } },
                        Props: { type: Type.ARRAY, items: { type: Type.STRING } },
                        'Camera Angle': { type: Type.ARRAY, items: { type: Type.STRING } },
                        'Lens & Focus': { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ['Style', 'Setting', 'Vibe', 'Props', 'Camera Angle', 'Lens & Focus']
                }
            }
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Creative options generation error:", error);
        // Fallback to static options
        return {
            Style: ['Hyperrealistic Photo', 'Clean Studio Shot', 'Moody & Dramatic', 'Commercial Look'],
            Setting: ['On a table', 'On a shelf', 'In a living room', 'Minimalist background'],
            Vibe: ['Bright & Airy', 'Natural Sunlight', 'Elegant & Modern', 'Cozy & Warm'],
            Props: ['with a coffee cup', 'with a notebook', 'with plants', 'other related gadgets'],
            'Camera Angle': ['Eye-level shot', 'Low-angle shot', 'High-angle shot', 'Dutch angle'],
            'Lens & Focus': ['50mm lens, f/1.8', '85mm lens, shallow depth of field', '35mm lens, deep focus', 'Macro shot'],
        };
    }
};

export const generateStudioBackground = async (imageDataUrl: string): Promise<GeneratedImage> => {
    const { base64, mimeType } = dataURLtoBase64(imageDataUrl);
    
    const parts: ContentPart[] = [
        { inlineData: { data: base64, mimeType } },
        { text: activePrompts.generateStudioBackground }
    ];

    return generateImageFromParts(parts, 'Studio background generation');
};


export const refineLifestyleImage = async (
    imageDataUrl: string,
    prompt: string,
): Promise<GeneratedImage> => {
    const { base64, mimeType } = dataURLtoBase64(imageDataUrl);
    
    const fullPrompt = activePrompts.refineLifestyle.replace('{prompt}', prompt);
    
    const parts: ContentPart[] = [
        { inlineData: { data: base64, mimeType } },
        { text: fullPrompt }
    ];

    return generateImageFromParts(parts, 'Image refinement');
};

export const editImageWithMask = async (
    imageDataUrl: string,
    maskDataUrl: string,
    highlightDataUrl: string,
    prompt: string,
    referenceImages?: File[]
): Promise<GeneratedImage> => {
    const { base64: baseImageBase64, mimeType: baseImageMimeType } = dataURLtoBase64(imageDataUrl);
    const { base64: maskImageBase64 } = dataURLtoBase64(maskDataUrl);
    const { base64: highlightImageBase64, mimeType: highlightImageMimeType } = dataURLtoBase64(highlightDataUrl);

    const fullPrompt = activePrompts.editImageWithMask.replace('{prompt}', prompt);
    
    const parts: ContentPart[] = [
        { inlineData: { data: baseImageBase64, mimeType: baseImageMimeType } },
        { inlineData: { data: maskImageBase64, mimeType: 'image/png' } },
        { inlineData: { data: highlightImageBase64, mimeType: highlightImageMimeType } },
    ];

    if (referenceImages && referenceImages.length > 0) {
        parts.push({ text: "Use the following image(s) as a style and content reference for the edit:" });
        for (const file of referenceImages) {
            const { base64, mimeType } = await ensureSupportedImageFormat(file);
            parts.push({ inlineData: { data: base64, mimeType } });
        }
    }
    
    parts.push({ text: fullPrompt });
    
    return generateImageFromParts(parts, `Image editing`);
};


export const upscaleImage = async (
    imageDataUrl: string,
    options: UpscaleOptions,
): Promise<GeneratedImage> => {
    const { base64, mimeType } = dataURLtoBase64(imageDataUrl);
    const { factor, profile, removeArtifacts, preserveFaces, enhanceDetails } = options;

    let prompt = activePrompts.upscaleImage
        .replace('{factor}', factor.toString())
        .replace('{profile}', profile)
        .replace('{removeArtifacts}', removeArtifacts ? 'Enabled (JPEG ringing, banding, aliasing)' : 'Disabled')
        .replace('{preserveFaces}', preserveFaces ? 'Enabled (High-fidelity face restoration)' : 'Disabled')
        .replace('{enhanceDetails}', enhanceDetails ? 'Enabled (Subtly add plausible micro-details)' : 'Disabled');
    
    const parts: ContentPart[] = [
        { inlineData: { data: base64, mimeType } },
        { text: prompt }
    ];

    return generateImageFromParts(parts, 'Image upscaling');
};

export async function* enhancePromptStream(prompt: string, systemInstruction: string) {
    yield* generateTextStream(`Enhance this: "${prompt}"`, systemInstruction);
}

export const generateAdImage = async (prompt: string, aspectRatio: string, numberOfImages: number, referenceInputs?: (File | {dataUrl: string})[]): Promise<GeneratedImage[]> => {
    const client = getClient();
    try {
        const parts: ContentPart[] = [{ text: prompt }];
        if (referenceInputs) {
            for (const input of referenceInputs) {
                let base64: string, mimeType: string;
                if ('dataUrl' in input) {
                    const d = dataURLtoBase64(input.dataUrl);
                    base64 = d.base64;
                    mimeType = d.mimeType;
                } else { // it's a File
                    const d = await ensureSupportedImageFormat(input);
                    base64 = d.base64;
                    mimeType = d.mimeType;
                }
                parts.unshift({ inlineData: { data: base64, mimeType } });
            }
        }
        
        const modelToUse = (referenceInputs && referenceInputs.length > 0) ? imageModel : 'imagen-4.0-generate-001';

        if (modelToUse === 'imagen-4.0-generate-001') {
            const response = await client.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: prompt,
                config: {
                    numberOfImages: numberOfImages,
                    outputMimeType: 'image/png',
                    aspectRatio: aspectRatio as "1:1" | "16:9" | "9:16" | "4:3" | "3:4",
                },
            });

            if (response.generatedImages && response.generatedImages.length > 0) {
                const imagePromises = response.generatedImages.map(async (genImg, index) => {
                    const base64ImageBytes: string = genImg.image.imageBytes;
                    const src = `data:image/png;base64,${base64ImageBytes}`;
                    const thumbnailSrc = await createThumbnail(src, 256, 256);
                    return { id: `gen_ad_${Date.now()}_${index}`, src, thumbnailSrc };
                });
                return Promise.all(imagePromises);
            }
        } else { // Fallback to gemini-2.5-flash-image-preview
             const images: GeneratedImage[] = [];
             for (let i = 0; i < numberOfImages; i++) {
                 const image = await generateImageFromParts(parts, `Ad image generation #${i + 1}`);
                 images.push(image);
             }
             return images;
        }
        
        throw new Error('Image generation failed to produce an image. This might be due to safety filters.');

    } catch (error) {
        console.error(`Failed during: Ad image generation`, error);
        if (error instanceof Error) throw error;
        throw new Error(`An unexpected error occurred during Ad image generation.`);
    }
};

export const blendImages = async (
    compositeImageDataUrl: string,
    prompt: string,
): Promise<GeneratedImage> => {
    const { base64, mimeType } = dataURLtoBase64(compositeImageDataUrl);
    
    const fullPrompt = `You are an expert AI image editor. You are provided with a composite image containing multiple elements arranged by a user. Your task is to blend these elements into a single, new, cohesive, and photorealistic scene based on the following instruction: "${prompt}". The final image should be a creative interpretation that honors the user's composition and prompt. Your entire response must be ONLY the final image data. Do not include any text, explanation, or conversational filler.`;
    
    const parts: ContentPart[] = [
        { inlineData: { data: base64, mimeType } },
        { text: fullPrompt }
    ];

    return generateImageFromParts(parts, 'Image blending');
};

export const removeLogoBackground = async (logoFile: File): Promise<string> => {
    const { base64, mimeType } = await ensureSupportedImageFormat(logoFile);
    const result = await removeBackground(base64, mimeType);
    return result.src;
};


export const generateImageAdPrompt = async (brief: Pick<AdBrief, 'visuals' | 'product'>, imageFile?: File): Promise<string> => {
    const client = getClient();
    const briefText = `Generate a prompt for the following ad brief:\n${JSON.stringify(brief, null, 2)}`;
    
    const parts: ContentPart[] = [{ text: briefText }];

    if (imageFile) {
        const { base64, mimeType } = await ensureSupportedImageFormat(imageFile);
        parts.unshift({ inlineData: { data: base64, mimeType } });
    }

    try {
        const response = await client.models.generateContent({
            model: textModel,
            contents: { parts },
            config: {
                systemInstruction: activePrompts.generateImageAdPrompt
            }
        });
        return response.text.trim();
    } catch (error) {
        console.error("Image ad prompt generation error:", error);
        throw new Error(error instanceof Error ? `Failed to generate image prompt: ${error.message}` : 'Unknown error during prompt generation.');
    }
};

export function generateAdCopy(brief: AdBrief) {
    const briefText = JSON.stringify(brief, null, 2);
    return generateTextStream(briefText, activePrompts.generateAdCopy);
}

export const suggestVisualPrompts = async (imageFile: File, count: number): Promise<string[]> => {
    const client = getClient();
    try {
        const { base64, mimeType } = await ensureSupportedImageFormat(imageFile);
        
        const dynamicSystemInstruction = `You are a world-class creative director for e-commerce brands. The user has provided an image of their product with a transparent background.
Your task is to generate ${count} distinct, creative, and compelling text-to-image prompt ideas for a lifestyle or ad photoshoot featuring this product.
The prompts should be diverse, covering different styles (e.g., minimalist, rustic, modern, vibrant).
Your entire response MUST be a single, valid JSON object with a single key "suggestions", which is an array of strings.`;

        const response = await client.models.generateContent({
            model: textModel,
            contents: {
                parts: [
                    { inlineData: { data: base64, mimeType } },
                    { text: `Suggest ${count} creative visual prompts for this product.` }
                ]
            },
            config: {
                systemInstruction: dynamicSystemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestions: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ['suggestions']
                }
            }
        });
        const jsonResponse = JSON.parse(response.text);
        if (jsonResponse.suggestions && Array.isArray(jsonResponse.suggestions)) {
            return jsonResponse.suggestions;
        }
        return [];
    } catch (error) {
        console.error("Visual prompt suggestion error:", error);
        return []; // Return empty array on error
    }
};

export const editLogo = async (logoFile: File, prompt: string): Promise<string> => {
    const { base64, mimeType } = await ensureSupportedImageFormat(logoFile);
    
    const parts: ContentPart[] = [
        { inlineData: { data: base64, mimeType } },
        { text: `${activePrompts.editLogo}\n\nInstruction: "${prompt}"` }
    ];

    const result = await generateImageFromParts(parts, 'Logo editing');
    return result.src;
};

export function generatePlatformContentStream(platform: string, brief: AdBrief, userPrompt: string) {
    const briefText = `PRODUCT BRIEF:\n${JSON.stringify(brief.product, null, 2)}\n\nUSER REQUEST FOR ${platform}:\n${userPrompt}`;
    return generateTextStream(briefText, activePrompts.generatePlatformContent);
}
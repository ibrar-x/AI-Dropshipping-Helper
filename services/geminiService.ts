import { GoogleGenAI, Modality, Type } from "@google/genai";
import { fileToBase64, dataURLtoBase64, getImageDimensions } from "../utils/imageUtils";
import { ProductCategory, StructuredEditJob, EditType, DetectionResult, UpscaleOptions } from "../types";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const imageModel = 'gemini-2.5-flash-image-preview';
const textModel = 'gemini-2.5-flash';

// Define a type for the parts for clarity
type ImagePart = { inlineData: { data: string; mimeType: string; } };
type TextPart = { text: string };
type ContentPart = ImagePart | TextPart;

async function generateImageFromParts(parts: ContentPart[], errorContext: string = 'Image generation'): Promise<{ id: string, src: string }> {
    try {
        const response = await ai.models.generateContent({
            model: imageModel,
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
        if (imagePart?.inlineData) {
            return {
                id: `gen_${Date.now()}`,
                src: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
            };
        } else {
            const safetyFeedback = response.candidates?.[0]?.safetyRatings;
             if (safetyFeedback?.some(r => r.blocked)) {
                console.warn('Safety feedback:', safetyFeedback);
                const blockedReason = safetyFeedback.find(r => r.blocked)?.category;
                 throw new Error(`Request blocked for safety reasons: ${blockedReason}. Please adjust your prompt.`);
            }
            throw new Error(`${errorContext} failed to return an image.`);
        }
    } catch (error) {
        console.error(`Failed during: ${errorContext}`, error);
        if (error instanceof Error) throw error;
        throw new Error(`An unexpected error occurred during ${errorContext}.`);
    }
}


async function removeBackground(base64Image: string, mimeType: string): Promise<string> {
    try {
        const response = await ai.models.generateContent({
            model: imageModel,
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: 'Task: Remove background. The output must be a PNG image of the main subject with a transparent background.',
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
        if (!imagePart || !imagePart.inlineData) {
            throw new Error('Background removal failed: No image data returned.');
        }
        return imagePart.inlineData.data;
    } catch (error) {
        console.error("Background removal error:", error);
        if (error instanceof Error && error.message.includes('SAFETY')) {
            throw new Error('Background removal was blocked due to safety policies.');
        }
        throw new Error('Could not remove background from image.');
    }
}

export const enhancePrompt = async (prompt: string): Promise<string> => {
    if (!prompt.trim()) return prompt;
    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: prompt,
            config: {
                systemInstruction: "You are a creative assistant that expands upon user prompts for an AI image generator. Rewrite the following prompt to be more descriptive, vivid, and detailed, focusing on creating a photorealistic, high-quality image. Only return the enhanced prompt text, without any preamble."
            }
        });
        return response.text.trim();
    } catch (error) {
        console.error("Prompt enhancement error:", error);
        return prompt; // Return original prompt on error
    }
};

export const analyzeEditIntent = async (userPrompt: string): Promise<StructuredEditJob> => {
    const systemInstruction = `You are an Image Edit Orchestrator assistant. Your task is to analyze a user's natural language request for an image edit and convert it into a structured JSON command for an AI image generation model.

You must classify the user's intent into one of the following categories:
- 'inpaint': For removing an object, filling a scratch, or general context-aware fill.
- 'recolor': For changing the color or material hue of an object while preserving its texture and shape.
- 'replace': For swapping the texture or material of an object with something completely different.
- 'relight': For adjusting the lighting, shadows, or mood.
- 'add_object': For inserting a new, distinct object into the scene.

Based on the user's request, you must also generate a concise, direct 'model_prompt' that instructs the image model on what to do within the masked region.

Example 1:
User request: "get rid of this tag"
Your JSON output: {"edit_type": "inpaint", "model_prompt": "remove the tag from the object"}

Example 2:
User request: "make the sofa velvet red"
Your JSON output: {"edit_type": "recolor", "model_prompt": "change the color of the sofa to velvet red"}

Example 3:
User request: "change this wooden table to have a marble texture"
Your JSON output: {"edit_type": "replace", "model_prompt": "replace the texture of the table with white marble with gray veins"}

Example 4:
User request: "add a golden retriever puppy here"
Your JSON output: {"edit_type": "add_object", "model_prompt": "add a small, photorealistic golden retriever puppy"}

Now, analyze the user's request provided.`;

    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: userPrompt,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        edit_type: { type: Type.STRING, enum: ['inpaint', 'recolor', 'replace', 'relight', 'add_object'] },
                        model_prompt: { type: Type.STRING }
                    },
                    required: ['edit_type', 'model_prompt']
                }
            }
        });
        const jsonResponse = JSON.parse(response.text);
        return jsonResponse as StructuredEditJob;

    } catch (error) {
        console.error("Edit intent analysis error:", error);
        // Fallback to a generic inpaint prompt
        return {
            edit_type: 'inpaint',
            model_prompt: userPrompt
        };
    }
};

export const detectProductCategory = async (file: File): Promise<DetectionResult> => {
    const { base64, mimeType } = await fileToBase64(file);
    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: {
                parts: [
                    { inlineData: { data: base64, mimeType } },
                    { text: `Analyze the product in this image. First, provide a short, specific description of the item (e.g., 'a pair of black wireless headphones', 'a blue ceramic mug'). Then, classify it into ONE of the following categories: 'Clothing', 'Home Goods', 'Gadgets'. Respond with a JSON object with "category" and "description" keys.` },
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

export const generateLifestyleImage = async (
    productFile: File,
    prompt: string,
    vibeFile?: File | null,
    logoFile?: File | null,
    aspectRatio?: string,
): Promise<{ id: string, src: string }> => {
    const { base64: productBase64, mimeType: productMimeType } = await fileToBase64(productFile);
    const noBgBase64 = await removeBackground(productBase64, productMimeType);

    const parts: ContentPart[] = [];
    parts.push({
        inlineData: { data: noBgBase64, mimeType: 'image/png' }
    });

    let fullPrompt = `Place this first product image (with a transparent background) into a new scene. IMPORTANT: The product itself (from the first image) must not be altered in any way—its design, color, and shape must remain identical. The new scene should be based on this prompt: "${prompt}".`;

    if (vibeFile) {
        const { base64: vibeBase64, mimeType: vibeMimeType } = await fileToBase64(vibeFile);
        parts.push({
            inlineData: { data: vibeBase64, mimeType: vibeMimeType }
        });
        fullPrompt += ` The scene's style, mood, and color palette should be heavily inspired by the second image provided.`;
    }
    
    if (logoFile) {
        const { base64: logoBase64, mimeType: logoMimeType } = await fileToBase64(logoFile);
        parts.push({
            inlineData: { data: logoBase64, mimeType: logoMimeType }
        });
        fullPrompt += ` The final provided image is a brand logo. Place this logo subtly and naturally in a corner of the final generated image.`;
    }

    const requestedAspectRatio = aspectRatio || '1:1';
    fullPrompt += ` The final image should be a photorealistic lifestyle shot. CRITICAL REQUIREMENT: The final output image's aspect ratio must be exactly ${requestedAspectRatio}. This is a non-negotiable instruction.`;
    parts.push({ text: fullPrompt });

    return generateImageFromParts(parts, 'Lifestyle image generation');
};

export const refineLifestyleImage = async (
    imageDataUrl: string,
    prompt: string,
): Promise<{ id: string; src: string }> => {
    const { base64, mimeType } = dataURLtoBase64(imageDataUrl);

    const { width, height } = await getImageDimensions(imageDataUrl);
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const commonDivisor = gcd(width, height);
    const aspectRatio = `${width / commonDivisor}:${height / commonDivisor}`;
    
    const fullPrompt = `Refine this image based on the following instruction: "${prompt}". The final image should maintain the subject but incorporate the changes. CRITICAL REQUIREMENT: Ensure the final image has the exact same aspect ratio as the original, which is ${aspectRatio}. Do not change the aspect ratio.`;
    
    const parts: ContentPart[] = [
        { inlineData: { data: base64, mimeType } },
        { text: fullPrompt }
    ];

    return generateImageFromParts(parts, 'Image refinement');
};

export const editImageWithMask = async (
    imageDataUrl: string,
    maskDataUrl: string,
    prompt: string,
): Promise<{ id: string; src: string }> => {
    const { base64: baseImageBase64, mimeType: baseImageMimeType } = dataURLtoBase64(imageDataUrl);
    const { base64: maskImageBase64 } = dataURLtoBase64(maskDataUrl);

    const fullPrompt = `Using the provided mask, edit the original image based on this instruction: "${prompt}". The white area of the mask indicates the part of the image to be changed. Preserve the rest of the image (the black area). Only return the edited image.`;
    
    const parts: ContentPart[] = [
        { inlineData: { data: baseImageBase64, mimeType: baseImageMimeType } },
        { inlineData: { data: maskImageBase64, mimeType: 'image/png' } },
        { text: fullPrompt },
    ];
    
    return generateImageFromParts(parts, 'Image editing with mask');
};

export const upscaleImage = async (
    imageDataUrl: string,
    options: UpscaleOptions,
): Promise<{ id: string; src: string }> => {
    const { base64, mimeType } = dataURLtoBase64(imageDataUrl);
    const { factor, profile, removeArtifacts, preserveFaces, enhanceDetails } = options;

    let prompt = `You are a professional Image Upscale Orchestrator. Your task is to upscale the provided image with extreme precision, acting as a specialized inference engine.

**Upscale Job Configuration:**
- **Upscale Factor:** ${factor}x
- **Image Profile:** ${profile}
- **Artifact Removal:** ${removeArtifacts ? 'Enabled (JPEG ringing, banding, aliasing)' : 'Disabled'}
- **Face Preservation:** ${preserveFaces ? 'Enabled (High-fidelity face restoration)' : 'Disabled'}
- **Detail Enhancement (Hallucination):** ${enhanceDetails ? 'Enabled (Subtly add plausible micro-details)' : 'Disabled'}

**Core Instructions:**
1.  Upscale the provided image to ${factor} times its original resolution.
2.  Adhere strictly to the selected **Image Profile**.
    -   For **'Photo'**: Prioritize realism, accurate skin tones, and texture. If 'Face Preservation' is enabled, restore facial details without altering identity.
    -   For **'Product'**: Maintain material textures (fabric grain, wood pores, metal brush) and product shape integrity.
    -   For **'Text / Artwork'**: Preserve sharp edges, lines, and typographic clarity. Prevent bleeding or aliasing on text and vector-style art.
    -   For **'Default'**: Apply a balanced, general-purpose upscaling algorithm.
3.  If **Artifact Removal** is enabled, clean the image of compression artifacts before upscaling.
4.  If **Detail Enhancement** is disabled, you MUST NOT hallucinate or invent new content. The output must be a crisper, higher-resolution version of the original.
5.  The final output must be only the upscaled image. Do not add text or other elements.`;
    
    const parts: ContentPart[] = [
        { inlineData: { data: base64, mimeType } },
        { text: prompt }
    ];

    return generateImageFromParts(parts, 'Image upscaling');
};
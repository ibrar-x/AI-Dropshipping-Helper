
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { useAppStore } from '../store';
import { fileToBase64, dataURLtoBase64 } from "../utils/imageUtils";
import { AdBrief, GeneratedImage, SelectionAnalysis, UpscaleOptions } from "../types";

const getAiClient = (): GoogleGenAI => {
    const { customApiKey } = useAppStore.getState();
    const apiKey = customApiKey || process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API key is not configured. Please set it in the settings or as an environment variable.");
    }
    return new GoogleGenAI({ apiKey });
};

async function* generateStream(modelName: string, prompt: string, systemInstruction?: string) {
    const ai = getAiClient();
    const { prompts, safetySettings } = useAppStore.getState();
    const stream = await ai.models.generateContentStream({
        model: modelName,
        contents: prompt,
        config: {
            systemInstruction: systemInstruction || prompts.system,
            safetySettings,
        },
    });

    for await (const chunk of stream) {
        yield chunk.text;
    }
}

async function generateText(modelName: string, prompt: string, systemInstruction?: string, jsonOutput: boolean = false): Promise<string> {
    const ai = getAiClient();
    const { prompts, safetySettings } = useAppStore.getState();
    const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
            systemInstruction: systemInstruction || prompts.system,
            ...(jsonOutput && { responseMimeType: 'application/json' }),
            safetySettings,
        },
    });
    return response.text;
}

async function generateImage(prompt: string, aspectRatio: string = "1:1", count: number = 1): Promise<GeneratedImage[]> {
    const ai = getAiClient();
    const { modelConfig } = useAppStore.getState();
    const response = await ai.models.generateImages({
        model: modelConfig.visual,
        prompt,
        config: {
            numberOfImages: count,
            aspectRatio: aspectRatio,
        },
    });

    return response.generatedImages.map((img, index) => ({
        id: `gen_${Date.now()}_${index}`,
        src: `data:image/png;base64,${img.image.imageBytes}`,
    }));
}

export const enhancePromptStream = (prompt: string, systemInstruction?: string): AsyncGenerator<string> => {
    const { prompts, modelConfig } = useAppStore.getState();
    const finalPrompt = prompts.enhancePrompt + "\n\n" + prompt;
    return generateStream(modelConfig.text, finalPrompt, systemInstruction);
}

export const analyzeSelection = async (baseImageSrc: string, maskDataUrl: string, highlightDataUrl: string): Promise<SelectionAnalysis> => {
    const ai = getAiClient();
    const { prompts, modelConfig, safetySettings } = useAppStore.getState();
    const { base64: base64ImageData } = dataURLtoBase64(baseImageSrc);
    const { base64: maskBase64 } = dataURLtoBase64(maskDataUrl);
    const { base64: highlightBase64 } = dataURLtoBase64(highlightDataUrl);

    const response = await ai.models.generateContent({
        model: modelConfig.text,
        contents: {
            parts: [
                { text: prompts.analyzeSelection },
                { inlineData: { mimeType: 'image/png', data: base64ImageData } },
                { inlineData: { mimeType: 'image/png', data: maskBase64 } },
                { inlineData: { mimeType: 'image/png', data: highlightBase64 } },
            ]
        },
        config: {
            responseMimeType: 'application/json',
            safetySettings,
        },
    });

    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as SelectionAnalysis;
    } catch (e) {
        console.error("Failed to parse analysis JSON:", response.text);
        throw new Error("AI analysis returned an invalid format.");
    }
};

export const editImageWithMask = async (baseImageSrc: string, maskDataUrl: string, highlightDataUrl: string, prompt: string, referenceImages: File[]): Promise<GeneratedImage> => {
    const ai = getAiClient();
    const { prompts, modelConfig, safetySettings } = useAppStore.getState();
    const { base64: base64ImageData, mimeType } = dataURLtoBase64(baseImageSrc);

    const parts: ({ text: string } | { inlineData: { mimeType: string; data: string }})[] = [
        { text: prompts.editImageWithMask.replace('{prompt}', prompt) },
        { inlineData: { mimeType: mimeType, data: base64ImageData } },
        { inlineData: { mimeType: 'image/png', data: dataURLtoBase64(maskDataUrl).base64 } },
    ];

    for (const file of referenceImages) {
        const { base64, mimeType } = await fileToBase64(file);
        parts.push({ inlineData: { mimeType, data: base64 } });
    }

    const response = await ai.models.generateContent({
        model: modelConfig.edit,
        contents: { parts },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
            safetySettings,
        },
    });
    
    const imagePart = response.candidates?.[0]?.content.parts.find(p => p.inlineData);
    if (!imagePart?.inlineData) {
        throw new Error("AI did not return an edited image.");
    }
    
    return {
        id: `edit_${Date.now()}`,
        src: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
    };
};

export const upscaleImage = async (imageSrc: string, options: UpscaleOptions): Promise<GeneratedImage> => {
    const { modelConfig } = useAppStore.getState();
    console.log("Simulating upscale with options:", options, "and model:", modelConfig.upscale);
    await new Promise(res => setTimeout(res, 1500));
    return {
        id: `upscaled_${Date.now()}`,
        src: imageSrc,
    };
};

export const analyzeImageEnvironment = async (imageFile: File): Promise<string> => {
    const ai = getAiClient();
    const { prompts, modelConfig, safetySettings } = useAppStore.getState();
    const { base64, mimeType } = await fileToBase64(imageFile);

    const response = await ai.models.generateContent({
        model: modelConfig.text,
        contents: {
            parts: [
                { text: prompts.analyzeImageEnvironment },
                { inlineData: { mimeType, data: base64 } }
            ]
        },
        config: {
            safetySettings,
        },
    });

    return response.text.trim();
};


export const suggestVisualPrompts = async (imageFile: File, count: number, styleReferenceFile?: File, environmentDescription?: string): Promise<string[]> => {
    const ai = getAiClient();
    const { prompts, modelConfig, safetySettings } = useAppStore.getState();
    
    const parts: any[] = [];

    if (environmentDescription) {
        // New logic: generate variations from text description
        const request_prompt = prompts.suggestVisualPromptsFromEnv
            .replace('{environmentDescription}', environmentDescription)
            .replace(/{count}/g, String(count));
        parts.push({ text: request_prompt });
    } else {
        // Original logic: use product image and optional style ref
        const { base64, mimeType } = await fileToBase64(imageFile);
        const request_prompt = prompts.suggestVisualPrompts; // original prompt key
        parts.push(
            { text: request_prompt },
            { inlineData: { mimeType, data: base64 } }
        );
        
        if (styleReferenceFile) {
            parts.push({ text: "\n\nUse this next image as a style reference for the suggestions:"});
            const styleRef = await fileToBase64(styleReferenceFile);
            parts.push({ inlineData: { mimeType: styleRef.mimeType, data: styleRef.base64 } });
        }
    }
    
    const response = await ai.models.generateContent({
        model: modelConfig.text,
        contents: { parts },
        config: {
            responseMimeType: 'application/json',
            safetySettings,
        },
    });

    try {
        const text = response.text.trim();
        const result = JSON.parse(text);
        return result.suggestions || [];
    } catch (e) {
        console.error("Failed to parse visual prompt suggestions:", response.text);
        return [];
    }
};

export const generateAdImage = async (prompt: string, aspectRatio: string, count: number, referenceInputs: (File | { dataUrl: string })[]): Promise<GeneratedImage[]> => {
    const ai = getAiClient();
    const { modelConfig, safetySettings } = useAppStore.getState();

    if (referenceInputs.length > 0) {
        const parts: any[] = [{ text: prompt }];
        for (const input of referenceInputs) {
            if ('dataUrl' in input) {
                const { base64, mimeType } = dataURLtoBase64(input.dataUrl);
                parts.push({ inlineData: { mimeType, data: base64 } });
            } else {
                const { base64, mimeType } = await fileToBase64(input);
                parts.push({ inlineData: { mimeType, data: base64 } });
            }
        }
        
        const response = await ai.models.generateContent({
            model: modelConfig.edit,
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
                safetySettings,
            },
        });

        const imagePart = response.candidates?.[0]?.content.parts.find(p => p.inlineData);
        if (!imagePart?.inlineData) {
            throw new Error("AI did not return an edited ad image.");
        }
        return [{
            id: `ad_${Date.now()}`,
            src: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
        }];

    } else {
        return generateImage(prompt, aspectRatio, count);
    }
}

export const generateAdCopy = (brief: AdBrief): AsyncGenerator<string> => {
    const { prompts, modelConfig } = useAppStore.getState();
    const prompt = `${prompts.generateAdCopy}\n\nAd Brief:\n${JSON.stringify(brief, null, 2)}`;
    return generateStream(modelConfig.text, prompt);
};

export const generatePlatformContentStream = (platform: string, brief: AdBrief, userRequest: string): AsyncGenerator<string> => {
    const { prompts, modelConfig } = useAppStore.getState();
    const prompt = `${prompts.generatePlatformContent}\n\nPlatform: ${platform}\nUser Request: ${userRequest}\nProduct Brief:\n${JSON.stringify(brief, null, 2)}`;
    return generateStream(modelConfig.text, prompt);
};

export const generateVisualsFromText = async (prompt: string, aspectRatio: string, count: number): Promise<GeneratedImage[]> => {
    return generateImage(prompt, aspectRatio, count);
}

export const generateEbayDescription = (productTitle: string, productFeatures: string): AsyncGenerator<string> => {
    const { prompts, modelConfig } = useAppStore.getState();
    const prompt = `${prompts.generateEbayDescription}\n\nProduct Title: ${productTitle}\nKey Features:\n${productFeatures}`;
    return generateStream(modelConfig.text, prompt);
};
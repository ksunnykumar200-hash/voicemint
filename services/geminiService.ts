
import { GoogleGenAI, Modality } from "@google/genai";
import type { Voice } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateScriptFromImage = async (imageBase64: string): Promise<string> => {
    try {
        const imagePart = {
            inlineData: {
                mimeType: 'image/jpeg',
                data: imageBase64,
            },
        };
        const textPart = {
            text: "You are a creative scriptwriter. Based on the scene in this image, write a descriptive and engaging script for a voice-over that could last around 15 seconds. Describe the atmosphere, potential character thoughts, or the unfolding action. Provide only the script text, without any labels like 'Script:' or quotation marks.",
        };
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error generating script from image:", error);
        throw error;
    }
};


export const translateScript = async (script: string, language: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Translate the following text to ${language}. Provide only the translation, without any additional comments or formatting. Text to translate: "${script}"`,
    });
    return response.text;
  } catch (error) {
    console.error("Error translating script:", error);
    throw error;
  }
};

export const generateDubbedAudio = async (
  script: string,
  voice: Voice,
  emotion: number, // 0-100 (Sad to Happy)
  speed: number // 0-100 (Slow to Fast)
): Promise<string | null> => {
  try {
    let instruction = 'Say the following';

    // Emotion
    if (emotion < 30) {
      instruction += ' in a sad, melancholic tone';
    } else if (emotion > 70) {
      instruction += ' in a happy, energetic tone';
    }

    // Speed
    if (speed < 30) {
      instruction += ' and speak slowly';
    } else if (speed > 70) {
      instruction += ' and speak quickly';
    }

    instruction += ': ';

    // Only add instruction if it's not the default
    const finalScript = (instruction === 'Say the following: ') ? script : instruction + script;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: finalScript }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    return base64Audio || null;
  } catch (error) {
    console.error("Error generating dubbed audio:", error);
    throw error;
  }
};

export const transcribeAudio = async (audioBase64: string, mimeType: string): Promise<string> => {
    try {
        const audioPart = {
            inlineData: {
                mimeType,
                data: audioBase64,
            },
        };
        const textPart = {
            text: "Transcribe the following audio:",
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [audioPart, textPart] },
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error transcribing audio:", error);
        throw error;
    }
};

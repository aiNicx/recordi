import { GoogleGenAI, Modality } from "@google/genai";
import { Language } from "../types";

// Initialize Gemini API Client
// We assume process.env.API_KEY is available in the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a creative title and short description for a video based on its thumbnail.
 */
export const generateVideoMetadata = async (base64Image: string, language: Language): Promise<{ title: string; description: string }> => {
  try {
    // Remove header if present (e.g., "data:image/png;base64,")
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const langName = language === 'it' ? 'Italian' : 'English';

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanBase64,
            },
          },
          {
            text: `This is a thumbnail from a screen recording. Generate a professional, catchy title (max 8 words) and a one-sentence summary for this video.
            IMPORTANT: The output MUST be in ${langName}.
            Format:
            Title: [Your Title Here]
            Summary: [Your Summary Here]`,
          },
        ],
      },
      config: {
        responseModalities: [Modality.TEXT],
        temperature: 0.7,
      },
    });

    const text = response.text || '';
    
    // Parsing logic updated to handle potential localized prefixes or loose formatting
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    let title = 'Untitled Recording';
    let description = 'No description generated.';

    // Flexible parsing
    lines.forEach(line => {
        if (line.match(/^(Title|Titolo):/i)) {
            title = line.replace(/^(Title|Titolo):\s*/i, '').replace(/"/g, '').trim();
        } else if (line.match(/^(Summary|Sommario|Description|Descrizione):/i)) {
            description = line.replace(/^(Summary|Sommario|Description|Descrizione):\s*/i, '').trim();
        }
    });

    // Fallback if regex didn't catch exactly (sometimes model just outputs lines)
    if (title === 'Untitled Recording' && lines.length > 0) {
        title = lines[0].replace(/"/g, '');
        if (lines.length > 1) description = lines.slice(1).join(' ');
    }

    return { title, description };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { 
      title: language === 'it' ? "Nuova Registrazione" : "New Recording", 
      description: language === 'it' ? "Impossibile generare la descrizione con AI." : "Could not generate description using AI." 
    };
  }
};

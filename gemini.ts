import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const apiKey = process.env.VITE_GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface ScanResult {
  type: "text" | "table";
  content: string | TableData;
}

export async function scanImage(base64Image: string, mimeType: string, mode: "text" | "table"): Promise<ScanResult> {
  const model = "gemini-3-flash-preview";
  
  const prompt = mode === "text" 
    ? "Extract all text from this image, including handwriting. Maintain the original formatting as much as possible. Return only the extracted text."
    : "Extract the table from this image, including handwritten tables. Return the data in a strict JSON format with 'headers' (array of strings) and 'rows' (array of arrays of strings). If there are multiple tables, focus on the most prominent one. Return ONLY the JSON.";

  const imagePart = {
    inlineData: {
      data: base64Image.split(",")[1],
      mimeType: mimeType,
    },
  };

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: model,
    contents: [{ parts: [imagePart, { text: prompt }] }],
    config: {
      responseMimeType: mode === "table" ? "application/json" : "text/plain",
    }
  });

  const text = response.text || "";

  if (mode === "table") {
    try {
      const data = JSON.parse(text) as TableData;
      return { type: "table", content: data };
    } catch (e) {
      console.error("Failed to parse table JSON", e);
      return { type: "text", content: text };
    }
  }

  return { type: "text", content: text };
}

export async function translateContent(content: string | TableData, targetLang: "Hindi" | "English"): Promise<string | TableData> {
  const model = "gemini-3-flash-preview";
  
  const prompt = typeof content === "string"
    ? `Translate the following text to ${targetLang}. Return ONLY the translated text.\n\nText: ${content}`
    : `Translate all the text within this table data to ${targetLang}. Maintain the JSON structure with 'headers' and 'rows'. Return ONLY the JSON.\n\nJSON: ${JSON.stringify(content)}`;

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: typeof content === "object" ? "application/json" : "text/plain",
    }
  });

  const text = response.text || "";

  if (typeof content === "object") {
    try {
      return JSON.parse(text) as TableData;
    } catch (e) {
      console.error("Failed to parse translated table JSON", e);
      return content;
    }
  }

  return text;
}

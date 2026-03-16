import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface ScanResult {
  type: "text" | "table";
  content: string | TableData;
}

export async function scanImage(base64Image: string, mimeType: string, mode: "text" | "table"): Promise<ScanResult> {
  // मॉडल का सही नाम 'gemini-1.5-flash' है
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const prompt = mode === "text" 
    ? "Extract all text from this image. Return only the extracted text."
    : "Extract the table from this image. Return the data in a strict JSON format with 'headers' (array of strings) and 'rows' (array of arrays of strings). Return ONLY the JSON.";

  const imageData = base64Image.split(",")[1];

  const result = await model.generateContent([
    prompt,
    { inlineData: { data: imageData, mimeType } }
  ]);

  const text = result.response.text();

  if (mode === "table") {
    try {
      // JSON के आस-पास से फालतू शब्द हटाना (जैसे ```json)
      const cleanJson = text.replace(/```json|```/g, "").trim();
      const data = JSON.parse(cleanJson) as TableData;
      return { type: "table", content: data };
    } catch (e) {
      console.error("Failed to parse table JSON", e);
      return { type: "text", content: text };
    }
  }

  return { type: "text", content: text };
}

export async function translateContent(content: string | TableData, targetLang: "Hindi" | "English"): Promise<string | TableData> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const prompt = typeof content === "string"
    ? `Translate the following text to ${targetLang}. Return ONLY the translated text.\n\nText: ${content}`
    : `Translate all the text within this table data to ${targetLang}. Maintain the JSON structure with 'headers' and 'rows'. Return ONLY the JSON.\n\nJSON: ${JSON.stringify(content)}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  if (typeof content === "object") {
    try {
      const cleanJson = text.replace(/```json|```/g, "").trim();
      return JSON.parse(cleanJson) as TableData;
    } catch (e) {
      console.error("Failed to parse translated table JSON", e);
      return content;
    }
  }

  return text;
}

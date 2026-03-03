import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface LotteryResult {
  name: string;
  drawNumber: string;
  date: string;
  numbers: number[];
  prizes?: {
    description: string;
    value: string;
    winners: string;
  }[];
}

export async function fetchLotteryResult(lotteryName: string): Promise<LotteryResult | null> {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set");
    return null;
  }

  const prompt = `Busque o resultado oficial mais recente da loteria brasileira: ${lotteryName}. 
  Retorne o número do concurso, a data do sorteio e os números sorteados em ordem crescente.
  Se disponível, inclua também as principais faixas de premiação (ex: 6 acertos, 5 acertos, 4 acertos para Mega-Sena).
  A data deve estar no formato DD/MM/AAAA.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            drawNumber: { type: Type.STRING },
            date: { type: Type.STRING },
            numbers: {
              type: Type.ARRAY,
              items: { type: Type.INTEGER }
            },
            prizes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  value: { type: Type.STRING },
                  winners: { type: Type.STRING }
                }
              }
            }
          },
          required: ["name", "drawNumber", "date", "numbers"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    
    return JSON.parse(text) as LotteryResult;
  } catch (error) {
    console.error("Error fetching lottery result:", error);
    return null;
  }
}

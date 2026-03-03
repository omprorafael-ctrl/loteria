import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface LotteryResult {
  name: string;
  drawNumber: string;
  date: string;
  numbers: number[];
  prizes?: {
    description: string;
    winners: number;
    value: string;
  }[];
}

export async function fetchLotteryResult(lotteryType: string): Promise<LotteryResult | null> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not defined");
      return null;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Busque o resultado mais recente da loteria ${lotteryType} da Caixa Econômica Federal. 
      Retorne APENAS um objeto JSON válido com o seguinte formato:
      {
        "name": "Nome da Loteria",
        "drawNumber": "Número do Concurso",
        "date": "Data do Sorteio",
        "numbers": [lista de números sorteados em ordem crescente],
        "prizes": [
          { "description": "Sena/15 acertos/etc", "winners": 0, "value": "R$ 0,00" }
        ]
      }`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text;
    if (!text) {
      console.error("Empty response from Gemini");
      return null;
    }
    
    // Clean potential markdown code blocks and find the first { and last }
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');
    
    if (startIdx === -1 || endIdx === -1) {
      console.error("No JSON object found in response:", text);
      return null;
    }

    const jsonStr = text.substring(startIdx, endIdx + 1);
    return JSON.parse(jsonStr) as LotteryResult;
  } catch (error) {
    console.error("Error fetching lottery result:", error);
    return null;
  }
}

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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Busque o resultado mais recente da loteria ${lotteryType} da Caixa Econômica Federal. 
      Retorne APENAS um objeto JSON com o seguinte formato:
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
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) return null;
    
    // Clean potential markdown code blocks
    const jsonStr = text.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonStr) as LotteryResult;
  } catch (error) {
    console.error("Error fetching lottery result:", error);
    return null;
  }
}

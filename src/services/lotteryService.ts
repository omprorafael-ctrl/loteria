import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

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

const LOTTERY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "Nome da loteria (ex: Mega-Sena)" },
    drawNumber: { type: Type.STRING, description: "Número do concurso" },
    date: { type: Type.STRING, description: "Data do sorteio (DD/MM/AAAA)" },
    numbers: { 
      type: Type.ARRAY, 
      items: { type: Type.INTEGER },
      description: "Lista de números sorteados em ordem crescente"
    },
    prizes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING, description: "Faixa de premiação (ex: Sena)" },
          winners: { type: Type.INTEGER, description: "Quantidade de ganhadores" },
          value: { type: Type.STRING, description: "Valor do prêmio formatado (R$)" }
        },
        required: ["description", "winners", "value"]
      }
    }
  },
  required: ["name", "drawNumber", "date", "numbers"]
};

export async function fetchLotteryResult(lotteryType: string, retries = 2): Promise<LotteryResult | null> {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not defined");
    return null;
  }

  for (let i = 0; i <= retries; i++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Busque o resultado mais recente da loteria ${lotteryType} da Caixa Econômica Federal.`,
        config: {
          systemInstruction: "Você é um assistente especializado em Loterias da Caixa Econômica Federal. Sua tarefa é buscar e retornar dados precisos sobre o último sorteio solicitado. Retorne sempre os números em ordem crescente.",
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: LOTTERY_SCHEMA,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
        },
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from Gemini");
      
      const result = JSON.parse(text) as LotteryResult;
      
      // Basic validation
      if (!result.numbers || result.numbers.length === 0) {
        throw new Error("Invalid numbers received");
      }

      return result;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed for ${lotteryType}:`, error);
      if (i === retries) return null;
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  
  return null;
}

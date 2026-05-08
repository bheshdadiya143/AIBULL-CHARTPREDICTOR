import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ChartAnalysis {
  chartType: string;
  timeframe: string;
  trend: "bullish" | "bearish" | "neutral";
  confidence: number;
  indicators: {
    macd?: string;
    bollingerBands?: string;
    rsi?: string;
  };
  conceptsUsed: string[]; // SMC, ICT, Order Blocks, Liquidity, etc.
  marketStructure: "Bullish" | "Bearish" | "Consolidation";
  institutionalBias: string;
  strategyName: string;
  patterns: string[];
  keyLevels: {
    support: number[];
    resistance: number[];
    orderBlocks?: number[];
    fairValueGaps?: number[];
  };
  prediction: {
    bias: "long" | "short" | "neutral";
    entry: number;
    target: number;
    stopLoss: number;
    riskRewardRatio: number;
    executionType: "market" | "limit";
    limitPrice?: number;
    rationale: string;
  };
  simulatedData: {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    type: "historical" | "predicted";
  }[];
  isSharedConsensus?: boolean;
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    chartType: { type: Type.STRING },
    timeframe: { type: Type.STRING },
    trend: { type: Type.STRING, enum: ["bullish", "bearish", "neutral"] },
    confidence: { type: Type.NUMBER },
    marketStructure: { type: Type.STRING, enum: ["Bullish", "Bearish", "Consolidation"] },
    institutionalBias: { type: Type.STRING },
    strategyName: { type: Type.STRING },
    indicators: {
      type: Type.OBJECT,
      properties: {
        macd: { type: Type.STRING },
        bollingerBands: { type: Type.STRING },
        rsi: { type: Type.STRING },
      },
    },
    conceptsUsed: { type: Type.ARRAY, items: { type: Type.STRING } },
    patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
    keyLevels: {
      type: Type.OBJECT,
      properties: {
        support: { type: Type.ARRAY, items: { type: Type.NUMBER } },
        resistance: { type: Type.ARRAY, items: { type: Type.NUMBER } },
        orderBlocks: { type: Type.ARRAY, items: { type: Type.NUMBER } },
        fairValueGaps: { type: Type.ARRAY, items: { type: Type.NUMBER } },
      },
      required: ["support", "resistance"],
    },
    prediction: {
      type: Type.OBJECT,
      properties: {
        bias: { type: Type.STRING, enum: ["long", "short", "neutral"] },
        entry: { type: Type.NUMBER },
        target: { type: Type.NUMBER },
        stopLoss: { type: Type.NUMBER },
        riskRewardRatio: { type: Type.NUMBER },
        executionType: { type: Type.STRING, enum: ["market", "limit"] },
        limitPrice: { type: Type.NUMBER },
        rationale: { type: Type.STRING },
      },
      required: ["bias", "entry", "target", "stopLoss", "rationale", "riskRewardRatio", "executionType"],
    },
    simulatedData: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          time: { type: Type.STRING },
          open: { type: Type.NUMBER },
          high: { type: Type.NUMBER },
          low: { type: Type.NUMBER },
          close: { type: Type.NUMBER },
          type: { type: Type.STRING, enum: ["historical", "predicted"] },
        },
        required: ["time", "open", "high", "low", "close", "type"],
      },
    },
  },
  required: ["chartType", "trend", "prediction", "simulatedData", "patterns", "conceptsUsed", "marketStructure", "institutionalBias", "strategyName"],
};

export async function analyzeChartImage(base64Image: string): Promise<ChartAnalysis> {
  // Remove data:image/xxx;base64, prefix if present
  const data = base64Image.split(",")[1] || base64Image;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            text: `Act as a Senior Institutional Analyst specializing in SMC (Smart Money Concepts) and ICT. 
            Analyze the provided chart image with extreme precision and strict adherence to technical logic.
            
            Deterministic Rules:
            1. STRUCTURE: Identify if current price action shows BoS (Break of Structure) or CHoCH (Change of Character).
            2. BIAS: Synthesize Timeframe, Structure, and Liquidity (Buy-side/Sell-side pools) to form a definite 'Institutional Bias'.
            3. KEY LEVELS: Locate high-probability Order Blocks (OB) and Fair Value Gaps (FVG).
            4. SETUP: Propose a trade with a strictly calculated Risk/Reward ratio (Target - Entry) / (Entry - StopLoss). MINIMUM RISK/REWARD RATIO MUST BE 1:3. IF SETUPS ARE LOWER, FIND A MORE AGGRESSIVE TARGET OR TIGHTER STOP LOSS BASED ON SMC CONCEPTS.
            5. CONSISTENCY: Use mathematical averages and clear pivot points visible in the image to determine 'entry' and 'levels'.
            6. OHLC DATA: Generate 20 data points. Points 1-10 MUST approximate the exact prices seen in the image. Points 11-20 must chart the most logical path towards the 'Target' or 'StopLoss'.
            
            Format: Use professional trading terminology. Ensure 'rationale' explains the setup via the 'Institutional Bias' and 'Market Structure' identified.`,
          },
          {
            inlineData: {
              data,
              mimeType: "image/png",
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema as any,
    },
  });

  if (!response.text) {
    throw new Error("No analysis received from AI.");
  }

  return JSON.parse(response.text.trim());
}

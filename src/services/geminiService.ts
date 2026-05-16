import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

export interface ChartAnalysis {
  signalId?: string;
  feedback?: 'accurate' | 'inaccurate';
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
  instrumentSymbol?: string; // e.g. BINANCE:BTCUSD, OANDA:EURUSD, NASDAQ:AAPL
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
    instrumentSymbol: { type: Type.STRING },
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

export async function analyzeChartImage(base64Image: string, requestedTimeframe: string = "1H"): Promise<ChartAnalysis> {
  // Remove data:image/xxx;base64, prefix if present
  const data = base64Image.split(",")[1] || base64Image;

  const response = await (ai as any).models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            text: `Act as a Senior Institutional Analyst specializing in SMC (Smart Money Concepts) and ICT. 
            Analyze the provided chart image for the ${requestedTimeframe} timeframe with extreme precision and strict adherence to technical logic.
            
            Deterministic Rules:
            1. TIMEFRAME CONTEXT: This analysis is specifically for the ${requestedTimeframe} timeframe. Adjust point frequency and level significance accordingly.
            2. STRUCTURE: Identify if current price action shows BoS (Break of Structure) or CHoCH (Change of Character).
            3. BIAS & CONSERVATISM: Form an 'Institutional Bias'. CRITICAL: You must be extremely conservative. If the chart is choppy, lacks clear liquidity pools, or is in the middle of a range, you MUST output 'neutral' bias and do not suggest tight entries.
            4. KEY LEVELS: Locate high-probability Order Blocks (OB) and Fair Value Gaps (FVG).
            5. SETUP: Propose a trade with a well-calculated Risk/Reward ratio. If the setup is high probability, use a wider, safer Stop Loss placement behind major structural pivot points to prevent Stop Hunts (reducing SL HIT rate). If the market structure is unclear, DO NOT force a trade.
            6. CONSISTENCY: Use clear pivot points visible in the image to determine 'entry' and 'levels'.
            7. OHLC DATA: Generate 20 data points. Points 1-10 MUST approximate the exact prices seen in the image. Points 11-20 must chart the most logical path towards the 'Target' or 'StopLoss'.
            8. SYMBOL DETECTION: Identify the precise TradingView symbol for the instrument shown in the chart. YOU MUST ALWAYS USE THE 'EXCHANGE:SYMBOL' FORMAT. Examples: 'OANDA:XAUUSD'.
            
            Format: Use professional trading terminology. Ensure 'rationale' strictly states why this trade avoids being stopped out early.`,
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
    safetySettings,
  });

  if (!response.text) {
    throw new Error("No analysis received from AI.");
  }

  return JSON.parse(response.text.trim());
}

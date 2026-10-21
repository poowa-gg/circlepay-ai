import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_AI_STUDIO_API_KEY
});

export async function askTreasurerAgent({
  question,
  circleContext
}: {
  question: string;
  circleContext: string;
}) {
  const systemInstruction = `
You are CirclePay AI's Treasurer Agent.

Rules:
1. Use only the provided circle context.
2. Never invent payment data.
3. Explain contribution and payout status clearly.
4. Recommend safe next actions.
5. Never move money without explicit user confirmation.

Circle context:
${circleContext}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: question,
    config: {
      systemInstruction
    }
  });

  return response.text;
}
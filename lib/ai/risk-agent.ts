import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_AI_STUDIO_API_KEY
});

export async function assessMemberRisk({
  member,
  contributionHistory,
  circleRules
}: {
  member: any;
  contributionHistory: any[];
  circleRules: string;
}) {
  const prompt = `
Assess the payment risk for this savings-circle member.

Return JSON only in this exact format:
{
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "reason": "short explanation",
  "recommendedAction": "REMINDER" | "INVOICE" | "GRACE_PERIOD" | "ESCALATE_TO_GROUP",
  "confidence": 0.0
}

Member:
${JSON.stringify(member)}

Contribution history:
${JSON.stringify(contributionHistory)}

Circle rules:
${circleRules}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt
  });

  const text = response.text ?? "{}";
  const cleaned = text.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return {
      riskLevel: "MEDIUM",
      reason: "Risk assessment could not be parsed.",
      recommendedAction: "REMINDER",
      confidence: 0.5
    };
  }
}
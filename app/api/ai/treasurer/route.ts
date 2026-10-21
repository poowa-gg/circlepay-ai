import { NextResponse } from "next/server";
import { askTreasurerAgent } from "@/lib/ai/treasurer-agent";

export async function POST(request: Request) {
  try {
    const { question, circleContext } = await request.json();

    if (!question || !circleContext) {
      return NextResponse.json(
        { error: "Question and circle context are required." },
        { status: 400 }
      );
    }

    const answer = await askTreasurerAgent({ question, circleContext });

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Treasurer Agent failed:", error);

    return NextResponse.json(
      { error: "AI assistant is unavailable." },
      { status: 500 }
    );
  }
}
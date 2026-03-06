import { GoogleGenAI, Type } from "@google/genai";

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { title } = await req.json();

  if (!title || !process.env.GEMINI_API_KEY) {
    return new Response(JSON.stringify({ genres: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `You are JESSICA AI, an elite curator for the Zetsumetsu EOe BOOKZ digital archive.
      Analyze the following book title and pick the single most accurate Sector from the provided list.
      Do not invent new ones. Return the result as an array containing that single sector.

      ALLOWED SECTORS:
      - GUIDES & PROTOCOLS
      - NEURAL FICTION
      - ACADEMIC NODES
      - SYSTEM SCHEMATICS
      - HISTORICAL TRACES
      - VISUAL ARTIFACTS
      - PHILOSOPHICAL CODES
      - RAW DATA STREAMS

      TITLE: "${title}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            genres: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["genres"],
        },
      },
    });

    const data = JSON.parse(response.text || '{"genres": []}');
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("JESSICA AI curation error:", error);
    return new Response(
      JSON.stringify({ genres: ["RAW DATA STREAMS"] }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
};

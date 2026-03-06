import { Handler } from "@netlify/functions";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { title } = JSON.parse(event.body || "{}");

  if (!title) {
    return { statusCode: 400, body: "Title is required" };
  }

  try {
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
              items: { type: Type.STRING }
            }
          },
          required: ["genres"]
        }
      }
    });

    const data = JSON.parse(response.text || '{"genres": []}');
    return {
      statusCode: 200,
      body: JSON.stringify(data.genres),
    };
  } catch (error: any) {
    console.error("JESSICA AI curation error:", error);
    return {
      statusCode: 200,
      body: JSON.stringify(["RAW DATA STREAMS"]),
    };
  }
};

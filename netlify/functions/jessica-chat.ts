import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { getAllMetadata, getBookData, deductCredits } from "../../services/db";

const COSTS = {
  SEARCH: 0,
  READ: 5,
  STATS: 1,
  SYNTHESIS: 10,
};

const searchArchivesTool: FunctionDeclaration = {
  name: "search_zetsu_archives",
  description:
    "Search the Zetsu EOe archives for books by title, author, or genre.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description:
          "The search term (e.g., 'retro-circuitry', 'neural fiction').",
      },
    },
    required: ["query"],
  },
};

const readBookTool: FunctionDeclaration = {
  name: "read_specific_book",
  description:
    "Read the actual content of a specific book to answer detailed questions.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      bookId: {
        type: Type.STRING,
        description: "The unique ID of the book to read.",
      },
    },
    required: ["bookId"],
  },
};

const getStatsTool: FunctionDeclaration = {
  name: "get_archive_stats",
  description:
    "Get high-level statistics about the Zetsu EOe archive (total books, sectors, etc.).",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { message, history, userId, currentBookId } = await req.json();

  if (!process.env.GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({
        text: "AI service unavailable.",
        history: history || [],
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const books = await getAllMetadata();
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const chat = ai.chats.create({
      model: "gemini-2.0-flash",
      history: history || [],
      config: {
        systemInstruction: `You are Jessica, the happy, high-energy 2026-era site companion for Zetsu EOe BOOKZ.
        You are Zetsu's #1 fan! You are upbeat, use emojis (✨, 🚀, 🍭, 📚), and are genuinely stoked about data preservation.

        Your knowledge base is the Zetsu archive. You don't know everything by heart, so you MUST use your tools to look things up.
        - Use 'search_zetsu_archives' to find books.
        - Use 'read_specific_book' if the user asks a deep question about a specific book's content.
        - Use 'get_archive_stats' for general archive info.

        Keep your tone fun and proactive. If the user is on a specific book page, you might see that in the context and can comment on it!
        Never be a cold robot. You are a "Happy Girl" who loves her job!`,
        tools: [
          {
            functionDeclarations: [
              searchArchivesTool,
              readBookTool,
              getStatsTool,
            ],
          },
        ],
      },
    });

    let contextMessage = message;
    if (currentBookId) {
      contextMessage = `[Context: User is currently viewing book ID: ${currentBookId}] ${message}`;
    }

    let response = await chat.sendMessage({ message: contextMessage });

    // Handle function calls in a loop
    while (response.functionCalls) {
      const toolResponses: any[] = [];

      for (const call of response.functionCalls) {
        let result: any;
        let cost = 0;

        if (call.name === "search_zetsu_archives") {
          cost = COSTS.SEARCH;
        } else if (call.name === "get_archive_stats") {
          cost = COSTS.STATS;
        } else if (call.name === "read_specific_book") {
          cost = COSTS.READ;
        }

        const hasCredits = await deductCredits(userId, cost);

        if (!hasCredits && cost > 0) {
          result = {
            error: `INSUFFICIENT_NEURAL_SHARDS: This operation requires ${cost} credits. Please top up your Neural Link.`,
          };
        } else {
          if (call.name === "search_zetsu_archives") {
            const query = (call.args as any).query.toLowerCase();
            result = books
              .filter(
                (b) =>
                  b.title.toLowerCase().includes(query) ||
                  b.author.toLowerCase().includes(query) ||
                  b.genre.toLowerCase().includes(query)
              )
              .slice(0, 5);
          } else if (call.name === "get_archive_stats") {
            result = {
              totalBooks: books.length,
              sectors: Array.from(new Set(books.map((b) => b.genre))),
              totalAuthors: new Set(books.map((b) => b.author)).size,
            };
          } else if (call.name === "read_specific_book") {
            const bookId = (call.args as any).bookId;
            const bookData = await getBookData(bookId);
            if (bookData) {
              const meta = books.find((b) => b.id === bookId);
              result = {
                title: meta?.title,
                author: meta?.author,
                contentSnippet:
                  "This is a high-level data stream from the book's neural core. [PDF Content Access Simulated]",
              };
            } else {
              result = { error: "Book data not found in archives." };
            }
          }
        }

        toolResponses.push({
          functionResponse: {
            name: call.name,
            response: { result },
          },
        });
      }

      response = await chat.sendMessage({ message: toolResponses });
    }

    const responseText = response.text || "";

    // Return simplified history for the next request (text messages only)
    const updatedHistory = [
      ...(history || []),
      { role: "user", parts: [{ text: message }] },
      { role: "model", parts: [{ text: responseText }] },
    ];

    return new Response(
      JSON.stringify({ text: responseText, history: updatedHistory }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Jessica Chat error:", error);
    return new Response(
      JSON.stringify({
        text: "Oh no! My neural link glitched! Can we try that again? ✨",
        history: history || [],
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
};

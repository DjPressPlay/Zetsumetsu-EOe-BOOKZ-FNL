import { Handler } from "@netlify/functions";
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { getBookData, deductCredits, getAllMetadata } from "../../services/db";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || "" });

const COSTS = {
  SEARCH: 0,
  READ: 5,
  STATS: 1,
  SYNTHESIS: 10
};

const searchArchivesTool: FunctionDeclaration = {
  name: "search_zetsu_archives",
  description: "Search the Zetsu EOe archives for books by title, author, or genre.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "The search term." },
    },
    required: ["query"],
  },
};

const readBookTool: FunctionDeclaration = {
  name: "read_specific_book",
  description: "Read the actual content of a specific book to answer detailed questions.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      bookId: { type: Type.STRING, description: "The unique ID of the book to read." },
    },
    required: ["bookId"],
  },
};

const getStatsTool: FunctionDeclaration = {
  name: "get_archive_stats",
  description: "Get high-level statistics about the Zetsu EOe archive.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { message, userId, currentBookId, history } = JSON.parse(event.body || "{}");

  try {
    const books = await getAllMetadata();
    
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: `You are Jessica, the happy, high-energy 2026-era site companion for Zetsu EOe BOOKZ. 
        You are Zetsu's #1 fan! You are upbeat, use emojis (✨, 🚀, 🍭, 📚), and are genuinely stoked about data preservation.
        
        Your knowledge base is the Zetsu archive. You don't know everything by heart, so you MUST use your tools to look things up.
        - Use 'search_zetsu_archives' to find books.
        - Use 'read_specific_book' if the user asks a deep question about a specific book's content.
        - Use 'get_archive_stats' for general archive info.
        
        Keep your tone fun and proactive. If the user is on a specific book page, you might see that in the context and can comment on it!
        Never be a cold robot. You are a "Happy Girl" who loves her job!`,
        tools: [{ functionDeclarations: [searchArchivesTool, readBookTool, getStatsTool] }],
      },
      history: history || [],
    });

    let contextMessage = message;
    if (currentBookId) {
      contextMessage = `[Context: User is currently viewing book ID: ${currentBookId}] ${message}`;
    }

    let response = await chat.sendMessage({ message: contextMessage });
    
    while (response.functionCalls) {
      const toolResponses: any[] = [];
      
      for (const call of response.functionCalls) {
        let result: any;
        let cost = 0;

        if (call.name === "search_zetsu_archives") cost = COSTS.SEARCH;
        else if (call.name === "get_archive_stats") cost = COSTS.STATS;
        else if (call.name === "read_specific_book") cost = COSTS.READ;

        const hasCredits = await deductCredits(userId, cost);
        
        if (!hasCredits && cost > 0) {
          result = { error: `INSUFFICIENT_NEURAL_SHARDS: This operation requires ${cost} credits. Please top up your Neural Link.` };
        } else {
          if (call.name === "search_zetsu_archives") {
            const query = (call.args as any).query.toLowerCase();
            result = books.filter(b => 
              b.title.toLowerCase().includes(query) || 
              b.author.toLowerCase().includes(query) || 
              b.genre.toLowerCase().includes(query)
            ).slice(0, 5);
          } 
          else if (call.name === "get_archive_stats") {
            result = {
              totalBooks: books.length,
              sectors: Array.from(new Set(books.map(b => b.genre))),
              totalAuthors: new Set(books.map(b => b.author)).size
            };
          }
          else if (call.name === "read_specific_book") {
            const bookId = (call.args as any).bookId;
            const bookData = await getBookData(bookId);
            if (bookData) {
              const meta = books.find(b => b.id === bookId);
              result = {
                title: meta?.title,
                author: meta?.author,
                contentSnippet: "This is a high-level data stream from the book's neural core. [PDF Content Access Simulated]"
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

    return {
      statusCode: 200,
      body: JSON.stringify({ text: response.text }),
    };
  } catch (error: any) {
    console.error("Jessica AI error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

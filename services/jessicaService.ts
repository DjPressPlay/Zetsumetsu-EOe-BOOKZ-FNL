
import { BookMetadata } from "../types";

export interface JessicaMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

export class JessicaAI {
  private history: JessicaMessage[];

  constructor(_books?: BookMetadata[]) {
    this.history = [];
  }

  async sendMessage(message: string, userId: string, currentBookId?: string): Promise<string> {
    const response = await fetch('/api/jessica-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history: this.history,
        userId,
        currentBookId,
      }),
    });

    const data = await response.json();

    // Update local conversation history
    this.history = data.history || [
      ...this.history,
      { role: "user", parts: [{ text: message }] },
      { role: "model", parts: [{ text: data.text }] },
    ];

    return data.text;
  }
}

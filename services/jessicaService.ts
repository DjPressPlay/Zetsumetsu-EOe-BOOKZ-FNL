
export interface JessicaMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

export class JessicaAI {
  private history: JessicaMessage[] = [];

  constructor() {
    // History is managed locally now
  }

  async sendMessage(message: string, userId: string, currentBookId?: string) {
    try {
      const response = await fetch('/api/jessica-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          userId,
          currentBookId,
          history: this.history
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch Jessica response');
      const data = await response.json();

      // Update local history
      this.history.push({ role: "user", parts: [{ text: message }] });
      this.history.push({ role: "model", parts: [{ text: data.text }] });

      return data.text;
    } catch (error) {
      console.error("Jessica AI error:", error);
      throw error;
    }
  }
}

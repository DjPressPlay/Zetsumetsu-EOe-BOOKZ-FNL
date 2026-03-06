
export const suggestGenres = async (title: string): Promise<string[]> => {
  if (!title) return [];

  try {
    const response = await fetch('/api/suggest-genres', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });

    const data = await response.json();
    return data.genres || [];
  } catch (error) {
    console.error("JESSICA AI curation error:", error);
    return ["RAW DATA STREAMS"];
  }
};


export const suggestGenres = async (title: string): Promise<string[]> => {
  if (!title) return [];

  try {
    const response = await fetch('/api/suggest-genres', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) throw new Error('Failed to fetch genre suggestions');
    return await response.json();
  } catch (error) {
    console.error("AI curation error:", error);
    return ["RAW DATA STREAMS"];
  }
};

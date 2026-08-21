
/**
 * Maps legacy category/sector names to the updated 6 standard sectors.
 */
export const CATEGORY_MAP: Record<string, string> = {
  // Legacy mappings
  "GUIDES & PROTOCOLS": "GUIDES & HOW-TOS",
  "NEURAL FICTION": "FICTION & STORIES",
  "ACADEMIC NODES": "RESEARCH & PAPERS",
  "SYSTEM SCHEMATICS": "REFERENCE & NONFICTION",
  "HISTORICAL TRACES": "REFERENCE & NONFICTION",
  "PHILOSOPHICAL CODES": "REFERENCE & NONFICTION",
  "VISUAL ARTIFACTS": "ART & ILLUSTRATION",
  "RAW DATA STREAMS": "OTHER DOCUMENTS",
  
  // Mixed case variations
  "Guides & Protocols": "Guides & How-Tos",
  "Neural Fiction": "Fiction & Stories",
  "Academic Nodes": "Research & Papers",
  "System Schematics": "Reference & Nonfiction",
  "Historical Traces": "Reference & Nonfiction",
  "Philosophical Codes": "Reference & Nonfiction",
  "Visual Artifacts": "Art & Illustration",
  "Raw Data Streams": "Other Documents",
};

export const normalizeSectorName = (rawGenre?: string): string => {
  if (!rawGenre) return "REFERENCE & NONFICTION";
  const trimmed = rawGenre.trim();
  const upper = trimmed.toUpperCase();
  
  if (CATEGORY_MAP[upper]) {
    return CATEGORY_MAP[upper];
  }
  if (CATEGORY_MAP[trimmed]) {
    return CATEGORY_MAP[trimmed];
  }
  return trimmed;
};

export interface GifItem {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
  width?: number;
  height?: number;
  category: string;
}

export interface StickerItem {
  id: string;
  title: string;
  emoji: string;
  imageUrl?: string;
  tag: string;
}

// Curated campus and reaction GIFs with reliable CDN links
const CURATED_GIFS: GifItem[] = [
  // Focus & Study
  {
    id: "study_cat",
    title: "Studying hard",
    url: "https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif",
    previewUrl: "https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/200w.gif",
    category: "study"
  },
  {
    id: "typing_fast",
    title: "Coding frantically",
    url: "https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif",
    previewUrl: "https://media.giphy.com/media/unQ3IJU2RG7DO/200w.gif",
    category: "code"
  },
  {
    id: "brain_working",
    title: "High focus thinking",
    url: "https://media.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif",
    previewUrl: "https://media.giphy.com/media/d3mlE7uhX8KFgEmY/200w.gif",
    category: "study"
  },
  {
    id: "coffee_time",
    title: "Fueling with coffee",
    url: "https://media.giphy.com/media/hPTZgtzfRIB5Nfb5rL/giphy.gif",
    previewUrl: "https://media.giphy.com/media/hPTZgtzfRIB5Nfb5rL/200w.gif",
    category: "coffee"
  },
  // Celebration & Success
  {
    id: "celebrate_dance",
    title: "Exam passed celebration",
    url: "https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif",
    previewUrl: "https://media.giphy.com/media/artj92V8o75VPL7AeQ/200w.gif",
    category: "celebrate"
  },
  {
    id: "applause_clap",
    title: "Great presentation",
    url: "https://media.giphy.com/media/l4q8cJzGdR9J8w3hS/giphy.gif",
    previewUrl: "https://media.giphy.com/media/l4q8cJzGdR9J8w3hS/200w.gif",
    category: "celebrate"
  },
  {
    id: "cheering_crowd",
    title: "Team cheer",
    url: "https://media.giphy.com/media/ely3apij36BJhoZ234/giphy.gif",
    previewUrl: "https://media.giphy.com/media/ely3apij36BJhoZ234/200w.gif",
    category: "celebrate"
  },
  // Reaction & Mood
  {
    id: "mind_blown",
    title: "Mind blown concept",
    url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif",
    previewUrl: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/200w.gif",
    category: "reactions"
  },
  {
    id: "confused_math",
    title: "Confused by theorem",
    url: "https://media.giphy.com/media/WRQBXSCnEFJIuxktnw/giphy.gif",
    previewUrl: "https://media.giphy.com/media/WRQBXSCnEFJIuxktnw/200w.gif",
    category: "reactions"
  },
  {
    id: "nodding_yes",
    title: "Understood / Agree",
    url: "https://media.giphy.com/media/10Jpr9KSaXLchW/giphy.gif",
    previewUrl: "https://media.giphy.com/media/10Jpr9KSaXLchW/200w.gif",
    category: "reactions"
  },
  {
    id: "tired_sleep",
    title: "All-nighter exhausted",
    url: "https://media.giphy.com/media/3o6Mb43OmNs2kdLNu8/giphy.gif",
    previewUrl: "https://media.giphy.com/media/3o6Mb43OmNs2kdLNu8/200w.gif",
    category: "study"
  },
  {
    id: "hacker_typing",
    title: "Hackathon mode",
    url: "https://media.giphy.com/media/ule4akeEDWAYE/giphy.gif",
    previewUrl: "https://media.giphy.com/media/ule4akeEDWAYE/200w.gif",
    category: "code"
  }
];

export const CAMPUS_STICKERS: StickerItem[] = [
  { id: "stk_brain", title: "Big Brain", emoji: "🧠", tag: "academic" },
  { id: "stk_coffee", title: "Coffee First", emoji: "☕", tag: "energy" },
  { id: "stk_allnighter", title: "All Nighter", emoji: "🌙", tag: "study" },
  { id: "stk_aplus", title: "Grade A+", emoji: "💯", tag: "achievement" },
  { id: "stk_fire", title: "Cooking Code", emoji: "🔥", tag: "code" },
  { id: "stk_rocket", title: "Ship It", emoji: "🚀", tag: "launch" },
  { id: "stk_verified", title: "Verified Sol", emoji: "✅", tag: "solution" },
  { id: "stk_library", title: "Quiet In Library", emoji: "🤫", tag: "campus" },
  { id: "stk_exam", title: "Exam Prep", emoji: "📝", tag: "study" },
  { id: "stk_team", title: "Study Circle", emoji: "🤝", tag: "team" },
  { id: "stk_deadline", title: "Deadline Approaching", emoji: "⏰", tag: "urgency" },
  { id: "stk_sparkles", title: "Brilliant", emoji: "✨", tag: "kudos" }
];

export class GifProvider {
  /**
   * Search GIFs by query with local curated fallback.
   */
  async search(query: string): Promise<GifItem[]> {
    const q = query.trim().toLowerCase();
    if (!q) {
      return CURATED_GIFS;
    }

    return CURATED_GIFS.filter(
      (gif) =>
        gif.title.toLowerCase().includes(q) ||
        gif.category.toLowerCase().includes(q)
    );
  }

  /**
   * Get trending or curated default GIFs.
   */
  getTrending(): GifItem[] {
    return CURATED_GIFS;
  }

  /**
   * Filter GIFs by category.
   */
  getByCategory(category: string): GifItem[] {
    if (category === "all") return CURATED_GIFS;
    return CURATED_GIFS.filter((gif) => gif.category === category);
  }

  /**
   * Get campus sticker collection.
   */
  getStickers(): StickerItem[] {
    return CAMPUS_STICKERS;
  }
}

export const gifProvider = new GifProvider();

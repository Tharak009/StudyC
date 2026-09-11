/**
 * Deterministic Academic Relevance Classifier Service
 * Evaluates chat content against channel-specific syllabus tags, academic lexicons,
 * and code/math heuristics to enforce strict study mode without cloud latency.
 */

export interface ChannelStudyConfig {
  isStrictStudyMode: boolean;
  academicContextTags?: string[];
  strictnessThreshold?: number; // 0.20 to 0.70 (default: 0.40)
  allowCodeSnippetsOnly?: boolean;
  channelName?: string;
}

export interface ClassificationResult {
  isAllowed: boolean;
  confidence: number;
  reason?: string;
  matchedKeywords: string[];
  flaggedViolations: string[];
  isFastPass?: boolean;
}

// ── Global Academic Lexicon (Weight: 1.0x) ──────────────────────────────────
const GLOBAL_ACADEMIC_LEXICON = new Set([
  // Coursework & Evaluation
  "assignment", "homework", "hw", "lab", "manual", "exam", "midterm", "final", "quiz",
  "test", "viva", "syllabus", "deadline", "submission", "grades", "marks", "credits",
  "lecture", "slides", "notes", "professor", "faculty", "instructor", "ta", "textbook",
  "chapter", "exercise", "question", "solution", "answer", "rubric", "presentation",
  "project", "thesis", "research", "paper", "reference", "citation", "module", "semester",
  "curriculum", "attendance", "hallticket", "portal",

  // Computer Science & Software
  "algorithm", "complexity", "runtime", "space", "big-o", "data", "structure",
  "array", "linked", "list", "stack", "queue", "deque", "tree", "binary", "bst", "avl",
  "heap", "graph", "hash", "hashtable", "hashmap", "trie", "matrix", "vector",
  "recursion", "memoization", "dynamic", "programming", "greedy", "backtracking",
  "sorting", "quicksort", "mergesort", "binarysearch", "dijkstra", "bfs", "dfs",
  "pointer", "reference", "memory", "malloc", "free", "leak", "stackoverflow",
  "thread", "process", "concurrency", "deadlock", "mutex", "semaphore", "paging",
  "virtual", "cache", "operating", "system", "kernel", "syscall", "cpu", "scheduling",
  "compiler", "parser", "lexer", "ast", "bytecode", "interpreter", "runtime",
  "database", "sql", "nosql", "query", "schema", "table", "index", "b-tree", "acid",
  "transaction", "normalization", "foreign", "key", "join", "migration", "relational",
  "network", "protocol", "tcp", "udp", "ip", "http", "https", "socket", "dns", "dhcp",
  "subnet", "packet", "latency", "throughput", "bandwidth", "encryption", "tls", "ssl",
  "api", "endpoint", "rest", "graphql", "crud", "frontend", "backend", "framework",
  "library", "package", "dependency", "docker", "container", "kubernetes", "git", "commit",
  "branch", "merge", "pull", "pr", "repository", "bug", "debugging", "exception",

  // Mathematics, Physics, & Engineering
  "theorem", "lemma", "proof", "derivation", "formula", "equation", "calculus",
  "derivative", "integral", "integration", "differentiation", "limit", "series",
  "matrix", "determinant", "eigenvalue", "eigenvector", "linear", "algebra",
  "probability", "statistics", "variance", "distribution", "hypothesis", "regression",
  "discrete", "boolean", "logic", "combinatorics", "permutation", "graph", "set",
  "circuit", "resistor", "capacitor", "inductor", "voltage", "current", "impedance",
  "kirchhoff", "ohm", "signal", "fourier", "laplace", "transform", "frequency",
  "mechanics", "thermodynamics", "optics", "kinematics", "electromagnetism"
]);

// ── Banter, Gaming, and Slang Blacklist (Penalties) ──────────────────────────
const GAMING_KEYWORDS = new Set([
  "valorant", "val", "bgmi", "pubg", "csgo", "cs2", "fortnite", "minecraft",
  "gta", "roblox", "steam", "riot", "clutch", "headshot", "smurf", "ranked",
  "lobby", "squad", "duo", "apex", "fifa", "cod", "warzone", "clash", "royale",
  "brawl", "genshin", "playstation", "xbox", "nintendo"
]);

const HANGOUT_KEYWORDS = new Set([
  "party", "chill", "canteen", "bunk", "club", "clubbing", "beer", "drinks",
  "movie", "hangout", "outing", "mall", "dating", "crush", "gossip", "tea",
  "weekend", "plans", "treat", "treats", "bunking", "cafe", "hookah", "roam"
]);

const CASUAL_SLANG = new Set([
  "bro", "bruh", "dude", "lmao", "lmfao", "rofl", "rizz", "skibidi", "cap",
  "nocap", "fr", "bussin", "sus", "mid", "yeet", "simp", "chad", "sheesh",
  "sigma", "slay", "ratio", "w", "l"
]);

export class AcademicClassifierService {
  /**
   * Fast-pass regex patterns: Code, Math, Formulas, LaTeX, Attachments
   */
  private static CODE_PATTERNS = [
    /```[\s\S]*?```/m,             // Fenced code blocks
    /`[^`\n]{2,}`/,                 // Inline code
    /\b(const|let|var|function|def|class|import|export|return|public|private|protected|void|int|float|double|char|bool|std::|cout|cin|printf|scanf|malloc|free|struct|typedef|interface|implements|extends|enum|namespace|SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|JOIN|GROUP BY|ORDER BY|async|await|try|catch|finally|throw|sizeof)\b/,
    /\bO\([1n]|O\(log|O\(n\^|O\(n\s*log\s*n\)/i, // Big-O notation
    /[$][^$\n]+[$]/,                // LaTeX inline math
    /[∑∫√≤≥≠πθλ∈∉⊂∪∩lim±≈]/,       // Math symbols
    /\.(pdf|ipynb|cpp|c|py|java|ts|js|sql|rs|go|h|hpp|zip|tar|gz)\b/i // Academic file extensions
  ];

  private static QUESTION_INDICATORS = [
    "how to", "how do", "why does", "what is", "can someone", "can anyone",
    "explain", "help with", "error in", "how should", "difference between",
    "doubt in", "stuck on", "unable to", "is it possible", "how to solve"
  ];

  /**
   * Evaluate academic relevance of a message in a specific study channel context.
   */
  public evaluateAcademicRelevance(
    content: string,
    config: ChannelStudyConfig
  ): ClassificationResult {
    // 1. If strict study mode is disabled (e.g. #general, #campus-lounge), always permit
    if (!config.isStrictStudyMode) {
      return {
        isAllowed: true,
        confidence: 1.0,
        matchedKeywords: [],
        flaggedViolations: []
      };
    }

    const trimmed = (content || "").trim();
    if (!trimmed) {
      return {
        isAllowed: false,
        confidence: 0.0,
        reason: "Message content cannot be empty in Strict Study Mode.",
        matchedKeywords: [],
        flaggedViolations: ["EMPTY_MESSAGE"]
      };
    }

    const matchedKeywords: string[] = [];
    const flaggedViolations: string[] = [];

    // 2. Code / Math / Formula Fast-Pass
    const hasCodeOrMath = AcademicClassifierService.CODE_PATTERNS.some((pattern) => {
      const match = pattern.exec(trimmed);
      if (match) {
        matchedKeywords.push(match[0].slice(0, 20));
        return true;
      }
      return false;
    });

    if (hasCodeOrMath) {
      return {
        isAllowed: true,
        confidence: 0.98,
        reason: "Code syntax or mathematical notation detected.",
        matchedKeywords,
        flaggedViolations: [],
        isFastPass: true
      };
    }

    // 2b. If channel enforces "Code Snippets Only" and no code was detected
    if (config.allowCodeSnippetsOnly) {
      return {
        isAllowed: false,
        confidence: 0.1,
        reason: "This channel requires code snippets or mathematical equations. Non-code messages are restricted.",
        matchedKeywords: [],
        flaggedViolations: ["CODE_SNIPPETS_ONLY_REQUIRED"]
      };
    }

    // 3. Tokenize & Normalize
    const normalized = trimmed.toLowerCase();
    const tokens = normalized
      .replace(/[^\w\s-]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1);

    if (tokens.length === 0) {
      return {
        isAllowed: false,
        confidence: 0.0,
        reason: "Message must contain readable academic text.",
        matchedKeywords: [],
        flaggedViolations: ["NO_TOKENS"]
      };
    }

    // 4. Evaluate Penalties
    let penaltyScore = 0;
    for (const token of tokens) {
      if (GAMING_KEYWORDS.has(token)) {
        penaltyScore += 2.0;
        flaggedViolations.push(`GAMING:${token}`);
      } else if (HANGOUT_KEYWORDS.has(token)) {
        penaltyScore += 1.5;
        flaggedViolations.push(`CASUAL_BANTER:${token}`);
      } else if (CASUAL_SLANG.has(token)) {
        penaltyScore += 0.5;
        flaggedViolations.push(`SLANG:${token}`);
      }
    }

    // Check for excessive emoji sequences (3+ emojis)
    const emojiMatch = trimmed.match(/\p{Extended_Pictographic}{3,}/u);
    if (emojiMatch) {
      penaltyScore += 1.5;
      flaggedViolations.push("EMOJI_SPAM");
    }

    // 5. Evaluate Positive Academic Density
    let academicScore = 0;
    const channelTags = (config.academicContextTags || []).map((t) =>
      t.toLowerCase().trim()
    );

    // Channel-specific tags have high weight (2.5x)
    for (const tag of channelTags) {
      if (!tag) continue;
      if (normalized.includes(tag)) {
        academicScore += 2.5;
        matchedKeywords.push(tag);
      }
    }

    // Global academic lexicon matching (1.0x)
    for (const token of tokens) {
      if (GLOBAL_ACADEMIC_LEXICON.has(token) && !matchedKeywords.includes(token)) {
        academicScore += 1.0;
        matchedKeywords.push(token);
      }
    }

    // 6. Coursework Question Inquiry Multiplier (+1.5)
    const isQuestion =
      trimmed.endsWith("?") ||
      AcademicClassifierService.QUESTION_INDICATORS.some((ind) =>
        normalized.includes(ind)
      );

    if (isQuestion && (academicScore > 0 || tokens.length >= 3)) {
      academicScore += 1.5;
      matchedKeywords.push("coursework_inquiry");
    }

    // 7. Calculate Final Normalized Confidence Score (0.00 to 1.00)
    const netScore = Math.max(0, academicScore - penaltyScore);
    const tokenFactor = Math.min(1.0, tokens.length / 4);
    let confidence = 0;

    if (penaltyScore > 0 && academicScore === 0) {
      confidence = 0.05;
    } else if (netScore === 0) {
      confidence = 0.15;
    } else {
      confidence = Math.min(1.0, (netScore / (academicScore + penaltyScore + 2.5)) * tokenFactor + 0.25);
    }

    confidence = Math.round(confidence * 100) / 100;

    // 8. Decision Gate against Threshold
    const threshold = config.strictnessThreshold ?? 0.40;
    const isAllowed = confidence >= threshold && penaltyScore < 3.0;

    let reason: string | undefined;
    if (!isAllowed) {
      if (flaggedViolations.length > 0) {
        reason = `Strict Study Mode: Off-topic banter or casual content (${flaggedViolations.slice(0, 2).join(", ")}) was detected. Please keep discussions focused on coursework.`;
      } else {
        reason = `Strict Study Mode: Message does not meet the academic relevance threshold (${Math.round(confidence * 100)}% / ${Math.round(threshold * 100)}%). Ask a coursework question or include relevant technical concepts.`;
      }
    }

    return {
      isAllowed,
      confidence,
      reason,
      matchedKeywords,
      flaggedViolations
    };
  }
}

export const academicClassifierService = new AcademicClassifierService();

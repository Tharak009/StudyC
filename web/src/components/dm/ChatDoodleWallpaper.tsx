import React from "react";

export function ChatDoodleWallpaper() {
  return (
    <div
      className="absolute inset-0 pointer-events-none select-none overflow-hidden opacity-[0.055] dark:opacity-[0.065] transition-opacity duration-300"
      aria-hidden="true"
    >
      <svg
        className="w-full h-full text-slate-800 dark:text-slate-100"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          <pattern
            id="wa-doodle-pattern"
            x="0"
            y="0"
            width="360"
            height="360"
            patternUnits="userSpaceOnUse"
          >
            <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              {/* Coffee Cup */}
              <path d="M40 50 h30 a15 15 0 0 1 15 15 v10 a15 15 0 0 1 -15 15 h-30 a15 15 0 0 1 -15 -15 v-10 a15 15 0 0 1 15 -15 z" />
              <path d="M85 58 h6 a6 6 0 0 1 6 6 v6 a6 6 0 0 1 -6 6 h-6" />
              <path d="M48 44 c2 -4 0 -8 2 -12" />
              <path d="M62 44 c2 -4 0 -8 2 -12" />

              {/* Speech Bubble with Heart */}
              <path d="M140 45 c-16 0 -30 10 -30 22 c0 6 3 12 9 16 l-4 12 l14 -7 c3 1 7 1 11 1 c16 0 30 -10 30 -22 s-14 -22 -30 -22 z" />
              <path d="M136 62 c-2 -3 -6 -3 -8 0 c-2 3 0 6 4 9 c4 -3 6 -6 4 -9 z" />

              {/* Headphones */}
              <path d="M240 70 a25 25 0 0 1 50 0" />
              <rect x="233" y="68" width="10" height="18" rx="4" />
              <rect x="287" y="68" width="10" height="18" rx="4" />

              {/* Clock */}
              <circle cx="50" cy="160" r="20" />
              <polyline points="50,148 50,160 58,164" />
              <line x1="50" y1="137" x2="50" y2="140" />
              <line x1="50" y1="180" x2="50" y2="183" />
              <line x1="27" y1="160" x2="30" y2="160" />
              <line x1="70" y1="160" x2="73" y2="160" />

              {/* Book / Notebook */}
              <path d="M130 150 c10 -4 20 -4 30 0 v25 c-10 -4 -20 -4 -30 0 z" />
              <path d="M160 150 c10 -4 20 -4 30 0 v25 c-10 -4 -20 -4 -30 0 z" />
              <line x1="160" y1="150" x2="160" y2="175" />

              {/* Smiley Face */}
              <circle cx="260" cy="160" r="18" />
              <circle cx="253" cy="155" r="1.5" fill="currentColor" />
              <circle cx="267" cy="155" r="1.5" fill="currentColor" />
              <path d="M253 165 q7 7 14 0" />

              {/* Paper Plane / Send */}
              <path d="M320 50 l-25 40 l12 -6 l8 14 l5 -48 z" />

              {/* Star */}
              <polygon points="50,230 53,238 61,238 55,243 57,251 50,246 43,251 45,243 39,238 47,238" />

              {/* Music Note */}
              <circle cx="135" cy="255" r="5" fill="currentColor" />
              <circle cx="155" cy="250" r="5" fill="currentColor" />
              <path d="M140 255 v-22 h20 v22" />
              <line x1="140" y1="238" x2="160" y2="233" />

              {/* Glasses */}
              <circle cx="240" cy="245" r="10" />
              <circle cx="270" cy="245" r="10" />
              <path d="M250 245 c5 -3 15 -3 20 0" />
              <path d="M230 244 l-12 -3" />
              <path d="M280 244 l12 -3" />

              {/* Sparkle / Compass */}
              <path d="M315 150 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 z" />

              {/* Game Controller */}
              <rect x="40" y="300" width="34" height="20" rx="8" />
              <line x1="47" y1="310" x2="55" y2="310" />
              <line x1="51" y1="306" x2="51" y2="314" />
              <circle cx="65" cy="308" r="1.5" fill="currentColor" />
              <circle cx="68" cy="312" r="1.5" fill="currentColor" />

              {/* Search Magnifier */}
              <circle cx="150" cy="320" r="10" />
              <line x1="157" y1="327" x2="168" y2="338" />

              {/* Lightbulb / Idea */}
              <path d="M250 310 a12 12 0 1 1 20 0 c-2 3 -4 6 -4 10 h-12 c0 -4 -2 -7 -4 -10 z" />
              <line x1="254" y1="324" x2="266" y2="324" />
              <line x1="256" y1="327" x2="264" y2="327" />

              {/* Bookmark */}
              <path d="M320 230 v30 l8 -6 l8 6 v-30 z" />

              {/* Puzzle Piece */}
              <path d="M320 305 h10 a4 4 0 0 1 8 0 h10 v10 a4 4 0 0 1 0 8 v10 h-10 a4 4 0 0 0 -8 0 h-10 v-10 a4 4 0 0 0 0 -8 z" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#wa-doodle-pattern)" />
      </svg>
    </div>
  );
}

export default ChatDoodleWallpaper;

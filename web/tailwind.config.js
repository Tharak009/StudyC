/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#080b12",
          900: "#0d111b",
          800: "#151b29",
          700: "#20283a"
        },
        signal: {
          300: "#89b8ff",
          400: "#5f9cff",
          500: "#3478f6",
          600: "#235ed0"
        }
      },
      boxShadow: {
        focus: "0 0 0 4px rgba(52, 120, 246, 0.16)"
      },
      animation: {
        "fade-up": "fadeUp 500ms cubic-bezier(.2,.8,.2,1) both"
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      }
    }
  },
  plugins: []
};

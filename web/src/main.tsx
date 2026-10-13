// Polyfill ECMAScript features required by PDF.js (v6.4.299) in browsers
if (typeof Map !== "undefined" && !(Map.prototype as any).getOrInsertComputed) {
  (Map.prototype as any).getOrInsertComputed = function (key: any, callback: () => any) {
    if (this.has(key)) return this.get(key);
    const val = callback();
    this.set(key, val);
    return val;
  };
}

if (typeof Uint8Array !== "undefined" && !(Uint8Array.prototype as any).toHex) {
  (Uint8Array.prototype as any).toHex = function () {
    return Array.from(this as any).map((b: any) => Number(b).toString(16).padStart(2, "0")).join("");
  };
}

if (typeof Math !== "undefined" && !(Math as any).sumPrecise) {
  (Math as any).sumPrecise = function (iterable: Iterable<number>) {
    let sum = 0;
    for (const n of iterable) sum += n;
    return sum;
  };
}

if (typeof Promise !== "undefined" && !(Promise as any).withResolvers) {
  (Promise as any).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./app";
import { AuthBootstrap } from "./routes/auth-bootstrap";
import { useThemeStore } from "./store/theme.store";
import "katex/dist/katex.min.css";
import "./styles/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false
    },
    mutations: { retry: 0 }
  }
});

const applyTheme = (theme: "light" | "dark") => {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
};

applyTheme(useThemeStore.getState().theme);
useThemeStore.subscribe((state) => applyTheme(state.theme));

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthBootstrap>
        <App />
      </AuthBootstrap>
    </BrowserRouter>
  </QueryClientProvider>
);

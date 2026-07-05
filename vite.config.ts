import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";

// In dev (`vite`), this serves the demo app in `dev/`.
// In build (`vite build`), it produces the publishable library from `src/`.
export default defineConfig(({ command }) => ({
  root: command === "serve" ? "dev" : ".",
  plugins: [
    react(),
    // Emit .d.ts type declarations for consumers. Only needed for the lib build.
    dts({
      include: ["src"],
      rollupTypes: true,
      tsconfigPath: resolve(__dirname, "tsconfig.json"),
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "BootstrapEmailWysiwyg",
      fileName: "bootstrap-email-wysiwyg",
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      // Don't bundle React or Lexical — consumers bring their own.
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        /^@lexical\//,
        "lexical",
      ],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
  },
}));

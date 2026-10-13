import { defineConfig, loadEnv } from "vite";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    base: "./",
    server: {
      proxy: {
        "^/(api\\.php|media\\.php|pdf-viewer\\.(php|js|css)|favicon\\.svg|index\\.php|setup\\.php|reading\\.js|reader\\.css|interface\\.css|reader-state\\.php|emoji-font\\.css|theme\\.js|theme-colors\\.js|theme-toggle\\.css|gallery\\.css|fonts/|icons\\.(svg|json)|vendor/|assets/)":
          {
            target: env.FEUILLET_PHP_URL || "http://127.0.0.1:8080",
            changeOrigin: false,
          },
      },
    },
    build: {
      outDir: "../public/assets",
      emptyOutDir: true,
      minify: "esbuild",
      rollupOptions: {
        input: "src/main.tsx",
        output: {
          entryFileNames: "app.js",
          chunkFileNames: "[name]-[hash].js",
          assetFileNames: (a) =>
            a.names?.some((n) => n.endsWith(".css"))
              ? "app.css"
              : "[name]-[hash][extname]",
        },
      },
    },
  };
});

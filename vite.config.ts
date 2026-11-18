import { defineConfig, loadEnv, type UserConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { devtools } from "@tanstack/devtools-vite";
import { nitro } from "nitro/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import tsConfigPaths from "vite-tsconfig-paths";

/**
 * TanStack Start on Vite. `vite build` produces a Cloudflare Worker (Nitro `cloudflare-module`):
 * the server bundle and a generated wrangler.json land in `.output/`, and `wrangler deploy` ships it.
 * See docs/hosting.md for the deploy and cutover steps.
 */
export default defineConfig(({ command, mode }): UserConfig => {
  // `VITE_*` values are baked in statically so server code (which has no `import.meta.env`
  // at runtime on Workers) sees the same values as the browser bundle.
  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), "VITE_"))) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  return {
    define: envDefine,
    css: { transformer: "lightningcss" },
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      ignoreOutdatedRequests: true,
    },
    server: { host: "::", port: 8080 },
    plugins: [
      // Dev only: stamps `data-tsd-source` on elements so tools can map a click back to its source file.
      ...(mode === "development"
        ? [
            devtools({
              logging: false,
              eventBusConfig: { enabled: false },
              enhancedLogs: { enabled: false },
              consolePiping: { enabled: false },
              removeDevtoolsOnBuild: false,
              injectSource: { enabled: true },
            }),
          ]
        : []),
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
        server: { entry: "server" },
        importProtection: {
          behavior: "error",
          client: { files: ["**/server/**"], specifiers: ["server-only"] },
        },
      }),
      ...(command === "build"
        ? [
            nitro({
              preset: "cloudflare-module",
              cloudflare: {
                nodeCompat: true,
                deployConfig: true,
                // The Worker's name: it is also the `*.workers.dev` hostname and what Cloudflare's
                // Git integration matches, so keep it stable.
                // `keep_vars` stops a deploy from wiping variables set in the dashboard: the generated
                // config declares none, so without it every deploy would delete them.
                wrangler: { name: "crystal-ball-portal", keep_vars: true },
              },
            }),
          ]
        : []),
      viteReact(),
    ],
  };
});

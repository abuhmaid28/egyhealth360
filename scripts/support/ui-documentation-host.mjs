/** Build an isolated same-stack Next/React rendering host under ignored .next.
 * Production app has no preview route, fixture import, mode flag or write driver.
 * Normal .next/static and server artifacts are never overwritten by this host. */
import { execFile, spawn } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { resolve, join, relative } from "node:path";
import { promisify } from "node:util";
const run = promisify(execFile);
export async function startDocumentationHost(port = 3205) {
  const root = resolve("."),
    base = resolve("apps/web/.next");
  await mkdir(base, { recursive: true });
  const folder = await mkdtemp(join(base, "documentation-preview-"));
  let server;
  let logs = "";
  try {
    await mkdir(join(folder, "app"));
    const source = (path) =>
      "./" + relative(join(folder, "app"), path).split("\\").join("/");
    await symlink(
      resolve("apps/web/node_modules"),
      join(folder, "node_modules"),
      "dir",
    );
    await writeFile(
      join(folder, "package.json"),
      JSON.stringify({
        name: "egyhealth-controlled-documentation-host",
        private: true,
        type: "module",
      }),
    );
    await writeFile(
      join(folder, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          target: "ES2023",
          lib: ["ES2023", "DOM", "DOM.Iterable"],
          module: "ESNext",
          moduleResolution: "bundler",
          jsx: "react-jsx",
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          skipLibCheck: true,
          resolveJsonModule: true,
          plugins: [{ name: "next" }],
        },
        include: ["app/**/*.tsx", "next-env.d.ts", ".next/types/**/*.ts"],
        exclude: ["node_modules"],
      }),
    );
    await writeFile(
      join(folder, "next.config.mjs"),
      `export default ${JSON.stringify({ turbopack: { root }, poweredByHeader: false })};\n`,
    );
    await writeFile(
      join(folder, "app/page.tsx"),
      `export { default } from ${JSON.stringify(source(resolve("apps/web/src/previews/documentation")))};\n`,
    );
    await writeFile(
      join(folder, "app/layout.tsx"),
      `import type {ReactNode} from 'react';\nimport ${JSON.stringify(source(resolve("apps/web/app/globals.css")))};\nimport {LocaleProvider} from ${JSON.stringify(source(resolve("apps/web/src/lib/i18n/context")))};\nexport default function Layout({children}:{children:ReactNode}) {return <html lang="en"><body><LocaleProvider>{children}</LocaleProvider></body></html>;}\n`,
    );
    const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1" };
    await run(
      process.execPath,
      ["apps/web/node_modules/next/dist/bin/next", "build", folder],
      { env, maxBuffer: 8 * 1024 * 1024 },
    ).catch((e) => {
      throw new Error(
        `Controlled host build failed:\n${e.stdout ?? ""}\n${e.stderr ?? ""}`,
      );
    });
    server = spawn(
      process.execPath,
      [
        "apps/web/node_modules/next/dist/bin/next",
        "start",
        folder,
        "--hostname",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      { env, stdio: ["ignore", "pipe", "pipe"] },
    );
    server.stdout.on("data", (data) => {
      logs += String(data);
    });
    server.stderr.on("data", (data) => {
      logs += String(data);
    });
    let ready = false;
    for (let n = 0; n < 150; n++) {
      try {
        if ((await fetch(`http://127.0.0.1:${port}`)).ok) {
          ready = true;
          break;
        }
      } catch {
        /* bounded startup */
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    if (!ready)
      throw new Error("Controlled preview host did not start. " + logs);
    return {
      origin: `http://127.0.0.1:${port}`,
      async stop() {
        if (server.exitCode === null) {
          const exited = new Promise((r) => server.once("exit", r));
          server.kill("SIGTERM");
          await exited;
        }
        await rm(folder, { recursive: true, force: true });
      },
    };
  } catch (error) {
    server?.kill("SIGTERM");
    await rm(folder, { recursive: true, force: true });
    throw error;
  }
}
export async function assertNoDocumentationFixturesInLiveBuild() {
  const { readdir } = await import("node:fs/promises");
  async function scan(folder) {
    for (const item of await readdir(folder, { withFileTypes: true })) {
      const path = join(folder, item.name);
      if (item.isDirectory()) await scan(path);
      else if (item.name.endsWith(".js")) {
        const text = await readFile(path, "utf8");
        if (
          text.includes("EH5_CONTROLLED_PRIVATE_NOTE_NEVER_PUBLIC_30") ||
          text.includes("EH5_CONTROLLED_PREVIEW_DRIVER_ONLY")
        )
          throw new Error(
            "Controlled documentation fixture leaked into normal Live build.",
          );
      }
    }
  }
  await scan(resolve("apps/web/.next/static"));
  await scan(resolve("apps/web/.next/server"));
}

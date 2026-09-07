import { readdir, rm, stat } from "node:fs/promises";
import { extname, join } from "node:path";

async function walk(directory) {
  for (const name of await readdir(directory)) {
    const path = join(directory, name);
    if ((await stat(path)).isDirectory()) {
      await walk(path);
      continue;
    }
    if (![".png", ".jpg", ".jpeg"].includes(extname(path).toLowerCase())) continue;
    const webp = path.replace(/\.(?:png|jpe?g)$/i, ".webp");
    try {
      await stat(webp);
      await rm(path);
    } catch {
      // Keep raster assets that do not have a generated WebP counterpart.
    }
  }
}

await walk("dist/assets");

// Design-source exports and legacy thumbnails are kept in the repository for
// reference, but the application never requests them at runtime.
await Promise.all([
  rm("dist/assets/figma/source", { recursive: true, force: true }),
  rm("dist/assets/life/thumbs", { recursive: true, force: true }),
]);

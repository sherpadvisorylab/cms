import { promises as fs } from "fs";
import path from "path";

async function collectSeedFiles(folder: string, suffix: string): Promise<string[]> {
  const entries = await fs.readdir(folder, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(folder, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectSeedFiles(fullPath, suffix));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(suffix)) {
      files.push(fullPath);
    }
  }

  return files;
}

export async function readSeedEntries<T>(folderName: string, suffix: string): Promise<T[]> {
  const folder = path.join(process.cwd(), "seed", folderName);
  const files = await collectSeedFiles(folder, suffix);

  const parsed = await Promise.all(
    files.map(async (filePath) => {
      const raw = await fs.readFile(filePath, "utf8");
      return JSON.parse(raw) as T | T[];
    }),
  );

  return parsed.flatMap((entry) => (Array.isArray(entry) ? entry : [entry]));
}

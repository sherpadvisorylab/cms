import { join, basename, resolve, dirname } from "path";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
} from "fs";

const TEMPLATES_DIR = join(__dirname, "..", "templates");

export type Provider = "supabase" | "firebase";

export interface ScaffoldOptions {
  /** Override project name (defaults to directory basename) */
  name?: string;
  /** Use workspace:* / npm "*" for @sherpacms/* deps (monorepo mode) */
  workspace: boolean;
  /** Backend provider — determines which auth/storage/db files are copied */
  provider: Provider;
}

export async function scaffold(
  projectDir: string,
  options: ScaffoldOptions
): Promise<void> {
  const targetDir = resolve(process.cwd(), projectDir);
  const projectName = options.name ?? basename(targetDir);
  const cmsDep = options.workspace ? "*" : "^0.1.0";

  console.log(`\nCreating CMS project "${projectName}" [provider: ${options.provider}]...`);
  console.log(`Target: ${targetDir}\n`);

  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  const replacements: Record<string, string> = {
    __PROJECT_NAME__: projectName,
    __CMS_DEP__: cmsDep,
  };

  // 1. Copy shared base files
  copyDir(join(TEMPLATES_DIR, "base"), targetDir, replacements);

  // 2. Copy provider-specific files (overwrites any base conflicts)
  copyDir(join(TEMPLATES_DIR, "providers", options.provider), targetDir, replacements);

  if (options.workspace) {
    addToRootWorkspaces(targetDir);
  }

  printNextSteps(projectName, projectDir, options);
}

/**
 * Recursively copy a directory to target, replacing placeholders.
 * Files/dirs starting with "_" have the underscore replaced with "." in the output
 * (e.g. _gitignore → .gitignore, _env.local.example → .env.local.example).
 */
function copyDir(
  src: string,
  dest: string,
  replacements: Record<string, string>
): void {
  const entries = readdirSync(src);

  for (const entry of entries) {
    const srcPath = join(src, entry);
    const destName = entry.startsWith("_") ? "." + entry.slice(1) : entry;
    const destPath = join(dest, destName);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath, replacements);
    } else {
      let content = readFileSync(srcPath, "utf-8");
      for (const [token, value] of Object.entries(replacements)) {
        content = content.split(token).join(value);
      }
      writeFileSync(destPath, content, "utf-8");
    }
  }
}

/**
 * Add the generated project directory to the root workspace's "workspaces" array.
 */
function addToRootWorkspaces(targetDir: string): void {
  let dir = dirname(targetDir);
  const visited = new Set<string>();

  while (dir && !visited.has(dir)) {
    visited.add(dir);
    const pkgPath = join(dir, "package.json");

    if (existsSync(pkgPath)) {
      const raw = readFileSync(pkgPath, "utf-8");
      const pkg = JSON.parse(raw);

      if (Array.isArray(pkg.workspaces)) {
        const rel = targetDir
          .replace(dir, "")
          .replace(/\\/g, "/")
          .replace(/^\//, "");

        const parentGlob =
          dirname(rel).replace(/\\/g, "/").replace(/\.$/, "") + "/*";

        if (!pkg.workspaces.includes(parentGlob)) {
          pkg.workspaces.push(parentGlob);
          writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
          console.log(`Updated ${pkgPath} → added "${parentGlob}" to workspaces`);
        }
        return;
      }
    }

    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  console.warn("Warning: could not find a root package.json with workspaces.");
}

function printNextSteps(
  name: string,
  dir: string,
  options: ScaffoldOptions
): void {
  const { provider, workspace } = options;

  console.log(`\n✅  Project "${name}" created! [${provider}]\n`);
  console.log("Next steps:\n");
  console.log(`  cd ${dir}`);

  if (!workspace) {
    console.log("  npm install");
  } else {
    console.log("  # From the monorepo root:");
    console.log("  npm install");
  }

  console.log("  cp .env.local.example .env.local");

  if (provider === "supabase") {
    console.log("  # Fill in SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL");
    console.log("  npx supabase db push          # push SQL migrations to Supabase");
    console.log("  npm run seed                  # create admin user and seed starter content");
  } else {
    console.log("  # Fill in FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, etc.");
    console.log("  npm run seed                  # create admin user and seed starter content");
    console.log("  firebase deploy --only firestore:rules,storage");
  }

  console.log("  npm run dev\n");
}

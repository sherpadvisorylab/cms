#!/usr/bin/env node
import { Command } from "commander";
import { scaffold, type Provider } from "./scaffold";

const program = new Command();

program
  .name("create-cms-app")
  .description("Scaffold a new CMS vertical project")
  .version("0.1.0")
  .argument("<project-dir>", "directory to create the project in (e.g. my-project or examples/myapp)")
  .option("-w, --workspace", "use npm workspace '*' for @cms/* dependencies (monorepo mode)", false)
  .option("-n, --name <name>", "project name (defaults to the directory basename)")
  .option(
    "-p, --provider <provider>",
    "backend provider: supabase | firebase (default: supabase)",
    "supabase",
  )
  .action(async (projectDir: string, options: { workspace: boolean; name?: string; provider: string }) => {
    const provider = options.provider as Provider;
    if (provider !== "supabase" && provider !== "firebase") {
      console.error(`Unknown provider "${provider}". Valid options: supabase, firebase`);
      process.exit(1);
    }

    try {
      await scaffold(projectDir, {
        name:      options.name,
        workspace: options.workspace,
        provider,
      });
    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program.parse();

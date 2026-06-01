#!/usr/bin/env node
import { Command } from "commander";
import { scaffold } from "./scaffold";

const program = new Command();

program
  .name("create-cms-app")
  .description("Scaffold a new CMS vertical project")
  .version("0.1.0")
  .argument("<project-dir>", "directory to create the project in (e.g. my-project or examples/sandbox)")
  .option("-w, --workspace", "use npm workspace '*' for @cms/* dependencies (monorepo mode)", false)
  .option("-n, --name <name>", "project name (defaults to the directory basename)")
  .action(async (projectDir: string, options: { workspace: boolean; name?: string }) => {
    try {
      await scaffold(projectDir, {
        name: options.name,
        workspace: options.workspace,
      });
    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program.parse();

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { collectReleaseNotes } from "./release-notes-shared.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const DEFAULT_OUTPUT = path.join(
  ROOT,
  "desktop",
  ".codex-temp",
  "release-assets",
  "RELEASE_NOTES.md",
);

const currentTag = (process.env.RELEASE_TAG ?? process.argv[2] ?? "").trim();
if (!currentTag) {
  console.error(
    "[generate-release-notes] Missing release tag. Provide RELEASE_TAG or pass the tag as the first argument.",
  );
  process.exit(1);
}

const outputPath = path.resolve(
  ROOT,
  process.env.RELEASE_NOTES_OUTPUT ?? DEFAULT_OUTPUT,
);
const repository = (process.env.GITHUB_REPOSITORY ?? "").trim() || null;
const releaseNotes = collectReleaseNotes(ROOT, currentTag, repository);

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, releaseNotes.markdown, "utf8");

console.log(
  `[generate-release-notes] Wrote ${releaseNotes.sections.reduce((count, section) => count + section.items.length, 0)} user-facing note entries to ${path.relative(ROOT, outputPath)}`,
);
if (releaseNotes.previousTag) {
  console.log(`[generate-release-notes] Previous release tag: ${releaseNotes.previousTag}`);
} else {
  console.log("[generate-release-notes] No previous semver tag found; generated initial release notes.");
}

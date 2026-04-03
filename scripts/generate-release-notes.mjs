import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

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
const SEMVER_TAG_PATTERN = /^v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u;

function runGit(args) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function getTagList() {
  const raw = runGit(["tag", "--list", "--sort=-v:refname"]);
  return raw.length === 0
    ? []
    : raw.split(/\r?\n/gu).map((line) => line.trim()).filter(Boolean);
}

function getPreviousReleaseTag(currentTag) {
  return (
    getTagList().find(
      (tag) => tag !== currentTag && SEMVER_TAG_PATTERN.test(tag),
    ) ?? null
  );
}

function getCommitLines(rangeSpec) {
  const raw = runGit([
    "log",
    "--no-merges",
    "--format=%H%x09%s",
    rangeSpec,
  ]);
  return raw.length === 0
    ? []
    : raw.split(/\r?\n/gu).filter(Boolean).map((line) => {
        const [hash, ...subjectParts] = line.split("\t");
        return {
          hash,
          shortHash: hash.slice(0, 7),
          subject: subjectParts.join("\t").trim(),
        };
      });
}

function classifyCommit(subject) {
  const match = /^(?<type>[a-z]+)(?:\([^)]+\))?!?:\s*(?<summary>.+)$/u.exec(subject);
  const summary = match?.groups?.summary?.trim() || subject.trim();
  const type = match?.groups?.type?.toLowerCase() || "other";

  switch (type) {
    case "feat":
      return { section: "Features", summary };
    case "fix":
      return { section: "Fixes", summary };
    case "docs":
      return { section: "Documentation", summary };
    case "refactor":
      return { section: "Refactors", summary };
    case "perf":
      return { section: "Performance", summary };
    case "test":
      return { section: "Tests", summary };
    case "chore":
      return { section: "Maintenance", summary };
    default:
      return { section: "Other Changes", summary };
  }
}

function buildCompareLine(repository, previousTag, currentTag) {
  if (!repository || !previousTag) {
    return null;
  }

  return `Compared with [${previousTag}](https://github.com/${repository}/compare/${previousTag}...${currentTag}).`;
}

function formatCommitLine(commit, repository) {
  if (!repository) {
    return `- ${commit.summary} (\`${commit.shortHash}\`)`;
  }

  return `- ${commit.summary} ([\`${commit.shortHash}\`](https://github.com/${repository}/commit/${commit.hash}))`;
}

function buildReleaseNotes({
  currentTag,
  previousTag,
  repository,
  commits,
}) {
  const date = new Date().toISOString().slice(0, 10);
  const grouped = new Map();

  for (const commit of commits) {
    const classified = classifyCommit(commit.subject);
    const sectionCommits = grouped.get(classified.section) ?? [];
    sectionCommits.push({
      ...commit,
      summary: classified.summary,
    });
    grouped.set(classified.section, sectionCommits);
  }

  const orderedSections = [
    "Features",
    "Fixes",
    "Documentation",
    "Refactors",
    "Performance",
    "Tests",
    "Maintenance",
    "Other Changes",
  ];

  const lines = [
    `# RoleRover ${currentTag}`,
    "",
    `Release date: ${date}`,
  ];

  const compareLine = buildCompareLine(repository, previousTag, currentTag);
  if (compareLine) {
    lines.push(compareLine);
  } else {
    lines.push("Initial tagged desktop release for the current GitHub-based release workflow.");
  }

  lines.push("");

  if (commits.length === 0) {
    lines.push("No commit differences were found for this tag.");
    lines.push("");
    return `${lines.join("\n")}`;
  }

  for (const section of orderedSections) {
    const sectionCommits = grouped.get(section);
    if (!sectionCommits || sectionCommits.length === 0) {
      continue;
    }

    lines.push(`## ${section}`);
    lines.push("");
    for (const commit of sectionCommits) {
      lines.push(formatCommitLine(commit, repository));
    }
    lines.push("");
  }

  return `${lines.join("\n")}`;
}

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
const previousTag = getPreviousReleaseTag(currentTag);
const rangeSpec = previousTag ? `${previousTag}..${currentTag}` : currentTag;
const repository = (process.env.GITHUB_REPOSITORY ?? "").trim() || null;
const commits = getCommitLines(rangeSpec);
const notes = buildReleaseNotes({
  currentTag,
  previousTag,
  repository,
  commits,
});

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, notes, "utf8");

console.log(
  `[generate-release-notes] Wrote ${commits.length} commit entries to ${path.relative(ROOT, outputPath)}`,
);
if (previousTag) {
  console.log(`[generate-release-notes] Previous release tag: ${previousTag}`);
} else {
  console.log("[generate-release-notes] No previous semver tag found; generated initial release notes.");
}

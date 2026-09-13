#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { __unstable__loadDesignSystem } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";

const ROOT_FONT_SIZE = 16;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stylesheetPath = path.join(projectRoot, "src", "index.css");

function parseArguments() {
  const arguments_ = new Set(process.argv.slice(2));
  const fix = arguments_.delete("--fix");

  if (arguments_.size > 0) {
    throw new Error(`Unknown argument${arguments_.size === 1 ? "" : "s"}: ${[...arguments_].join(", ")}`);
  }

  return { fix };
}

function plural(count, singular, pluralForm = `${singular}s`) {
  return count === 1 ? singular : pluralForm;
}

function toRelativePath(file) {
  return path.relative(projectRoot, file).split(path.sep).join("/");
}

function createLineStarts(content) {
  const starts = [0];

  for (let index = 0; index < content.length; index += 1) {
    if (content[index] === "\n") starts.push(index + 1);
  }

  return starts;
}

function getLineAndColumn(lineStarts, position) {
  let low = 0;
  let high = lineStarts.length;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);

    if (lineStarts[middle] <= position) low = middle + 1;
    else high = middle;
  }

  const lineIndex = low - 1;
  return { line: lineIndex + 1, column: position - lineStarts[lineIndex] + 1 };
}

async function getCanonicalReplacements(designSystem, candidates) {
  const generatedCss = designSystem.candidatesToCss(candidates);
  const replacements = new Map();

  // IntelliSense checks candidates one at a time. This is important because the
  // canonicalizer intentionally de-duplicates the result of a class-list call.
  for (let index = 0; index < candidates.length; index += 1) {
    if (generatedCss[index] === null) continue;

    const candidate = candidates[index];
    const canonical = designSystem.canonicalizeCandidates([candidate], { rem: ROOT_FONT_SIZE })[0];

    if (canonical !== undefined && canonical !== candidate) {
      replacements.set(candidate, canonical);
    }
  }

  return replacements;
}

async function main() {
  const { fix } = parseArguments();
  const stylesheet = await readFile(stylesheetPath, "utf8");
  const designSystem = await __unstable__loadDesignSystem(stylesheet, {
    base: path.dirname(stylesheetPath),
  });
  const scanner = new Scanner({
    sources: [{ base: projectRoot, pattern: "**/*", negated: false }],
  });

  // scan() applies Tailwind's own project file discovery and candidate
  // extraction rules, and also populates scanner.files for position-aware linting.
  const candidates = scanner.scan();
  const replacements = await getCanonicalReplacements(designSystem, candidates);

  if (replacements.size === 0) {
    console.log("All Tailwind classes use their canonical form.");
    return;
  }

  const diagnostics = [];
  const changedFiles = [];

  for (const file of [...scanner.files].sort()) {
    const content = await readFile(file, "utf8");
    const extension = path.extname(file).slice(1).toLowerCase() || "txt";
    const seen = new Set();
    const edits = [];

    for (const { candidate, position } of scanner.getCandidatesWithPositions({ content, extension })) {
      const replacement = replacements.get(candidate);
      if (replacement === undefined) continue;

      const key = `${position}\0${candidate}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (content.slice(position, position + candidate.length) !== candidate) {
        throw new Error(`Tailwind returned an invalid source position for ${toRelativePath(file)}.`);
      }

      edits.push({ candidate, position, replacement });
    }

    if (edits.length === 0) continue;

    const lineStarts = createLineStarts(content);
    for (const edit of edits) {
      const { line, column } = getLineAndColumn(lineStarts, edit.position);
      diagnostics.push({ ...edit, file, line, column });
    }

    if (fix) {
      let fixedContent = content;

      for (const edit of edits.sort((left, right) => right.position - left.position)) {
        fixedContent = `${fixedContent.slice(0, edit.position)}${edit.replacement}${fixedContent.slice(edit.position + edit.candidate.length)}`;
      }

      await writeFile(file, fixedContent);
      changedFiles.push(file);
    }
  }

  diagnostics.sort((left, right) => left.file.localeCompare(right.file) || left.position - right.position);

  if (fix) {
    console.log(`Fixed ${diagnostics.length} non-canonical ${plural(diagnostics.length, "class", "classes")} in ${changedFiles.length} ${plural(changedFiles.length, "file")}.`);
    return;
  }

  for (const diagnostic of diagnostics) {
    console.error(
      `${toRelativePath(diagnostic.file)}:${diagnostic.line}:${diagnostic.column}: error: The class \`${diagnostic.candidate}\` can be written as \`${diagnostic.replacement}\` [tailwind-canonical]`,
    );
  }

  console.error(
    `Found ${diagnostics.length} non-canonical Tailwind ${plural(diagnostics.length, "class", "classes")}. Run npm run lint:tailwind:fix to fix ${plural(diagnostics.length, "it", "them")}.`,
  );
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Tailwind canonical-class lint failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 2;
});

/**
 * Content integrity checks. Run with `npm test` (Node's built-in runner; the
 * content modules are plain TypeScript, which Node executes directly).
 *
 * These guard the rules that keep the public site honest and unbroken:
 * unique routes, complete case studies, safe external links, no filler text.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { projects } from "../src/content/projects.ts";
import { sections } from "../src/content/sections.ts";
import { site } from "../src/content/site.ts";

const FILLER = /\b(todo|tbd|lorem|coming soon|in preparation|placeholder text)\b/i;

/** Every string anywhere inside a value. */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

test("project slugs are unique and URL-safe", () => {
  const slugs = projects.map((p) => p.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const slug of slugs) assert.match(slug, /^[a-z0-9]+(-[a-z0-9]+)*$/);
});

test("every case study has content in every section", () => {
  for (const { slug, study, stack, highlights, artAlt } of projects) {
    assert.ok(study.problem.length > 0, `${slug}: problem`);
    assert.ok(study.pipeline.stages.length >= 3, `${slug}: pipeline`);
    assert.ok(study.architecture.length > 0, `${slug}: architecture`);
    assert.ok(study.decisions.length > 0, `${slug}: decisions`);
    assert.ok(study.evaluation.length > 0, `${slug}: evaluation`);
    assert.ok(study.limitations.length > 0, `${slug}: limitations`);
    assert.ok(study.next.length > 0, `${slug}: next`);
    assert.ok(stack.length > 0 && stack.every((g) => g.items.length > 0), `${slug}: stack`);
    assert.ok(highlights.length > 0, `${slug}: highlights`);
    assert.ok(artAlt.length > 20, `${slug}: illustration description`);
  }
});

test("public copy contains no filler or unfinished markers", () => {
  for (const text of strings([projects, sections, site])) {
    assert.doesNotMatch(text, FILLER, `filler text: "${text.slice(0, 60)}"`);
    assert.ok(text.trim().length > 0, "empty string in content");
  }
});

test("external links use https", () => {
  const links = [...site.links, site.contact.primary, ...projects.flatMap((p) => p.links)];
  for (const { href } of links) assert.match(href, /^https:\/\//, href);
});

test("section ids are unique", () => {
  const ids = sections.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

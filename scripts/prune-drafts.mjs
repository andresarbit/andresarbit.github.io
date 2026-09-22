// Removes the media of draft projects from dist/, so nothing unapproved is ever published.
import { rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { projects } from '../src/content.js';

const drafts = projects.filter((p) => p.draft);
for (const p of drafts) {
  const dir = new URL(`../dist/media/${p.slug}/`, import.meta.url);
  if (existsSync(dir)) {
    await rm(dir, { recursive: true, force: true });
    console.log(`pruned draft media: ${p.slug}`);
  }
}
console.log(`published projects: ${projects.length - drafts.length} · drafts kept local: ${drafts.length}`);

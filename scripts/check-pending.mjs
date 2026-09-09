/**
 * Enforce the Bible section 6 rule: a commit message (or a PR body) has to say
 * what the change left undone.
 *
 * Two accepted forms, because the honest answer is sometimes "nothing":
 *
 *   Pending: none
 *
 *   ## Pending
 *   - **[P1]** the levels are unreviewed - a wrong level is how a P0 waits
 *   - **[P3]** three entries carried over rather than re-verified
 *
 * The check is deliberately loose about layout and strict about the one thing
 * that matters: either an explicit "none", or at least one item carrying a
 * P0-P3 level. A level is what makes the register sortable, so an untagged
 * "still to do: X" is not enough.
 *
 * Usage:
 *   node scripts/check-pending.mjs <file>     # git passes the message path
 *   node scripts/check-pending.mjs --stdin    # e.g. a PR body being drafted
 *
 * Exit 0 = fine, 1 = missing. Called from .husky/commit-msg.
 */

import { readFileSync } from 'node:fs';

// Git writes these itself during merges, reverts and autosquash. Rejecting them
// would block ordinary history operations over a rule about authored work.
const GENERATED = [/^Merge\b/i, /^Revert\b/i, /^fixup!/, /^squash!/, /^amend!/];

const HAS_NONE = /^\s*(?:#{1,6}\s*)?pending\s*[:=-]?\s*none\b/im;
const HAS_LEVEL = /\[P[0-3]\]/;

function read(source) {
  if (source === '--stdin') return readFileSync(0, 'utf8');
  return readFileSync(source, 'utf8');
}

function fail(subject) {
  process.stderr.write(
    `\nThis commit does not say what it left undone.\n\n` +
      `  "${subject.slice(0, 68)}"\n\n` +
      `Bible section 6 (owner rule 2026-09-09) asks every commit and PR to declare\n` +
      `its pending work, so it stays visible after the conversation ends. Add one of:\n\n` +
      `  Pending: none\n\n` +
      `or\n\n` +
      `  ## Pending\n` +
      `  - **[P2]** what is not done - why it matters\n\n` +
      `Levels: P0 money or data wrong now · P1 a decision blocked or a live surface\n` +
      `lying · P2 a gap with a workaround · P3 hygiene.\n\n` +
      `Anything you list here also goes in docs/Wiki/wiki/pending-register.md in the\n` +
      `same task - the commit is where the claim is made, the register is where it\n` +
      `can be read as a list.\n\n` +
      `"Pending: none" is a real answer. It just has to be said rather than assumed.\n\n`,
  );
  process.exit(1);
}

const source = process.argv[2];
if (!source) {
  process.stderr.write(
    'usage: check-pending.mjs <commit-msg-file> | --stdin\n',
  );
  process.exit(2);
}

const raw = read(source);
// Git's comment lines are not part of the message the author wrote.
const body = raw
  .split('\n')
  .filter((line) => !line.startsWith('#'))
  .join('\n');

const subject = body.trim().split('\n')[0] ?? '';

if (GENERATED.some((re) => re.test(subject))) process.exit(0);
if (HAS_NONE.test(body) || HAS_LEVEL.test(body)) process.exit(0);

fail(subject);

"""Re-derive the Sals3 CI and deployment state.

ADR-019's 2026-09-09 amendment requires this table be regenerated rather than
recalled: it is a snapshot of a billing state, and it has already inverted once.

Per repository it reports the latest GitHub Actions run timed
`run_started_at -> updated_at` (3-9s means the job executed zero steps - the
billing stall - while minutes means a real run), and the Vercel commit status on
the default branch tip with its description, because `Account is blocked.` and
`Deployment was blocked` are different faults wearing the same red.

Then it probes the production hosts, because the question behind all of this is
usually "is the product up", and that is answerable directly.

Usage:
    python .claude/skills/sals3-verify/scripts/ci_state.py
    python .claude/skills/sals3-verify/scripts/ci_state.py --deep 25

`--deep N` also walks N commits per repository to find the date a Vercel block
starts. Slower; worth it when you need the boundary rather than the current state.

Requires `gh` authenticated with an account that can read both orgs. Repositories
it cannot see are reported as NO ACCESS rather than guessed at - switch with
`gh auth switch --user <account>` and rerun.
"""

import argparse
import datetime
import json
import subprocess
import sys
import urllib.error
import urllib.request

REPOS = [
    "Sals3-Official/sals3-ecommerce",
    "Sals3-Official/sals3-portal",
    "anythingsupplies/sals3-portal",
    "anythingsupplies/sals3-ecommerce",
    "anythingsupplies/sals3.com.fj",
    "anythingsupplies/sals3.com.au",
    "anythingsupplies/sals3-portal-automation",
]

HOSTS = ["sals3.com", "sals3.com.au", "sals3.com.fj", "sals3-portal-prod.vercel.app"]

STALL_SECONDS = 30  # a real verify run takes minutes; a stall dies in single digits


def gh(*args):
    """Run gh and return stdout, or None if it failed."""
    try:
        r = subprocess.run(
            ["gh", *args], capture_output=True, text=True,
            encoding="utf-8", errors="replace", timeout=60,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    return r.stdout.strip() if r.returncode == 0 else None


def parse_iso(s):
    return datetime.datetime.fromisoformat(s.replace("Z", "+00:00"))


def actions_state(repo):
    raw = gh("api", f"repos/{repo}/actions/runs?per_page=1",
             "--jq", '.workflow_runs[0] | {c:.conclusion, st:.status, s:.run_started_at, u:.updated_at}')
    if not raw:
        return "no runs / no access"
    try:
        d = json.loads(raw)
        secs = (parse_iso(d["u"]) - parse_iso(d["s"])).total_seconds()
    except Exception:
        return "unreadable"

    # A run still going has conclusion null and a small elapsed time so far, which
    # looks exactly like a stall. Only a *finished* run can be judged by duration.
    if d.get("c") is None:
        return f"{d.get('st') or 'in progress'}, {secs:.0f}s so far - not finished, do not judge yet"

    verdict = "BILLING STALL (zero steps)" if secs < STALL_SECONDS else "real run"
    return f"{d['c']}, {secs:.0f}s - {verdict}"


def vercel_state(repo, sha):
    raw = gh("api", f"repos/{repo}/commits/{sha}/status",
             "--jq", '[.statuses[] | select(.context|test("Vercel";"i")) | "\\(.state)|\\(.description)"] | .[0] // "none"')
    if not raw or raw == "none":
        return "no Vercel status"
    state, _, desc = raw.partition("|")
    return f"{state} - {desc}"


def block_boundary(repo, branch, depth):
    """Walk commits newest-first and report where a Vercel block starts."""
    raw = gh("api", f"repos/{repo}/commits?sha={branch}&per_page={depth}",
             "--jq", "[.[] | {sha: .sha[:7], date: .commit.committer.date[:10]}]")
    if not raw:
        return None
    blocked, last_ok = [], None
    for c in json.loads(raw):
        st = vercel_state(repo, c["sha"])
        if "blocked" in st.lower():
            blocked.append(c)
        elif st.startswith("success") and last_ok is None:
            last_ok = c
    if not blocked:
        return None
    return (f"{len(blocked)} blocked, oldest {blocked[-1]['date']} ({blocked[-1]['sha']})"
            + (f"; last success {last_ok['date']} ({last_ok['sha']})" if last_ok else ""))


def probe(host):
    req = urllib.request.Request(f"https://{host}", method="GET",
                                 headers={"User-Agent": "sals3-verify"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return str(r.status)
    except urllib.error.HTTPError as e:
        return str(e.code)
    except Exception as e:
        return f"unreachable ({type(e).__name__})"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--deep", type=int, default=0, metavar="N",
                    help="also walk N commits per repo to find a block's start date")
    args = ap.parse_args()

    who = gh("api", "user", "--jq", ".login") or "NOT AUTHENTICATED"
    print(f"gh account: {who}")
    print(f"generated:  {datetime.datetime.now().astimezone():%Y-%m-%d %H:%M %Z}\n")

    print(f"{'repository':44} {'github actions':38} vercel (default branch tip)")
    print("-" * 124)
    unseen = []
    for repo in REPOS:
        branch = gh("api", f"repos/{repo}", "--jq", ".default_branch")
        if not branch:
            unseen.append(repo)
            print(f"{repo:44} {'NO ACCESS':38} NO ACCESS")
            continue
        tip = gh("api", f"repos/{repo}/commits/{branch}", "--jq", ".sha[:7]") or "?"
        print(f"{repo:44} {actions_state(repo):38} {vercel_state(repo, tip)}")
        if args.deep:
            b = block_boundary(repo, branch, args.deep)
            if b:
                print(f"{'':44} {'':34} ^ {b}")

    if unseen:
        # No single account currently sees both orgs, so a one-account run is a
        # partial table. Saying which rows are missing beats a confident half-answer.
        print(f"\n{len(unseen)} repositor{'y' if len(unseen) == 1 else 'ies'} not visible to '{who}':")
        for r in unseen:
            print(f"  - {r}")
        print("  Switch account and rerun to complete the table:")
        print("    gh auth switch --user <other account>   (then switch back)")

    print("\nproduction hosts")
    print("-" * 124)
    for h in HOSTS:
        print(f"  {h:34} HTTP {probe(h)}")

    print("\nReminders (ADR-019, 2026-09-09 amendment):")
    print("  - a 3-9s Actions run executed zero steps; that X is billing, not code")
    print("  - 'Account is blocked.' is the legacy vault project; 'Deployment was blocked' is a commit-author fault")
    print("  - quote real verify counts in the PR body, never 'it passed'")


if __name__ == "__main__":
    sys.exit(main())

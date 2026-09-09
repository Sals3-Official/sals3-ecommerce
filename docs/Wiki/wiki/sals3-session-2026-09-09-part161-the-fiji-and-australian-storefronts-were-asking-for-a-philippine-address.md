---
tags:
  [
    session-record,
    sals3,
    checkout,
    storefront,
    market,
    adr-003,
    destination,
    fiji,
    australia,
  ]
aliases:
  [
    "Part 161",
    "The Fiji and Australian storefronts were asking for a Philippine address",
    "The checkout country seed",
  ]
created: 2026-09-09
updated: 2026-09-09
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[pending-register]]"
  - "[[sals3-skills]]"
  - "[[sals3-session-2026-09-04-part138-fiji-gets-more-than-a-welcome-band]]"
  - "[[sals3-session-2026-09-04-part131-a-byte-identical-copy-learns-to-say-bula-fiji]]"
  - "[[sals3-session-2026-09-09-part160-nobody-is-paying-so-the-agent-is-the-ci]]"
---

# Part 161 — The Fiji and Australian storefronts were asking for a Philippine address

> [!IMPORTANT] Owner decision 2026-09-09 (Bogs)
> A market storefront's own country **outranks a geo-IP guess** when seeding the
> checkout address form, reversing a deliberate exclusion that read ADR-003 §1
> the other way. It does **not** outrank a stored buyer choice. See §4 and
> ADR-003's `Amendment — 2026-09-09`.

> [!NOTE] Provenance
> Written the same day from the four pull requests' own diffs and from the
> failing-test output quoted in each. The defect was reported by the owner from
> a live browser on `sals3.com.fj/checkout` with a screenshot of the region
> dropdown; the diagnosis is from reading `resolve.ts`, `layout.tsx` and
> `useCheckoutAddress.ts`, not from a reproduction on the live host — checkout
> sits behind the auth guard and the reporter's own session was the observation.
> Both promotion pairs are absent by design: nothing was promoted past
> `develop` in this session. Per
> [[sals3-session-2026-09-09-part160-nobody-is-paying-so-the-agent-is-the-ci|part 160]]
> every merge here rests on a named agent's local `npm run verify`, because
> Actions on both repositories dies in 3 s unstarted.

| PR | Repository | What it did |
| --- | --- | --- |
| [#41](https://github.com/anythingsupplies/sals3.com.fj/pull/41) | `sals3.com.fj` | Seed the checkout country from the market rather than geo |
| [#33](https://github.com/anythingsupplies/sals3.com.au/pull/33) | `sals3.com.au` | The same, ported by hand |
| [#42](https://github.com/anythingsupplies/sals3.com.fj/pull/42) | `sals3.com.fj` | Put a stored buyer choice back above the market |
| [#34](https://github.com/anythingsupplies/sals3.com.au/pull/34) | `sals3.com.au` | The same, ported by hand |

## 1. What the owner saw

`sals3.com.fj/checkout`, signed in, one item in the cart at **FJ$1,274.24**. The
`Select state or region` dropdown listed **National Capital Region (NCR)**,
**Cordillera Administrative Region (CAR)**, **CALABARZON (Region IV-A)** — the
seventeen regions of the Philippines, under a Fijian total. `sals3.com.au`
did the same thing.

## 2. Why, and why it was not a one-visitor accident

`resolveDestination()` knows nothing about which storefront it is running in. It
has three inputs and only two can fire:

1. the `sals3_destination` cookie — **nothing has written it since the `Ship to`
   picker was removed on 2026-08-28**;
2. `x-vercel-ip-country`;
3. `GLOBAL`.

The checkout layout passed its answer straight through to `initialCountry`. Two
separate paths therefore land on `PH`, which is what makes this systemic rather
than personal:

- **geo answers `PH`** for a buyer in Manila — the owner, and every Philippine
  visitor;
- **no geo header at all** resolves to `GLOBAL`, which is not a checkout
  country, so `initialCountry` is `undefined` and `useCheckoutAddress` falls to
  its own `FALLBACK_COUNTRY = 'PH'`.

So **every visitor from outside the six named countries** got a Philippine form,
not only the reporter. `x-vercel-ip-country` is absent locally and behind any
proxy Vercel cannot place.

The seed drives more than the region list. `CHECKOUT_COUNTRY_DETAILS[country]`
also supplies the **phone prefix** — `+639` where Fiji is `+679` and Australia
`+614` — and `checkoutRequiresPostalCode`, so the Fiji storefront was demanding
a postal code its own welcome band tells buyers they do not need.

## 3. The helper already existed and was deliberately not wired

`marketOrDestinationCheckoutCountry` reads `NEXT_PUBLIC_SALS3_MARKET` first and
was already wired to the free-shipping threshold and the PDP. Its own doc
comment excluded checkout **on purpose**:

> It deliberately does **not** move `resolveDestination()` itself. The
> destination still drives the checkout form's initial country and the cart's
> cannot-ship notice, and ADR-003 §1 forbids pre-filling those from anything but
> the buyer's own choice: telling a visitor in Berlin that they are shipping to
> Fiji, and then making the checkout quietly right for a country they never
> picked, is the failure that rule exists to prevent.

**The reasoning was sound and the premise was wrong.** The Berlin visitor was
never being handed a neutral form. They were being handed *the Philippines* — a
country with no more claim on them than Fiji, and none at all on the page they
were reading. The exclusion protected nobody; it only chose a worse default.

## 4. What the rule actually protects

ADR-003 §1: *"Geo-IP is only a default suggestion. The user's selected shipping
country is the browsing source of truth."* The thing it forbids is a **guess**
masquerading as a **choice**.

A market storefront's country is not a guess about the person. Opening
`sals3.com.fj` is itself a buyer action, and a more deliberate one than the IP
their traffic happens to exit from. That is why it may outrank geo.

It may **not** outrank the cookie, and the first pair of PRs got that wrong.
`marketOrDestinationCheckoutCountry` returns the market whenever one is set,
without looking at the destination at all — so a buyer who had genuinely chosen
the Philippines before 2026-08-28 was overruled by the deployment. Small in
practice (no writer since August, one-year TTL) and wrong in the way the ADR
names outright. #42/#34 corrected it the same day.

**The precedence now, stated once:**

| | Signal | Why it ranks there |
| --- | --- | --- |
| 1 | A stored choice (`source === 'chosen'`) | A person picked it. ADR-003 §1. |
| 2 | `NEXT_PUBLIC_SALS3_MARKET` | A fact about the deployment, not about the person |
| 3 | Geo-IP, then the form's own default | A guess |

## 5. How it is built

`resolveDestinationChoice()` returns `{ destination, source }` where `source` is
`'chosen' | 'geo' | 'default'`. `resolveDestination()` **keeps its exact
signature** and delegates to it, so the cart's cannot-ship notice, the PDP and
the indicative price are untouched — no behaviour outside checkout moved.

`checkoutCountrySeed(choice)` owns the precedence in its own file. The
free-shipping threshold still calls `marketOrDestinationCheckoutCountry`
directly and is unchanged: **a threshold has no choice to honour.**

One case is worth naming. A stored `NZ`, `US`, `CA` or Global is a country
checkout cannot take an address for, so it cannot be honoured; it falls to the
**market** rather than to the form's unrelated `PH` default. On the Fiji
storefront a buyer who chose New Zealand gets Fiji. Neither is their choice; one
of them is at least the page they are standing on.

Everything is a seed and nothing is a lock. The country select stays fully
editable, `CHECKOUT_ALLOWED_COUNTRIES` and the Zod schema are untouched, and the
address is still validated server-side on submit.

## 6. Verification

`npm run verify` passed in full on both repositories at both branch heads —
lint, format check, clean typecheck, production build, unit tests, and **80 e2e
passed / 2 skipped** — then again under the pre-commit and pre-push hooks, which
run the whole chain. Actions reported `failure` in **3 s** on every one of the
four PRs, which is the billing stall of part 160 and not a code signal.

Both new guards were checked by breaking them and watching them go red, rather
than by being believed:

- removing the wiring line → `expected 'PH' to be 'FJ'`
- removing the choice branch → `expected 'FJ' to be 'PH'`

## 7. What the ports cost

The two repositories are forks and the four files were byte-identical at each
baseline — but the **prose** is not portable: comments, README passages and test
names all name their own market. Each port was verified byte-for-byte against
the other fork's pre-change baseline before copying, then adapted by hand
(`sals3.com.fj` → `sals3.com.au`, Fijian → Australian, `FJ` → `AU`, `+679` →
`+614`).

One near-miss worth recording: FJ's `README.md` **differs between `develop` and
the in-progress `fix/rail-spacing` branch** the working tree happened to be on.
Copying the edited file across would have dragged that branch's unrelated README
changes into this PR. Caught by diffing the file against `origin/develop` before
staging, and re-applied onto develop's copy instead.

## Lessons

- **A defensible exclusion still needs its alternative measured.** The comment
  refusing the market seed argued correctly about what pre-filling costs and
  never asked what the fallback actually was. It was `PH` — hard-coded two files
  away, in a constant named `FALLBACK_COUNTRY`. The rule protected nobody, and
  nothing in the reasoning would have revealed that without going to look.
- **A helper existing is not a helper being wired.** `marketOrDestinationCheckoutCountry`
  was correct, tested by use in two other callers, and the defect was that the
  third caller did not exist. The test that catches this asserts on the
  *rendered prop*, not on the helper's return.
- **`source` is not metadata.** Collapsing "the buyer chose PH" and "the IP says
  PH" into one `Destination` is what let a later caller override a real choice
  without any code looking wrong. A resolver that ranks its inputs should be
  able to say which one won.
- **Mocking a module replaces all of it.** Renaming the export the layout calls
  broke an unrelated test through `loadIndicativeContext`, which imports
  `resolveDestination` from the same module — and the failure names the mock,
  not the caller.
- **Check whether the file you are porting differs on the branch you are
  standing on.** A fork port is a three-way question, not a copy.

## Pending

- **The `Ship to` picker is still gone**, so a buyer cannot make a *new* choice
  before checkout — only an old cookie carries one. Registered in
  [[pending-register]].
- **Neither change has been observed on SIT.** Both merged to `develop`; the
  form was not re-opened on `sit.sals3.com.fj` or `sit.sals3.com.au` afterwards.
- **Locking the country to the market was explicitly not done** — a buyer on
  `sals3.com.fj` can still pick PH and check out. Product decision, not a defect.
- **The shared `anythingsupplies/sals3-ecommerce` storefront was not inspected**
  — no local clone exists on the Windows machine, and `E:\sals3-ecommerce` is
  the old `Sals3-Official` vault repository. It sets no market so the fix is a
  no-op there, but whether it even carries these files is unverified.

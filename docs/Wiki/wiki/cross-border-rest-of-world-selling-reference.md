---
tags:
  - sals3
  - reference
  - cross-border
  - customs
  - compliance
  - pricing
  - adr-003
aliases:
  - Cross-Border Reference
  - Rest of World Selling
  - Global Selling Reference
created: 2026-08-27
updated: 2026-08-27
status: reference
authority: external-research
owner_approved: false
related:
  - "[[hot]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]"
  - "[[sals3-session-2026-08-27-part80-a-global-scope-for-the-countries-with-no-column]]"
---

# How the big marketplaces sell to countries they do not operate in

Researched 2026-08-27 at the owner's request, before designing the Global
pricing scope (part 80). **This note is external research, not a Sals3
decision** — `owner_approved: false` deliberately. It exists so the next
decision about cross-border selling starts from documented mechanisms rather
than from an impression of how Amazon works.

**Sourcing caveat.** `www.amazon.com` returns HTTP 503 to automated fetches, so
the same help `nodeId`s were read on `amazon.co.uk` and `amazon.ca`, plus
Amazon-hosted PDFs. Claims resting only on a search index of an `amazon.com`
page rather than a rendered page are marked **[indexed only]**.

## 1. The five mechanisms, which are constantly conflated

| Mechanism | What it is | Direction |
|---|---|---|
| **AmazonGlobal / Export** | amazon.com ships direct to a buyer in a country with no Amazon marketplace. Selling entity is Amazon Export Sales LLC. "over 100 countries" **[indexed only]** | destination-side |
| **Import Fees Deposit / Import Charges** | how duties are estimated or priced and collected at checkout | either |
| **Amazon Global Store** | a storefront *inside* a marketplace selling imported goods, priced in local currency, landed | supply-side |
| **Build International Listings (BIL)** | seller tool syncing listings source → *named* target marketplace, with a price rule each | seller-side |
| **Remote Fulfilment / NARF** | sell into CA/MX/BR from US FBA stock | fulfilment-side |

For a "rest of world" scope, **AmazonGlobal export is the analogue**. Global
Store is the opposite direction and is not.

## 2. The duties question — three real models, pick one deliberately

This is the load-bearing section. Amazon runs **two** of these under similar
names, and documents a third as its own fallback.

**Model A — deposit and reconcile** ([Amazon.ca](https://www.amazon.ca/gp/help/customer/display.html?nodeId=G8VRJ7Y8Z3T5WPV3)):

> "We simplify this process by estimating the amount that will be due (the
> 'Import Fees Deposit') and adding it to the amount you pay."
> "**You won't be charged additional fees if the actual Import Fees exceed the
> Import Fees Deposit we estimated.**"
> "**If carrier invoices are not received by 180 days from the ship date, you
> will automatically receive a refund for the full amount.**"

Asymmetric in the buyer's favour, and expensive: it requires per-shipment
carrier-invoice ingestion, an automatic refund pipeline, and a 180-day clock.

**Model B — fixed import charge** ([Amazon.co.uk](https://www.amazon.co.uk/gp/help/customer/display.html?nodeId=G8VRJ7Y8Z3T5WPV3)):

> "Import Charges are a fixed amount that we charge in order to cover all
> customs-related processes and costs… **may not represent the actual amount of
> Import Fees paid**."
> "**You will not be refunded** if the Import Charges are greater than the
> actual amount… and **we will not ask you to make any additional payment** if
> such amount is greater."

Both are offered as alternatives in one sentence of the [Global Store
T&C](https://www.amazon.co.uk/gp/help/customer/display.html?nodeId=G9UHGT37MYD2EJPL).
Model B needs no reconciliation at all; the variance becomes margin. eBay does
the same and says so, listing *"charges relating to the management of variances
between the quoted import charges and actual costs"* as a component of its
import fee ([eIS Buyer T&C](https://pages.ebay.com/internationalshippingprogram/buyer/terms/)).

**Model C — collect nothing, disclose plainly.** Amazon's own fallback below its
fallback, for countries the programme does not cover
([Amazon UK](https://www.amazon.co.uk/gp/help/customer/display.html?nodeId=G26L6NHEDGERVR8W)):

> "When the country your order is being delivered to isn't covered by the Amazon
> Global programme then any additional charges for customs clearance must be
> borne by you. We have no control over these charges and can't predict what
> they may be."

**The failure mode to avoid is building half of Model A** — the estimate without
the reconciliation — which takes on the liability without the machinery.

## 3. Pricing: there is no rest-of-world price rule

BIL is structurally source → **named** target marketplace, one connection and
one price rule each ([Amazon BIL
PDF](https://m.media-amazon.com/images/G/65/SG3P/Amazon.sg_Build_International_Listings.pdf)):

> "Synchronises the offer prices in target marketplaces based on the price you
> set in the source marketplace **and your price rules**."
> "**Adjusts prices periodically to reflect currency conversion fluctuations**…
> The frequency of these updates may vary from daily to weekly. **These updates
> will not show changes of less than 1%.**"

A country with no marketplace has no connection, so it gets the source price
plus export shipping plus the import-fee line. **The export margin is in the
fees, not in a marked-up item price.** The closest Amazon comes to admitting a
platform markup is on the [Remote
Fulfilment](https://sell.amazon.com/fulfillment-by-amazon/remote-fulfillment)
page: BIL *"synchronizes your prices to preserve your profit margins while
adjusting for differences in fulfillment costs, referral fees, and currency
exchange rates."*

That percentage price rules exist is **lower confidence** — Amazon's public
wording is only "price rules" / "sell above or below your original offer price";
the Seller Central page requires login.

## 4. Importer of record — uniform, and it is what makes this work

Both platforms put the **buyer** in the importer-of-record seat, in writing.

- [Amazon.ca](https://www.amazon.ca/gp/help/customer/display.html?nodeId=G8VRJ7Y8Z3T5WPV3):
  *"you are the importer of record and must pay import duties, taxes and fees"*.
- [Global Store T&C](https://www.amazon.co.uk/gp/help/customer/display.html?nodeId=G9UHGT37MYD2EJPL):
  *"**You will be listed as the importer of record and act as the declarant for
  customs purposes**… you are solely responsible for paying these duties and
  taxes."* Title and risk pass on delivery to the carrier **outside** the
  destination country.
- eBay's [Buyer T&C](https://pages.ebay.com/internationalshippingprogram/buyer/terms/)
  is the most precise text found anywhere, defining the buyer as Importer of
  Record under §484(a)(2)(B) of the Tariff Act of 1930 and as Foreign Principal
  Party in Interest under 15 CFR Part 30, with eBay as agent that *"at no time…
  take[s] title"*.

**The clause worth copying**, verbatim from eBay:

> "As buyer, you will bear the liability for any violation of the export laws
> and regulations of the Origin Country or import laws in the destination
> jurisdiction, **with the exception of violations caused by incorrect
> information provided by your Seller**."

Buyer carries import liability; **seller carries data-accuracy liability**. eBay
enforces the second half operationally: an incorrect or indeterminable country
of manufacture, category, condition, weight or dimensions is a Money Back
Guarantee case against the seller. Both platforms also carry a personal-use /
no-commercial-resale clause, and both reserve the right to cancel *after*
purchase when an item turns out to be ineligible.

Also: some destinations require a buyer tax ID (CPF, UIN) before customs will
release the parcel.

## 5. What these programmes refuse to carry

eBay's published export exclusion list, which is the single most useful artefact
here because it maps almost exactly onto a cheap dropship catalogue
([source](https://www.ebay.com/help/selling/shipping-items/setting-shipping-options/ebay-international-shipping-program?id=5348),
prefaced *"This is not an exhaustive list"*):

- **standalone lithium batteries**, and **battery devices over 100 Wh**
- **aerosols**, and **fragrances — flammable perfumes and cologne**
- radioactive materials; dangerous goods needing hazmat labelling
- export-controlled items needing a licence
- **knives, swords, blades**; drones
- airbags, AC refrigerant, vehicle paint, used parts with hazardous residue
- high-value jewellery; pepper spray, stun guns, handcuffs
- CO2 cartridges, firearms and parts, laser scopes, replica firearms
- stamps, coins and paper money

**Country exclusions.** eBay names them explicitly — Iran, Syria, Cuba, North
Korea, Crimea, the DNR and LNR regions; the newer Buyer T&C adds **Belarus and
Russia**, Kherson and Zaporizhzhia — and applies them *"regardless of the
legality of such a transaction under local law."*

**Compliance liability sits with the seller, stated plainly.** Amazon's BIL does
not *"check that your products comply with applicable laws and regulations
across all marketplaces"*, and *"**You are solely responsible** for ensuring
that you and your products comply with all applicable laws of the target
marketplaces."* The platform provides screening machinery; it does not accept
the liability.

## 6. De minimis — the numbers moved, recently

**This is the part most likely to be stale in anyone's head.**

**United States: the $800 exemption is gone, indefinitely and by regulation.**
[91 FR 37789, CBP Dec. 26-12](https://www.federalregister.gov/documents/2026/06/24/2026-12670/indefinite-suspension-of-the-de-minimis-exemption-for-merchandise-arriving-through-all-modes-other),
effective **2026-06-24**: *"all entries of merchandise valued at $800 or less…
must utilize formal or informal entry procedures."*

The sequence matters, because it is what makes this durable rather than
fragile:

| Date | Event |
|---|---|
| 2025-07-30 | E.O. 14324 suspends duty-free de minimis |
| 2026-02-20 | **SCOTUS, *Learning Resources v. Trump*** — IEEPA does not authorise the tariffs; E.O. 14389 terminates them |
| 2026-02-20 | **E.O. 14388 separately continues the de minimis suspension** — the Court did not address it |
| 2026-06-24 | CBP codifies the indefinite suspension |

CBP grounded the rule in its **own** discretion under 19 U.S.C. 1321(b), so the
tariff litigation does not restore de minimis. Plan for the US as
duty-from-dollar-one.

**European Union: the €150 relief ended 2026-07-01**, replaced by a **€3 flat
fee per item** below €150, temporary until 2028
([Council](https://www.consilium.europa.eu/en/press/press-releases/2026/02/11/council-gives-final-green-light-to-new-customs-duty-rules-for-small-parcels/),
[Commission](https://taxation-customs.ec.europa.eu/news/guidance-and-legal-text-temporary-flat-fee-low-value-imports-which-will-apply-until-1-july-2028-2026-06-08_en)).

**Our six, for comparison:**

| Destination | Threshold | Note |
|---|---|---|
| **US** | **none** | suspended indefinitely |
| **AU** | A$1,000 customs, **GST from $0** | vendor-collect since 2018; register at A$75,000 turnover |
| **NZ** | NZ$1,000 customs, **GST from $0** | same vendor-collect design |
| **CA** | C$40 tax / C$150 duty (US/MX courier, CUSMA); C$20 otherwise | |
| **PH** | ₱10,000 FOB | CMTA s.423, CAO 02-2016 |
| **FJ** | not researched | |

**AU and NZ are the ones with a lesson for Sals3.** Neither relies on a border
threshold for tax — both make the *overseas vendor* register and collect at
checkout. That is the architecture regulators are converging on, and it is the
same shape as a fixed charge computed at checkout.

## 7. Currency

- **Global Store** (buyer in a covered marketplace): priced in the **local**
  currency, landed, duties included.
- **AmazonGlobal export** (buyer in an uncovered country): charged in **USD** by
  default with an optional conversion, Amazon setting the rate, *"generally
  updated daily"* **[indexed only]**.
- **BIL** seller-side FX: automatic, daily-to-weekly, **1% deadband**.
- **eBay**: one all-in figure at checkout; no primary source found naming the FX
  source — treat as unresearched.

**The consistent pattern:** the platform quotes one number in one currency, off
a daily reference rate it controls, and pads it. Nobody exposes mid-market.

## 8. The four constraints this evidence actually supports

1. **Pick a duties model deliberately**, from the three in §2. Half of Model A
   is the failure mode.
2. **The buyer must be importer of record, in the terms, with an agency grant**
   — and the seller warrants the data accuracy (§4).
3. **Global must be an allow-list of catalogue and a deny-list of countries**,
   not the whole catalogue (§5). Reserve a post-purchase cancel, because no one
   can pre-screen every country-item pair — neither platform does. An order
   ceiling is cheap insurance; eBay caps at **$2,500 USD including shipping**.
4. **A single Global price is a simplification neither platform makes**, so the
   pad must cover the worst destination in the set, and it can no longer assume
   de minimis in the US or the EU (§6). Treat the FX spread and the customs
   variance as two explicit components rather than one blended guess.

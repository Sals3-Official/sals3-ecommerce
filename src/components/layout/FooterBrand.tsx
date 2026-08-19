import Image from 'next/image';

export default function FooterBrand() {
  return (
    <div className="flex max-w-[330px] flex-col gap-4">
      <span className="inline-flex self-start rounded-lg bg-[#f2f6f8] px-3 py-2">
        <Image
          src="/sals3-logo.webp"
          alt="Sals3"
          width={640}
          height={219}
          style={{ height: '26px', width: 'auto' }}
        />
      </span>
      {/*
        "One price, shipping and tax included." used to lead here and has been
        dropped. It was unbacked: Sals3 has no rate table and no carrier
        integration, so the pricing resolver cannot have included real freight,
        and tax is not collected — which is not the same as included. `site.ts`
        records that "No surprises at checkout" left SITE_DESCRIPTION on
        2026-08-13 for exactly this reason; this sentence and the PDP's shipping
        card were both missed then.

        The sentence below survives because it *is* true of shipped behaviour:
        `createStripeCheckoutSession` passes no `shipping_options`, no shipping
        line item and no `automatic_tax`, so nothing is added at the last step.
        `src/services/stripe/checkout.test.ts` guards that, because this copy
        now depends on it.
      */}
      <p className="font-display text-lg leading-snug font-semibold tracking-tight text-white text-pretty">
        The number on the product card is the number you pay. No fees appear at
        the last step.
      </p>
    </div>
  );
}

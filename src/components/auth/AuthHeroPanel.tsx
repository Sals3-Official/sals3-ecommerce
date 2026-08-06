import Image from 'next/image';
import Link from 'next/link';
import AUTH_LINKS from '@/lib/auth/auth-links';

/**
 * Left half of the login screen: the brand photo, its contrast scrim, the back
 * affordance, and the value-proposition copy.
 *
 * Below `lg` the split collapses to a stacked band so the form stays above the
 * fold on a phone; the 50/50 desktop composition is unchanged.
 */
export default function AuthHeroPanel() {
  return (
    <div className="relative min-h-[340px] flex-1 overflow-hidden bg-auth-hero lg:min-h-full lg:basis-1/2">
      {/*
        `sizes` stops a phone downloading the desktop-width rendition. The photo
        is the page's largest contentful paint, so it is the one `priority` asset
        on this route.
      */}
      <Image
        src="/login-hero.jpg"
        alt="A Sals3 shopper smiling while browsing the marketplace on her phone"
        fill
        priority
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="object-cover object-[68%_38%]"
      />

      <div className="auth-hero-scrim absolute inset-0" />
      <div className="auth-hero-glow absolute inset-0" />

      <Link
        href={AUTH_LINKS.home}
        aria-label="Go back to the Sals3 home page"
        className="absolute top-6 left-6 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white text-xl leading-none text-auth-ink no-underline shadow-[0_2px_14px_rgb(0_0_0/0.18)] transition-colors duration-150 hover:bg-auth-tint lg:top-10 lg:left-10"
      >
        <span aria-hidden="true">&#8592;</span>
      </Link>

      {/*
        Desktop pins this block to the bottom of the panel, as designed. Below
        `lg` it stays in normal flow instead: a bottom-anchored block grows
        upwards, so on a phone the headline slid under the back button. In flow
        with a top pad that clears the button, the band sizes itself to whatever
        the copy actually needs — no fixed mobile height to keep in sync.
      */}
      <div className="relative z-10 flex max-w-[620px] flex-col gap-[22px] px-[clamp(28px,4vw,56px)] pt-[92px] pb-[clamp(36px,5vh,64px)] lg:absolute lg:inset-x-0 lg:bottom-0 lg:pt-0">
        <h1 className="text-[clamp(38px,4.4vw,60px)] leading-[1.03] font-bold tracking-[-0.025em] text-pretty text-white">
          One price.
          <br />
          No surprises.
        </h1>

        <p className="max-w-[46ch] text-[clamp(15px,1.25vw,18px)] leading-[1.55] text-pretty text-white/[0.82]">
          The number on the product card is the number you pay — shipping and
          tax included. Join Sals3 and shop the whole catalogue that way.
        </p>

        <Link
          href={AUTH_LINKS.pricing}
          className="inline-flex items-center gap-2.5 self-start border-b border-white/45 pb-1 text-base font-semibold text-white no-underline transition-colors duration-150 hover:border-white hover:text-white"
        >
          How pricing works
          <span aria-hidden="true" className="text-[15px]">
            &#8594;
          </span>
        </Link>
      </div>
    </div>
  );
}

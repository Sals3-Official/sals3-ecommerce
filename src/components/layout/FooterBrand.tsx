import Image from 'next/image';

export default function FooterBrand() {
  return (
    <div className="flex max-w-[330px] flex-col gap-4">
      <span className="inline-flex self-start rounded-lg bg-[#f2f6f8] px-3 py-2">
        <Image
          src="/sals3-logo.webp"
          alt="Sals3"
          width={2000}
          height={647}
          style={{ height: '26px', width: 'auto' }}
        />
      </span>
      <p className="font-display text-lg leading-snug font-semibold tracking-tight text-white text-pretty">
        One price, shipping and tax included.
      </p>
      <p className="text-sm leading-relaxed text-footer-ink-muted text-pretty">
        The number on the product card is the number you pay. No fees appear at
        the last step.
      </p>
    </div>
  );
}

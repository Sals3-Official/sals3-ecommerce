import Image from 'next/image';
import Link from 'next/link';

export default function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center rounded-lg bg-brand-600/10 px-2.5 py-1.5 hover:bg-white"
    >
      <Image
        src="/sals3-logo.webp"
        alt="Sals3"
        width={2000}
        height={647}
        priority
        style={{ height: '28px', width: 'auto' }}
      />
    </Link>
  );
}

import Image from 'next/image';
import Link from 'next/link';
import AUTH_LINKS from '@/lib/auth/auth-links';
import {
  resolvePostLoginPath,
  withPostLoginKey,
  type PostLoginKey,
} from '@/lib/auth/post-login-redirect';
import { SITE_NAME } from '@/lib/site';
import LoginForm from './LoginForm';
import { AUTH_LINK_CLASS } from './auth-field-styles';

type LoginCardProps = {
  nextKey?: PostLoginKey;
};

/**
 * Right half of the login screen. A Server Component: only the credential form
 * inside it needs client JavaScript, so the logo, headings, and legal copy ship
 * as static markup.
 *
 * This is where the post-login destination fans out: down into the form, which
 * navigates there on success, and across onto the signup link, so a visitor
 * who came here for checkout and needs an account first does not lose the
 * thread. The legal and pricing links deliberately do not carry it — they lead
 * out of the flow, not through it.
 */
export default function LoginCard({ nextKey }: LoginCardProps) {
  return (
    <div className="flex flex-1 items-center justify-center bg-white px-[clamp(28px,4vw,44px)] py-[clamp(40px,6vh,72px)] lg:basis-1/2">
      <div className="flex w-full max-w-[424px] flex-col gap-[30px]">
        {/*
          Intrinsic size is the real asset's 640x219 so Next can serve a
          correctly scaled rendition; the rendered box is pinned to 38px tall to
          match the design and to reserve space before the image decodes.
        */}
        <Image
          src="/sals3-logo.webp"
          alt={SITE_NAME}
          width={640}
          height={219}
          priority
          className="h-[38px] w-auto self-start"
        />

        <h2 className="text-[clamp(23px,2vw,27px)] font-bold tracking-[-0.02em] text-auth-ink">
          Sign in or create an account
        </h2>

        <LoginForm postLoginPath={resolvePostLoginPath(nextKey)} />

        <p className="text-center text-[15px] text-auth-body">
          New to {SITE_NAME}?{' '}
          <Link
            href={withPostLoginKey(AUTH_LINKS.signUp, nextKey)}
            className={AUTH_LINK_CLASS}
          >
            Create an account
          </Link>
        </p>

        <p className="text-[13px] leading-[1.6] text-pretty text-auth-muted">
          By signing in or creating an account, you agree to the{' '}
          <Link href={AUTH_LINKS.terms} className={AUTH_LINK_CLASS}>
            Terms of Use
          </Link>{' '}
          and acknowledge the{' '}
          <Link href={AUTH_LINKS.privacy} className={AUTH_LINK_CLASS}>
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

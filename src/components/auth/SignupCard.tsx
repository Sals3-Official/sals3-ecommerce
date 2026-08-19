import Image from 'next/image';
import Link from 'next/link';
import AUTH_LINKS from '@/lib/auth/auth-links';
import {
  resolvePostLoginPath,
  withPostLoginKey,
  type PostLoginKey,
} from '@/lib/auth/post-login-redirect';
import { SITE_NAME } from '@/lib/site';
import SignupForm from './SignupForm';
import { AUTH_LINK_CLASS } from './auth-field-styles';

type SignupCardProps = {
  nextKey?: PostLoginKey;
};

/**
 * Right half of the signup screen. A Server Component, mirroring `LoginCard`:
 * only the registration form inside it needs client JavaScript.
 *
 * The post-login destination fans out exactly as it does on `LoginCard`, so
 * crossing between the two screens keeps it either way.
 */
export default function SignupCard({ nextKey }: SignupCardProps) {
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
          Create your {SITE_NAME} account
        </h2>

        <SignupForm postLoginPath={resolvePostLoginPath(nextKey)} />

        <p className="text-center text-[15px] text-auth-body">
          Already have an account?{' '}
          <Link
            href={withPostLoginKey(AUTH_LINKS.signIn, nextKey)}
            className={AUTH_LINK_CLASS}
          >
            Sign in
          </Link>
        </p>

        <p className="text-[13px] leading-[1.6] text-pretty text-auth-muted">
          By creating an account, you agree to the{' '}
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

import type { NextRequest } from 'next/server';
import { z } from 'zod';
import getFirebaseAdminAuth from '@/lib/auth/firebase-admin';
import {
  KLAVIYO_PROFILE_SYNC_RULES,
  RATE_LIMIT_SCOPES,
} from '@/lib/auth/auth-rate-limits';
import {
  getRequestIpKey,
  getRetryAfterSeconds,
  isRateLimited,
} from '@/lib/auth/rate-limit';
import {
  SESSION_COOKIE_NAME,
  hasMatchingCsrf,
  hasSameOrigin,
  noStoreJson,
} from '@/lib/auth/session-cookies';
import { klaviyoBrowserContextSchema } from '@/lib/klaviyo/browser-context';
import {
  createOrUpdateKlaviyoProfile,
  type KlaviyoProfileImportPayload,
} from '@/lib/klaviyo/server';

export const dynamic = 'force-dynamic';

const profileSyncRequestSchema = z.object({
  csrfToken: z.string().min(32).max(256),
  browserContext: klaviyoBrowserContextSchema,
});

type FirebaseUserInfo = {
  uid?: string;
  email?: string;
  emailVerified?: boolean;
  phoneNumber?: string;
  displayName?: string;
  photoURL?: string;
  providerData?: { providerId?: string }[];
  metadata?: {
    creationTime?: string;
    lastSignInTime?: string;
  };
};

type DisplayNameParts = {
  first_name?: string;
  last_name?: string;
};

function forbidden() {
  return noStoreJson({ error: 'Forbidden request.' }, { status: 403 });
}

function unauthorized() {
  return noStoreJson({ status: 'signed-out' }, { status: 401 });
}

function invalidRequest() {
  return noStoreJson({ error: 'Invalid request.' }, { status: 400 });
}

function getString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function splitDisplayName(displayName: string | undefined): DisplayNameParts {
  if (!displayName) {
    return {};
  }

  const parts = displayName.split(/\s+/).filter(Boolean);

  return {
    first_name: parts[0],
    ...(parts.length > 1 ? { last_name: parts.slice(1).join(' ') } : {}),
  };
}

function compactIdentify(attributes: {
  email?: string;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
}) {
  return Object.fromEntries(
    Object.entries(attributes).filter(([, value]) => Boolean(value)),
  );
}

function getProviderIds(user: FirebaseUserInfo) {
  return (
    user.providerData
      ?.map((provider) => provider.providerId)
      .filter((providerId): providerId is string => Boolean(providerId)) ?? []
  );
}

function buildProfilePayload({
  uid,
  decodedToken,
  user,
  browserContext,
}: {
  uid: string;
  decodedToken: Record<string, unknown>;
  user: FirebaseUserInfo;
  browserContext: z.infer<typeof klaviyoBrowserContextSchema>;
}): {
  identify: Record<string, unknown>;
  payload: KlaviyoProfileImportPayload;
} {
  const email = getString(user.email) ?? getString(decodedToken.email);
  const phoneNumber =
    getString(user.phoneNumber) ?? getString(decodedToken.phone_number);
  const displayName =
    getString(user.displayName) ?? getString(decodedToken.name);
  const nameParts = splitDisplayName(displayName);
  const attributes = {
    ...(email ? { email } : {}),
    ...(phoneNumber ? { phone_number: phoneNumber } : {}),
    external_id: uid,
    ...nameParts,
    ...(getString(user.photoURL) ? { image: user.photoURL } : {}),
    ...(browserContext.locale ? { locale: browserContext.locale } : {}),
    ...(browserContext.timezone
      ? { location: { timezone: browserContext.timezone } }
      : {}),
    properties: {
      sals3_firebase_uid: uid,
      sals3_auth_providers: getProviderIds(user),
      sals3_email_verified:
        typeof user.emailVerified === 'boolean'
          ? user.emailVerified
          : decodedToken.email_verified === true,
      sals3_account_created_at: user.metadata?.creationTime,
      sals3_last_sign_in_at: user.metadata?.lastSignInTime,
      sals3_analytics_consent_at: browserContext.consentedAt,
      sals3_last_locale: browserContext.locale,
      sals3_last_timezone: browserContext.timezone,
      sals3_last_viewport: {
        width: browserContext.viewportWidth,
        height: browserContext.viewportHeight,
      },
      sals3_last_screen: {
        width: browserContext.screenWidth,
        height: browserContext.screenHeight,
      },
      sals3_last_referrer: browserContext.referrer,
      sals3_last_path: browserContext.currentPath,
      sals3_last_utm: browserContext.utm,
    },
  };

  return {
    identify: compactIdentify({
      email,
      phone_number: phoneNumber,
      first_name: nameParts.first_name,
      last_name: nameParts.last_name,
    }),
    payload: {
      data: {
        type: 'profile',
        attributes,
      },
    },
  };
}

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request)) {
    return forbidden();
  }

  const ipKey = getRequestIpKey(request);

  if (
    isRateLimited(RATE_LIMIT_SCOPES.klaviyoProfileSync, [
      { key: ipKey, rule: KLAVIYO_PROFILE_SYNC_RULES.perIp },
    ])
  ) {
    return noStoreJson(
      { error: 'Too many requests.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(
            getRetryAfterSeconds(RATE_LIMIT_SCOPES.klaviyoProfileSync, [
              { key: ipKey, rule: KLAVIYO_PROFILE_SYNC_RULES.perIp },
            ]),
          ),
        },
      },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return invalidRequest();
  }

  const parsed = profileSyncRequestSchema.safeParse(body);

  if (!parsed.success || !hasMatchingCsrf(request, parsed.data.csrfToken)) {
    return invalidRequest();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return unauthorized();
  }

  const auth = getFirebaseAdminAuth();
  let decodedToken: Record<string, unknown>;
  let user: FirebaseUserInfo;

  try {
    decodedToken = (await auth.verifySessionCookie(
      sessionCookie,
      true,
    )) as Record<string, unknown>;
    const uid = getString(decodedToken.uid);

    if (!uid) {
      return unauthorized();
    }

    user = (await auth.getUser(uid)) as FirebaseUserInfo;
  } catch {
    return unauthorized();
  }

  const uid = getString(user.uid) ?? getString(decodedToken.uid);

  if (!uid) {
    return unauthorized();
  }

  const { identify, payload } = buildProfilePayload({
    uid,
    decodedToken,
    user,
    browserContext: parsed.data.browserContext,
  });

  try {
    const result = await createOrUpdateKlaviyoProfile(payload);

    if (result.status === 'failed') {
      return noStoreJson({ status: 'unavailable' }, { status: 502 });
    }

    return noStoreJson({
      status: result.status,
      ...(Object.keys(identify).length > 0 ? { identify } : {}),
    });
  } catch {
    return noStoreJson({ status: 'unavailable' }, { status: 502 });
  }
}

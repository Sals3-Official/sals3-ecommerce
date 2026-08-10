import 'server-only';

export type KlaviyoProfileImportPayload = {
  data: {
    type: 'profile';
    attributes: {
      email?: string;
      phone_number?: string;
      external_id?: string;
      first_name?: string;
      last_name?: string;
      image?: string;
      locale?: string;
      location?: {
        timezone?: string;
      };
      properties: Record<string, unknown>;
    };
  };
};

export type KlaviyoProfileImportResult =
  { status: 'synced' } | { status: 'disabled' } | { status: 'failed' };

const KLAVIYO_PROFILE_IMPORT_URL = 'https://a.klaviyo.com/api/profile-import';
const DEFAULT_KLAVIYO_REVISION = '2026-07-15';

export async function createOrUpdateKlaviyoProfile(
  payload: KlaviyoProfileImportPayload,
): Promise<KlaviyoProfileImportResult> {
  const privateKey = process.env.KLAVIYO_PRIVATE_API_KEY;

  if (!privateKey) {
    return { status: 'disabled' };
  }

  const response = await fetch(KLAVIYO_PROFILE_IMPORT_URL, {
    method: 'POST',
    headers: {
      accept: 'application/vnd.api+json',
      authorization: `Klaviyo-API-Key ${privateKey}`,
      'content-type': 'application/vnd.api+json',
      revision: process.env.KLAVIYO_API_REVISION ?? DEFAULT_KLAVIYO_REVISION,
    },
    body: JSON.stringify(payload),
  });

  return response.ok ? { status: 'synced' } : { status: 'failed' };
}

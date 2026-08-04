import { NextResponse } from 'next/server';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site';

export const revalidate = 86400;

export function GET() {
  const body = `# ${SITE_NAME}\n\n> ${SITE_DESCRIPTION}\n`;

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 's-maxage=86400, stale-while-revalidate',
    },
  });
}

import { revalidateTag } from 'next/cache';
import { timingSafeEqual } from 'node:crypto';
import { MARKET_TAG } from '@/lib/repositories/assets.db';

/**
 * Chamado pelo `services/transform` depois de publicar os marts: invalida o cache de mercado.
 * Protegido por `REVALIDATE_SECRET` no header `x-revalidate-secret`.
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  const given = request.headers.get('x-revalidate-secret') ?? '';
  if (!secret || !safeEqual(given, secret)) {
    return Response.json({ ok: false }, { status: 401 });
  }
  revalidateTag(MARKET_TAG);
  return Response.json({ ok: true, tag: MARKET_TAG });
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

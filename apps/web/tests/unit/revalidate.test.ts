import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const revalidateTag = vi.fn();
vi.mock('next/cache', () => ({ revalidateTag, unstable_cache: (fn: unknown) => fn }));

const req = (secret?: string) =>
  new Request('http://localhost/api/revalidate', {
    method: 'POST',
    headers: secret ? { 'x-revalidate-secret': secret } : {},
  });

describe('POST /api/revalidate', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    revalidateTag.mockReset();
  });

  it('401 sem segredo, com segredo errado ou sem REVALIDATE_SECRET configurado', async () => {
    const { POST } = await import('@/app/api/revalidate/route');
    vi.stubEnv('REVALIDATE_SECRET', '');
    expect((await POST(req('x'))).status).toBe(401);
    vi.stubEnv('REVALIDATE_SECRET', 's3cr3t');
    expect((await POST(req())).status).toBe(401);
    expect((await POST(req('errado'))).status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('200 com o segredo certo invalida a tag market-data', async () => {
    const { POST } = await import('@/app/api/revalidate/route');
    vi.stubEnv('REVALIDATE_SECRET', 's3cr3t');
    const res = await POST(req('s3cr3t'));
    expect(res.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith('market-data');
  });
});

import 'server-only';
import type { RequestContext, User } from './contracts';
import { mockUser } from './mock/assets';

/**
 * Quem está pedindo os dados. Na fase 1 (sem login) é sempre o usuário de exemplo, como admin.
 * No F2-1 passa a vir da sessão do Auth.js; nada além deste arquivo muda.
 */
export async function getRequestContext(): Promise<RequestContext> {
  return { userId: mockUser.id, role: 'admin' };
}

export async function getCurrentUser(): Promise<User> {
  return mockUser;
}

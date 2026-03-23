import type { Env } from './types';
import { requireAuth } from './lib/auth';
import { badRequest, notFound, serverError } from './lib/json';
import { handleLogin, handleLogout, handleMe, handleRegister } from './routes/auth';
import { createCard, deleteCard, getCard, listCards, updateCard } from './routes/cards';
import {
  createCollectionItem,
  deleteCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from './routes/collection';
import { getComps, refreshComps } from './routes/comps';
import { estimateGrade, getLatestGrade } from './routes/grading';
import { createRelease, getRelease, listReleases } from './routes/releases';
import { uploadDirect } from './routes/uploads';

function parseId(pathname: string): number | null {
  const id = Number(pathname.split('/').pop());
  return Number.isInteger(id) && id > 0 ? id : null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    const method = request.method.toUpperCase();

    try {
      if (method === 'GET' && pathname === '/api/health') {
        return new Response(JSON.stringify({ ok: true, data: { status: 'healthy' } }), {
          headers: { 'content-type': 'application/json; charset=utf-8' },
        });
      }

      if (method === 'POST' && pathname === '/api/auth/register') return handleRegister(env, request);
      if (method === 'POST' && pathname === '/api/auth/login') return handleLogin(env, request);
      if (method === 'POST' && pathname === '/api/auth/logout') return handleLogout(env, request);
      if (method === 'GET' && pathname === '/api/me') return handleMe(env, request);

      if (method === 'GET' && pathname === '/api/cards') return listCards(env, request);
      if (method === 'POST' && pathname === '/api/cards') return createCard(env, request);

      if (pathname.startsWith('/api/cards/')) {
        const id = parseId(pathname);
        if (!id) return badRequest('Invalid card id');
        if (method === 'GET') return getCard(env, id);
        if (method === 'PATCH') return updateCard(env, request, id);
        if (method === 'DELETE') return deleteCard(env, id);
      }

      if (pathname === '/api/collection') {
        const user = await requireAuth(env, request);
        if (user instanceof Response) return user;
        if (method === 'GET') return listCollection(env, user);
        if (method === 'POST') return createCollectionItem(env, request, user);
      }

      if (pathname.startsWith('/api/collection/')) {
        const id = parseId(pathname);
        if (!id) return badRequest('Invalid collection id');
        const user = await requireAuth(env, request);
        if (user instanceof Response) return user;
        if (method === 'GET') return getCollectionItem(env, user, id);
        if (method === 'PATCH') return updateCollectionItem(env, request, user, id);
        if (method === 'DELETE') return deleteCollectionItem(env, user, id);
      }

      if (method === 'POST' && pathname === '/api/uploads/direct') {
        const user = await requireAuth(env, request);
        if (user instanceof Response) return user;
        return uploadDirect(env, request, user);
      }

      if (pathname === '/api/releases') {
        if (method === 'GET') return listReleases(env, request);
        if (method === 'POST') return createRelease(env, request);
      }

      if (pathname.startsWith('/api/releases/')) {
        const id = parseId(pathname);
        if (!id) return badRequest('Invalid release id');
        if (method === 'GET') return getRelease(env, id);
      }

      if (pathname.startsWith('/api/comps/refresh/')) {
        const id = parseId(pathname);
        if (!id) return badRequest('Invalid card id');
        if (method === 'POST') return refreshComps(env, id);
      }

      if (pathname.startsWith('/api/comps/')) {
        const id = parseId(pathname);
        if (!id) return badRequest('Invalid card id');
        if (method === 'GET') return getComps(env, id);
      }

      if (method === 'POST' && pathname === '/api/grading/estimate') {
        const user = await requireAuth(env, request);
        if (user instanceof Response) return user;
        return estimateGrade(env, request, user);
      }

      if (pathname.startsWith('/api/grading/')) {
        const id = parseId(pathname);
        if (!id) return badRequest('Invalid collection item id');
        const user = await requireAuth(env, request);
        if (user instanceof Response) return user;
        if (method === 'GET') return getLatestGrade(env, id, user);
      }

      return notFound('Route not found');
    } catch (err) {
      console.error('Unhandled worker error', err);
      return serverError();
    }
  },
};

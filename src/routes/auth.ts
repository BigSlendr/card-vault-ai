import type { Env } from '../types';
import { getCurrentUser, loginUser, logoutUser, registerUser } from '../lib/auth';
import { badRequest, ok, unauthorized } from '../lib/json';
import { asEmail, asString, parseJsonBody } from '../lib/validation';

export async function handleRegister(env: Env, request: Request): Promise<Response> {
  const body = await parseJsonBody<{ email: unknown; password: unknown; username?: unknown }>(request);
  if (body instanceof Response) return body;

  try {
    const email = asEmail(body.email);
    const password = asString(body.password, 'password', 128, true);
    if (!password || password.length < 8) {
      return badRequest('password must be at least 8 characters');
    }
    const username = asString(body.username, 'username', 50);

    const user = await registerUser(env, { email, password, username });
    return ok(user, 201);
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : 'Unable to register');
  }
}

export async function handleLogin(env: Env, request: Request): Promise<Response> {
  const body = await parseJsonBody<{ email: unknown; password: unknown }>(request);
  if (body instanceof Response) return body;

  try {
    const email = asEmail(body.email);
    const password = asString(body.password, 'password', 128, true);
    if (!password) return badRequest('password is required');

    const result = await loginUser(env, email, password);
    if (!result) {
      return unauthorized('Invalid email or password');
    }

    return ok(result.user, 200, { 'set-cookie': result.cookie });
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : 'Unable to login');
  }
}

export async function handleLogout(env: Env, request: Request): Promise<Response> {
  const cookie = await logoutUser(env, request);
  return ok({ logged_out: true }, 200, { 'set-cookie': cookie });
}

export async function handleMe(env: Env, request: Request): Promise<Response> {
  const user = await getCurrentUser(env, request);
  if (!user) return unauthorized('Not signed in');
  return ok(user);
}

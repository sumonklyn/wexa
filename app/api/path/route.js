import { shortestPathBetween } from '../../../lib/queries.js';
import { ok, fail, badRequest } from '../../../lib/http.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const params = request.nextUrl.searchParams;
  const a = params.get('a');
  const b = params.get('b');
  if (!a || !b) return badRequest('Choose two people.');
  if (a === b) return badRequest('Choose two different people.');

  try {
    const [result] = await shortestPathBetween(a, b);
    return ok({ a, b, path: result ?? null });
  } catch (err) {
    return fail(err);
  }
}

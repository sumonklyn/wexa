import { collaboratorsWithSkill } from '../../../lib/queries.js';
import { ok, fail, badRequest } from '../../../lib/http.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const params = request.nextUrl.searchParams;
  const person = params.get('person');
  const skill = params.get('skill');
  if (!person || !skill) return badRequest('Choose a person and a skill.');

  try {
    const results = await collaboratorsWithSkill(person, skill);
    return ok({ person, skill, results });
  } catch (err) {
    return fail(err);
  }
}

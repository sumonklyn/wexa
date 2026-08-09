import { peopleWithSkill, peopleWithRelatedSkill } from '../../../lib/queries.js';
import { ok, fail, badRequest } from '../../../lib/http.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const skill = request.nextUrl.searchParams.get('skill');
  if (!skill) return badRequest('Choose a skill to search for.');

  try {
    const [direct, related] = await Promise.all([
      peopleWithSkill(skill),
      peopleWithRelatedSkill(skill),
    ]);
    return ok({ skill, direct, related });
  } catch (err) {
    return fail(err);
  }
}

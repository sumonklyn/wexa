import { listSkills } from '../../../lib/queries.js';
import { ok, fail } from '../../../lib/http.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return ok({ skills: await listSkills() });
  } catch (err) {
    return fail(err);
  }
}

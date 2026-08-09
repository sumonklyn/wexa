import 'dotenv/config';
import {
  peopleWithSkill,
  collaboratorsWithSkill,
  shortestPathBetween,
  peopleWithRelatedSkill,
} from '../lib/queries.js';
import { verifyConnectivity, closeDriver } from '../lib/neo4j.js';

async function main() {
  await verifyConnectivity();

  console.log('\n=== Query 1: who knows Kafka directly? (1 hop) ===');
  console.table(await peopleWithSkill('Kafka'));

  console.log('\n=== Query 2: Debasish needs Kafka — which collaborator has it? (3 hops) ===');
  console.table(await collaboratorsWithSkill('Debasish', 'Kafka'));

  console.log('\n=== Query 3: how is Debasish connected to Farah? (variable depth) ===');
  const [path] = await shortestPathBetween('Debasish', 'Farah');
  if (path) {
    console.log(`  ${path.hops} hops:`);
    console.log('  ' + path.steps.map((s) => `${s.name} (${s.label})`).join('  ->  '));
  } else {
    console.log('  no path found within 8 hops');
  }

  console.log('\n=== Bonus: nobody around knows Prisma — who knows a related skill? (2 hops) ===');
  console.table(await peopleWithRelatedSkill('Prisma'));
}

main()
  .catch((err) => {
    console.error('\nQuery demo failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDriver();
  });

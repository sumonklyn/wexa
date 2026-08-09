import 'dotenv/config';
import { runWrite, verifyConnectivity, closeDriver } from '../lib/neo4j.js';

/* ------------------------------------------------------------------ */
/*  Seed data                                                          */
/* ------------------------------------------------------------------ */

const people = [
  { name: 'Debasish', title: 'Senior Full-Stack Engineer' },
  { name: 'Lennox', title: 'CTO' },
  { name: 'Sanchit', title: 'Backend Engineer' },
  { name: 'Siddharth', title: 'QA Engineer' },
  { name: 'Priya', title: 'Data Engineer' },
  { name: 'Meera', title: 'Platform Engineer' },
  { name: 'Arjun', title: 'Mobile Engineer' },
  { name: 'Nadia', title: 'Frontend Engineer' },
  { name: 'Omar', title: 'DevOps Engineer' },
  { name: 'Farah', title: 'ML Engineer' },
  { name: 'Ravi', title: 'Security Engineer' },
  { name: 'Lena', title: 'Product Designer' },
  { name: 'Tomas', title: 'Backend Engineer' },
  { name: 'Yuki', title: 'Site Reliability Engineer' },
];

const skills = [
  { name: 'Django', category: 'Backend' },
  { name: 'DRF', category: 'Backend' },
  { name: 'Next.js', category: 'Frontend' },
  { name: 'React', category: 'Frontend' },
  { name: 'TypeScript', category: 'Frontend' },
  { name: 'JWT', category: 'Security' },
  { name: 'OAuth', category: 'Security' },
  { name: 'Kafka', category: 'Data' },
  { name: 'PostgreSQL', category: 'Data' },
  { name: 'Redis', category: 'Data' },
  { name: 'Go', category: 'Backend' },
  { name: 'Temporal', category: 'Backend' },
  { name: 'Docker', category: 'DevOps' },
  { name: 'Kubernetes', category: 'DevOps' },
  { name: 'GCP', category: 'Cloud' },
  { name: 'Stripe', category: 'Payments' },
  { name: 'TensorFlow', category: 'ML' },
  { name: 'Prisma', category: 'Backend' },
  { name: 'UI Design', category: 'Design' },
  { name: 'Cypher', category: 'Data' },
];

const projects = [
  { name: 'ZoikoMail', description: 'Business email platform' },
  { name: 'ZoikoMobile', description: 'UK mobile MVNO' },
  { name: 'ZoikoOrbit', description: 'eSIM platform' },
  { name: 'ZoikoLogia', description: 'AI accounting platform' },
  { name: 'ZoikoNex', description: 'Telecom BSS' },
  { name: 'ZoikoLocal', description: 'Cross-border calling' },
  { name: 'ZoikoBroadband', description: 'Broadband ordering' },
];

const hasSkill = [
  { person: 'Debasish', skill: 'Django', level: 5 },
  { person: 'Debasish', skill: 'DRF', level: 5 },
  { person: 'Debasish', skill: 'Next.js', level: 5 },
  { person: 'Debasish', skill: 'TypeScript', level: 4 },
  { person: 'Debasish', skill: 'Stripe', level: 3 },
  { person: 'Lennox', skill: 'React', level: 4 },
  { person: 'Lennox', skill: 'GCP', level: 4 },
  { person: 'Lennox', skill: 'Kubernetes', level: 3 },
  { person: 'Sanchit', skill: 'JWT', level: 5 },
  { person: 'Sanchit', skill: 'OAuth', level: 4 },
  { person: 'Sanchit', skill: 'Django', level: 4 },
  { person: 'Siddharth', skill: 'Cypher', level: 2 },
  { person: 'Siddharth', skill: 'PostgreSQL', level: 3 },
  { person: 'Priya', skill: 'Kafka', level: 5 },
  { person: 'Priya', skill: 'PostgreSQL', level: 5 },
  { person: 'Priya', skill: 'Redis', level: 4 },
  { person: 'Meera', skill: 'Go', level: 5 },
  { person: 'Meera', skill: 'Temporal', level: 4 },
  { person: 'Meera', skill: 'Kubernetes', level: 4 },
  { person: 'Arjun', skill: 'React', level: 4 },
  { person: 'Arjun', skill: 'Next.js', level: 4 },
  { person: 'Arjun', skill: 'TypeScript', level: 5 },
  { person: 'Nadia', skill: 'Next.js', level: 5 },
  { person: 'Nadia', skill: 'React', level: 5 },
  { person: 'Nadia', skill: 'UI Design', level: 3 },
  { person: 'Omar', skill: 'Docker', level: 5 },
  { person: 'Omar', skill: 'Kubernetes', level: 5 },
  { person: 'Omar', skill: 'GCP', level: 4 },
  { person: 'Farah', skill: 'TensorFlow', level: 5 },
  { person: 'Farah', skill: 'Kafka', level: 3 },
  { person: 'Ravi', skill: 'JWT', level: 4 },
  { person: 'Ravi', skill: 'OAuth', level: 5 },
  { person: 'Ravi', skill: 'PostgreSQL', level: 3 },
  { person: 'Lena', skill: 'UI Design', level: 5 },
  { person: 'Tomas', skill: 'Go', level: 4 },
  { person: 'Tomas', skill: 'PostgreSQL', level: 4 },
  { person: 'Tomas', skill: 'Prisma', level: 4 },
  { person: 'Yuki', skill: 'Docker', level: 4 },
  { person: 'Yuki', skill: 'Kubernetes', level: 4 },
  { person: 'Yuki', skill: 'GCP', level: 5 },
  { person: 'Yuki', skill: 'Redis', level: 3 },
];

const workedOn = [
  { person: 'Debasish', project: 'ZoikoMail', role: 'Lead' },
  { person: 'Debasish', project: 'ZoikoMobile', role: 'Backend' },
  { person: 'Sanchit', project: 'ZoikoMail', role: 'Auth' },
  { person: 'Priya', project: 'ZoikoMail', role: 'Data' },
  { person: 'Nadia', project: 'ZoikoMail', role: 'Frontend' },
  { person: 'Nadia', project: 'ZoikoLogia', role: 'Frontend' },
  { person: 'Omar', project: 'ZoikoMail', role: 'DevOps' },
  { person: 'Siddharth', project: 'ZoikoMail', role: 'QA' },
  { person: 'Siddharth', project: 'ZoikoMobile', role: 'QA' },
  { person: 'Lennox', project: 'ZoikoMobile', role: 'Architect' },
  { person: 'Lennox', project: 'ZoikoNex', role: 'Sponsor' },
  { person: 'Ravi', project: 'ZoikoMobile', role: 'Security' },
  { person: 'Ravi', project: 'ZoikoBroadband', role: 'Security' },
  { person: 'Meera', project: 'ZoikoNex', role: 'Backend' },
  { person: 'Meera', project: 'ZoikoOrbit', role: 'Backend' },
  { person: 'Arjun', project: 'ZoikoOrbit', role: 'Mobile' },
  { person: 'Farah', project: 'ZoikoLogia', role: 'ML' },
  { person: 'Lena', project: 'ZoikoLogia', role: 'Design' },
  { person: 'Lena', project: 'ZoikoLocal', role: 'Design' },
  { person: 'Tomas', project: 'ZoikoNex', role: 'Backend' },
  { person: 'Tomas', project: 'ZoikoLocal', role: 'Backend' },
  { person: 'Yuki', project: 'ZoikoBroadband', role: 'SRE' },
  { person: 'Yuki', project: 'ZoikoLocal', role: 'SRE' },
];

const requires = [
  { project: 'ZoikoMail', skill: 'Django' },
  { project: 'ZoikoMail', skill: 'JWT' },
  { project: 'ZoikoMail', skill: 'Kafka' },
  { project: 'ZoikoMail', skill: 'Next.js' },
  { project: 'ZoikoMobile', skill: 'Django' },
  { project: 'ZoikoMobile', skill: 'Next.js' },
  { project: 'ZoikoMobile', skill: 'Stripe' },
  { project: 'ZoikoMobile', skill: 'OAuth' },
  { project: 'ZoikoOrbit', skill: 'React' },
  { project: 'ZoikoOrbit', skill: 'PostgreSQL' },
  { project: 'ZoikoLogia', skill: 'TensorFlow' },
  { project: 'ZoikoLogia', skill: 'Next.js' },
  { project: 'ZoikoLogia', skill: 'UI Design' },
  { project: 'ZoikoNex', skill: 'Go' },
  { project: 'ZoikoNex', skill: 'Temporal' },
  { project: 'ZoikoNex', skill: 'Kafka' },
  { project: 'ZoikoNex', skill: 'PostgreSQL' },
  { project: 'ZoikoLocal', skill: 'Go' },
  { project: 'ZoikoLocal', skill: 'Redis' },
  { project: 'ZoikoLocal', skill: 'UI Design' },
  { project: 'ZoikoBroadband', skill: 'Docker' },
  { project: 'ZoikoBroadband', skill: 'PostgreSQL' },
];

const relatedTo = [
  { a: 'Django', b: 'DRF' },
  { a: 'Next.js', b: 'React' },
  { a: 'React', b: 'TypeScript' },
  { a: 'JWT', b: 'OAuth' },
  { a: 'Kafka', b: 'Redis' },
  { a: 'PostgreSQL', b: 'Prisma' },
  { a: 'Docker', b: 'Kubernetes' },
  { a: 'Kubernetes', b: 'GCP' },
  { a: 'TensorFlow', b: 'Kafka' },
];

/* ------------------------------------------------------------------ */
/*  Load                                                               */
/* ------------------------------------------------------------------ */

async function seed() {
  console.log('Checking database connectivity...');
  await verifyConnectivity();
  console.log('Connected.');

  console.log('Clearing existing data...');
  await runWrite('MATCH (n) DETACH DELETE n');

  console.log('Creating uniqueness constraints...');
  await runWrite('CREATE CONSTRAINT person_name IF NOT EXISTS FOR (p:Person) REQUIRE p.name IS UNIQUE');
  await runWrite('CREATE CONSTRAINT skill_name IF NOT EXISTS FOR (s:Skill) REQUIRE s.name IS UNIQUE');
  await runWrite('CREATE CONSTRAINT project_name IF NOT EXISTS FOR (pr:Project) REQUIRE pr.name IS UNIQUE');

  console.log('Loading nodes...');
  await runWrite(
    `UNWIND $rows AS row
     MERGE (p:Person {name: row.name})
     SET p.title = row.title`,
    { rows: people }
  );
  await runWrite(
    `UNWIND $rows AS row
     MERGE (s:Skill {name: row.name})
     SET s.category = row.category`,
    { rows: skills }
  );
  await runWrite(
    `UNWIND $rows AS row
     MERGE (pr:Project {name: row.name})
     SET pr.description = row.description`,
    { rows: projects }
  );

  console.log('Loading relationships...');
  await runWrite(
    `UNWIND $rows AS row
     MATCH (p:Person {name: row.person}), (s:Skill {name: row.skill})
     MERGE (p)-[r:HAS_SKILL]->(s)
     SET r.level = row.level`,
    { rows: hasSkill }
  );
  await runWrite(
    `UNWIND $rows AS row
     MATCH (p:Person {name: row.person}), (pr:Project {name: row.project})
     MERGE (p)-[r:WORKED_ON]->(pr)
     SET r.role = row.role`,
    { rows: workedOn }
  );
  await runWrite(
    `UNWIND $rows AS row
     MATCH (pr:Project {name: row.project}), (s:Skill {name: row.skill})
     MERGE (pr)-[:REQUIRES]->(s)`,
    { rows: requires }
  );
  await runWrite(
    `UNWIND $rows AS row
     MATCH (a:Skill {name: row.a}), (b:Skill {name: row.b})
     MERGE (a)-[:RELATED_TO]-(b)`,
    { rows: relatedTo }
  );

  const [counts] = await runWrite(
    `MATCH (p:Person) WITH count(p) AS people
     MATCH (s:Skill) WITH people, count(s) AS skills
     MATCH (pr:Project) WITH people, skills, count(pr) AS projects
     MATCH ()-[r]->() RETURN people, skills, projects, count(r) AS relationships`
  );

  console.log('\nSeed complete:');
  console.log(`  ${counts.people} people`);
  console.log(`  ${counts.skills} skills`);
  console.log(`  ${counts.projects} projects`);
  console.log(`  ${counts.relationships} relationships`);
}

seed()
  .catch((err) => {
    console.error('\nSeed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDriver();
  });

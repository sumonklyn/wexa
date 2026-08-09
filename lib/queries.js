import { runRead } from './neo4j.js';

/**
 * Every function here passes user input as query parameters ($name, $skill, ...).
 * There is no string concatenation of Cypher anywhere — the driver sends the
 * query text and the parameters separately, which is safe and lets the database
 * cache the query plan.
 */

/** All skills, for the search box / autocomplete. */
export function listSkills() {
  return runRead(
    `MATCH (s:Skill)
     RETURN s.name AS name, s.category AS category
     ORDER BY s.name`
  );
}

/** All people, for the two-person path picker. */
export function listPeople() {
  return runRead(
    `MATCH (p:Person)
     RETURN p.name AS name, p.title AS title
     ORDER BY p.name`
  );
}

/**
 * QUERY 1 — direct lookup (1 hop).
 * "Who knows <skill>, strongest first?"
 * A relational database handles this fine; it's the baseline.
 */
export function peopleWithSkill(skill) {
  return runRead(
    `MATCH (p:Person)-[r:HAS_SKILL]->(s:Skill {name: $skill})
     RETURN p.name AS name, p.title AS title, r.level AS level
     ORDER BY r.level DESC, p.name`,
    { skill }
  );
}

/**
 * QUERY 2 — multi-hop traversal (3 hops).
 * "Nobody I need to ask directly — which of my project collaborators knows <skill>?"
 * Walks: me -> project <- collaborator -> skill.
 * In SQL this is a chain of self-joins; here it's one readable pattern.
 */
export function collaboratorsWithSkill(person, skill) {
  return runRead(
    `MATCH (me:Person {name: $person})-[:WORKED_ON]->(project:Project)
           <-[:WORKED_ON]-(colleague:Person)-[r:HAS_SKILL]->(:Skill {name: $skill})
     WHERE colleague <> me
     RETURN DISTINCT colleague.name AS name,
                     colleague.title AS title,
                     r.level AS level,
                     project.name AS viaProject
     ORDER BY level DESC, name`,
    { person, skill }
  );
}

/**
 * QUERY 3 — variable-depth traversal (the one SQL can't express cleanly).
 * "How is <a> connected to <b>?"  The number of hops is unknown until runtime,
 * so we bound it at 8 and let shortestPath find the nearest chain through either
 * shared projects (WORKED_ON) or shared skills (HAS_SKILL).
 */
export function shortestPathBetween(a, b) {
  return runRead(
    `MATCH (a:Person {name: $a}), (b:Person {name: $b})
     MATCH path = shortestPath((a)-[:WORKED_ON|HAS_SKILL*..8]-(b))
     RETURN [n IN nodes(path) |
              { label: head(labels(n)), name: n.name }] AS steps,
            length(path) AS hops`,
    { a, b }
  );
}

/**
 * BONUS — adjacency via RELATED_TO (2 hops).
 * "Nobody knows <skill> — who knows a closely related one?"
 * Awkward relationally because "related" is itself an edge you traverse.
 */
export function peopleWithRelatedSkill(skill) {
  return runRead(
    `MATCH (target:Skill {name: $skill})-[:RELATED_TO]-(related:Skill)
           <-[r:HAS_SKILL]-(p:Person)
     RETURN DISTINCT p.name AS name,
                     p.title AS title,
                     related.name AS relatedSkill,
                     r.level AS level
     ORDER BY level DESC, name`,
    { skill }
  );
}

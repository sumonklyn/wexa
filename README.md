# Expertise & Collaboration Graph

Find who knows what across a company — and, when nobody obvious knows it, discover
who is reachable through shared projects and skills. Backed by
[CognoDB](https://console.cognodb.com) (openCypher over Bolt) and the official
Neo4j driver.

> Status: data layer complete (connection module, seed script, queries). Web UI
> and hosted demo are added on top of this layer.

## Use case

In any organisation the useful questions about expertise are questions about
*connection*, not lookup:

- Who knows a given skill, and how strong are they?
- I need a skill nobody on my immediate team has — which of my collaborators, or
  their collaborators, can help?
- How is one person connected to another at all?

A person, a project, and a skill form a small, densely linked graph. The value is
in the paths between them.

## Why a graph database?

A one-hop lookup ("who knows Kafka") is easy in any database. The interesting
queries here are about **paths of unknown length**, and that is exactly where a
relational schema struggles.

Take "how is Debasish connected to Farah?" You don't know in advance whether the
answer is two hops or six, so you can't write a fixed set of `JOIN`s. In SQL this
forces a **recursive CTE** with a manually tracked path array (to prevent cycles)
and a manual depth cap — dozens of lines that get slower as the graph grows.

The same question in Cypher:

```cypher
MATCH path = shortestPath((a:Person {name:$a})-[:WORKED_ON|HAS_SKILL*..8]-(b:Person {name:$b}))
RETURN path
```

Cycle handling, variable depth, and shortest-path selection are built in. That gap
— three lines versus a page of recursion — is what earns the graph its place. The
data model also lets a single `RELATED_TO` edge answer "who knows a *related*
skill", where "related" is itself a traversable relationship rather than a join key.

## Data model

```
        WORKED_ON
Person ─────────────▶ Project
   │                     │
   │ HAS_SKILL           │ REQUIRES
   ▼                     ▼
 Skill ◀──────────────── Skill
        (Project REQUIRES Skill)

Skill ─[:RELATED_TO]─ Skill   (adjacency between skills)
```

Nodes:

| Label | Properties |
|-------|------------|
| `Person` | `name`, `title` |
| `Skill` | `name`, `category` |
| `Project` | `name`, `description` |

Relationships:

| Type | From → To | Properties |
|------|-----------|------------|
| `HAS_SKILL` | Person → Skill | `level` (1–5) |
| `WORKED_ON` | Person → Project | `role` |
| `REQUIRES` | Project → Skill | — |
| `RELATED_TO` | Skill → Skill | — |

Uniqueness constraints are created on `Person.name`, `Skill.name` and
`Project.name` by the seed script.

## The main queries

All queries live in [`lib/queries.js`](lib/queries.js) and are fully
parameterised — the driver sends query text and parameters separately, so there
is no string-concatenated Cypher anywhere.

1. **Direct lookup (1 hop)** — `peopleWithSkill(skill)`: people who have a skill,
   ranked by level. The baseline a relational DB also handles well.
2. **Multi-hop traversal (3 hops)** — `collaboratorsWithSkill(person, skill)`:
   walks `me -> project <- collaborator -> skill` to find who among your
   collaborators has a skill you need.
3. **Variable-depth traversal** — `shortestPathBetween(a, b)`: `shortestPath` up
   to 8 hops across shared projects or skills. The number of hops is decided by
   the data, not the query — the query SQL can't express cleanly.
4. **Adjacency (2 hops)** — `peopleWithRelatedSkill(skill)`: when nobody knows a
   skill, find who knows a `RELATED_TO` one.

## Setup

### 1. Create a CognoDB instance

1. Sign up at <https://console.cognodb.com/signup> (free tier, no card).
2. Create a free **c0** instance and pick a region.
3. Copy the connection URI (`bolt+s://<instance-id>.databases.cognodb.cloud`),
   the username (`cognodb`), and the password shown once.

### 2. Configure and install

```bash
cp .env.example .env       # then paste your URI, username and password
npm install
```

### 3. Seed the database

```bash
npm run seed
```

Expected output ends with a count of people, skills, projects and relationships.

### 4. Verify the queries

```bash
npm run query-demo
```

This prints the direct, multi-hop and shortest-path queries running against your
live data.

## Project structure

```
expertise-graph/
├─ lib/
│  ├─ neo4j.js       # driver singleton, env config, integer conversion, reachability
│  └─ queries.js     # parameterised Cypher functions
├─ scripts/
│  ├─ seed.js        # loads nodes + relationships via UNWIND
│  └─ query-demo.js  # runs the headline queries in the terminal
├─ .env.example      # documents the required env vars (real .env is gitignored)
└─ package.json
```

## Error handling

Connection details are read only from environment variables and never committed.
`getDriver()` throws a clear error if any variable is missing, and
`verifyConnectivity()` is used to fail fast with a readable message when the
database is unreachable.

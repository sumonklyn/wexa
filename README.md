# Who Knows What — an Expertise & Collaboration Graph

**Live demo:** _add your Vercel URL here_ · **Repository:** _add your GitHub URL here_

A web app for finding expertise inside a company. You can search for a skill and see
who has it, look inside one person's network for a skill they need, and trace how any
two people are connected through the projects and skills they share.

It is a single **Next.js** app whose API routes query **CognoDB** (a graph database,
openCypher over Bolt) using the official **Neo4j JavaScript driver**.

---

## What the app does

The interface has three modes, each answering a different kind of question. A
non-technical user just picks a mode and fills in the boxes.

**1. Find experts** — *"Who knows Kafka?"*
Type a skill; get the people who have it, ranked by proficiency (1–5). If nobody has it
directly, the app also shows people who know a closely related skill.

**2. Search a network** — *"Debasish needs Kafka. Who in his circle can help?"*
Pick a person and a skill. The app finds people who worked on the same projects as that
person and have the skill — and tells you *which shared project* connects them.

**3. Trace a path** — *"How is Debasish connected to Farah?"*
Pick any two people. The app finds the shortest chain of shared projects and skills
linking them, and draws it out step by step. They may be linked directly, or through
several people in between — the app figures out how many steps it takes.

## Why a graph database?

The questions above are about **connections of unknown length**, which is what makes a
graph database the right tool rather than a relational one.

"How is Debasish connected to Farah?" is the clearest example. You don't know in advance
whether the answer is two steps or six, so you cannot write a fixed set of SQL `JOIN`s.
Relationally this needs a **recursive query** that manually tracks which people it has
already visited (to avoid going in circles) and manually stops at some depth. In a graph
database the same question is one short, readable query:

```cypher
MATCH path = shortestPath(
  (a:Person {name:$a})-[:WORKED_ON|HAS_SKILL*..8]-(b:Person {name:$b})
)
RETURN path
```

The database walks outward from one person, one step at a time, until it reaches the
other — handling the variable depth and the cycle-avoidance for you. That is the
capability the whole app is built around.

## The data: how people, skills and projects connect

Three kinds of node, connected by four kinds of relationship:

| Node | What it is |
|------|------------|
| `Person` | someone in the company (`name`, `title`) |
| `Skill` | a skill or technology (`name`, `category`) |
| `Project` | something people worked on (`name`, `description`) |

| Relationship | Meaning |
|--------------|---------|
| `Person -[:HAS_SKILL {level}]-> Skill` | a person knows a skill, at level 1–5 |
| `Person -[:WORKED_ON {role}]-> Project` | a person worked on a project |
| `Project -[:REQUIRES]-> Skill` | a project needed a skill |
| `Skill -[:RELATED_TO]- Skill` | two skills are adjacent (e.g. React ↔ Next.js) |

```
          WORKED_ON
 Person ───────────────▶ Project
   │                        │
   │ HAS_SKILL              │ REQUIRES
   ▼                        ▼
 Skill  ◀──────────────────┘
   │
   └──[:RELATED_TO]── Skill
```

The seed script ([`scripts/seed.js`](scripts/seed.js)) loads a realistic company
dataset — people, the skills they hold, the projects they worked on, and how skills
relate — using parameterised `UNWIND` statements.

## The queries behind each mode

All queries live in [`lib/queries.js`](lib/queries.js) and are **parameterised** (the
driver sends the query and the values separately — no string-built Cypher).

**Find experts — direct lookup (1 hop):**
```cypher
MATCH (p:Person)-[r:HAS_SKILL]->(s:Skill {name: $skill})
RETURN p.name AS name, p.title AS title, r.level AS level
ORDER BY r.level DESC, p.name
```

**Search a network — multi-hop (3 hops):** person → project → collaborator → skill.
```cypher
MATCH (me:Person {name: $person})-[:WORKED_ON]->(project:Project)
      <-[:WORKED_ON]-(colleague:Person)-[r:HAS_SKILL]->(:Skill {name: $skill})
WHERE colleague <> me
RETURN DISTINCT colleague.name AS name, colleague.title AS title,
                r.level AS level, project.name AS viaProject
ORDER BY level DESC, name
```

**Trace a path — variable depth (the query SQL finds awkward):**
```cypher
MATCH (a:Person {name: $a}), (b:Person {name: $b})
MATCH path = shortestPath((a)-[:WORKED_ON|HAS_SKILL*..8]-(b))
RETURN [n IN nodes(path) | {label: head(labels(n)), name: n.name}] AS steps,
       length(path) AS hops
```

**Related-skill fallback — adjacency (2 hops):** used by Find experts when no one has
the skill directly.
```cypher
MATCH (target:Skill {name: $skill})-[:RELATED_TO]-(related:Skill)
      <-[r:HAS_SKILL]-(p:Person)
RETURN DISTINCT p.name AS name, p.title AS title,
                related.name AS relatedSkill, r.level AS level
ORDER BY level DESC, name
```

## How the code is organised

One Next.js app. The browser calls the app's own API routes, and only those routes talk
to the database — the credentials never reach the browser.

```
Browser (React UI)  ──▶  API route  ──▶  lib/queries.js  ──▶  lib/neo4j.js  ──▶  CognoDB
```

```
expertise-graph/
├─ app/
│  ├─ api/
│  │  ├─ collaborators/route.js   # GET /api/collaborators     (Search a network)
│  │  ├─ path/route.js            # GET /api/path              (Trace a path)
│  │  ├─ people/route.js          # GET /api/people
│  │  ├─ people-by-skill/route.js # GET /api/people-by-skill   (Find experts)
│  │  └─ skills/route.js          # GET /api/skills
│  ├─ globals.css                 # hand-written styling
│  ├─ layout.jsx                  # fonts + page metadata
│  └─ page.jsx                    # the UI: three modes + loading/empty/error states
├─ lib/
│  ├─ http.js                     # success + graceful-error responses
│  ├─ neo4j.js                    # one shared driver, reads env vars, runs queries
│  └─ queries.js                  # the Cypher queries
├─ scripts/
│  ├─ query-demo.js               # runs the main queries in the terminal
│  └─ seed.js                     # loads the dataset into CognoDB
├─ .env.example
├─ .gitignore
├─ package.json
└─ README.md
```

**A quick tour for reviewing the code:** start at `lib/queries.js` to see the four
queries, then `lib/neo4j.js` to see how the driver is created once and reused. Any file
in `app/api/` shows a full request end to end (`path/route.js` is a good example), and
`app/page.jsx` is the UI that calls them.

**Following one request** (Trace a path): the UI calls `GET /api/path?a=…&b=…` →
`path/route.js` checks the two names differ, then calls `shortestPathBetween` →
`lib/queries.js` runs the `shortestPath` query → `lib/neo4j.js` runs it in a read
transaction and returns plain JSON → the UI draws the connection chain.

## Running it locally

**1. Create a CognoDB instance.** Sign up at
<https://console.cognodb.com/signup> (free, no card), create a free **c0** instance, and
copy the connection URI (`bolt+s://…`), the username (`cognodb`), and the one-time
password.

**2. Configure and install.**
```bash
cp .env.example .env       # paste your URI, username and password
npm install
```

**3. Load the data.**
```bash
npm run seed
```

**4. Run the app.**
```bash
npm run dev
```
Open <http://localhost:3000>.

*(Optional: `npm run query-demo` runs the three main queries in the terminal so you can
see the results without the UI.)*

## Configuration and error handling

- **Secrets:** the connection URI, username and password are read from environment
  variables (`NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`). They are server-side only
  and are never committed — `.env` is gitignored, and `.env.example` documents the shape.
- **Errors:** if the database is unreachable, the API returns a `503` with a clear
  message and the UI shows an inline banner instead of crashing. Every mode also has
  loading and empty states (with a suggested next step when a search returns nothing).

## Deploying (Vercel)

Push to GitHub and import in Vercel with the **Next.js** framework preset. Add
`NEO4J_URI`, `NEO4J_USERNAME` and `NEO4J_PASSWORD` as environment variables, deploy, and
make sure the deployment is publicly reachable (Settings → Deployment Protection → turn
off Vercel Authentication). Keep the CognoDB instance running while the app is being
reviewed.
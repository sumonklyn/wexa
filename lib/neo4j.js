import neo4j from 'neo4j-driver';

/**
 * A single shared Driver is created lazily and reused for the whole process.
 * The driver manages its own connection pool, so we never open one per request.
 */
let driver;

export function getDriver() {
  if (driver) return driver;

  const uri = process.env.NEO4J_URI;
  const username = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !username || !password) {
    throw new Error(
      'Missing database configuration. Set NEO4J_URI, NEO4J_USERNAME and NEO4J_PASSWORD in your environment.'
    );
  }

  driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
    // Keep the pool small — the free (c0) instance allows up to 200 connections.
    maxConnectionPoolSize: 20,
    connectionAcquisitionTimeout: 10_000,
  });

  return driver;
}

/**
 * Neo4j returns 64-bit integers as objects (to avoid JS precision loss).
 * For this app all counts fit in a normal Number, so we convert recursively
 * to keep the API responses plain JSON.
 */
function toPlain(value) {
  if (neo4j.isInt(value)) return value.toNumber();
  if (Array.isArray(value)) return value.map(toPlain);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toPlain(v)]));
  }
  return value;
}

/**
 * Run a read query in a managed read transaction and return plain objects.
 * All callers pass parameters as the `params` object — never string-built Cypher.
 */
export async function runRead(cypher, params = {}) {
  const session = getDriver().session({ defaultAccessMode: neo4j.session.READ });
  try {
    const result = await session.executeRead((tx) => tx.run(cypher, params));
    return result.records.map((record) => toPlain(record.toObject()));
  } finally {
    await session.close();
  }
}

/** Run a write query in a managed write transaction. Used by the seed script. */
export async function runWrite(cypher, params = {}) {
  const session = getDriver().session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    const result = await session.executeWrite((tx) => tx.run(cypher, params));
    return result.records.map((record) => toPlain(record.toObject()));
  } finally {
    await session.close();
  }
}

/** Throws if the database can't be reached — used for graceful error handling. */
export async function verifyConnectivity() {
  await getDriver().verifyConnectivity();
}

export async function closeDriver() {
  if (driver) {
    await driver.close();
    driver = undefined;
  }
}

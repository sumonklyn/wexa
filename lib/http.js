import { NextResponse } from 'next/server';

export function ok(data) {
  return NextResponse.json(data);
}

/**
 * Map errors to sensible HTTP responses. Anything that looks like the database
 * being unreachable becomes a 503 with an actionable message; a missing param
 * is a 400; everything else is a generic 500 that doesn't leak internals.
 */
export function fail(err) {
  const message = err?.message || 'Unexpected error';

  const unreachable =
    err?.code === 'ServiceUnavailable' ||
    err?.code === 'SessionExpired' ||
    /unreachable|ECONNREFUSED|getaddrinfo|routing|Unavailable|WebSocket|connection/i.test(message);

  if (unreachable || /Missing database configuration/.test(message)) {
    return NextResponse.json(
      { error: "Can't reach the database. Check the instance is running and the connection details are set." },
      { status: 503 }
    );
  }

  return NextResponse.json({ error: 'Something went wrong running that query.' }, { status: 500 });
}

export function badRequest(message) {
  return NextResponse.json({ error: message }, { status: 400 });
}

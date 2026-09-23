# OrderOnline runner

This Playwright service runs alongside n8n on the VPS. It creates an isolated
browser profile per Divination user and uses a temporary, token-protected noVNC
viewer only when a person must log in or complete reCAPTCHA.

The management API is available only behind the `ORDERONLINE_RUNNER_API_TOKEN`.
It never receives an OrderOnline username or password and never returns cookies,
storage, or page HTML. The viewer uses a distinct, high-entropy token that is
valid for fifteen minutes and is removed as soon as the user completes or cancels
the login.

While the protected viewer is open, CSV files explicitly exported by the person
inside OrderOnline are captured in that person's isolated VPS directory. The
management API exposes only a filename and size until Divination imports the
file server-to-server. Imported files are removed from the VPS, and any
unimported file expires after 24 hours. Browser cookies, storage, HTML, and
credentials are never exposed.

The public viewer is served by Traefik at
`https://orderonline-connect.axelabs.my.id`, but no Docker port is published.
The VNC server itself accepts only localhost traffic inside the container; the
noVNC websocket proxy maps a temporary viewer token to that local VNC target.

The legacy `POST /v1/auth/status` endpoint remains private to the Docker network
only so the existing n8n capability-check workflow continues to work. New app
flows use the authenticated `/api/v1/connections/:id/*` endpoints.

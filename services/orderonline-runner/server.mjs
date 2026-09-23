import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

const host = process.env.RUNNER_HOST ?? '0.0.0.0';
const port = parsePort(process.env.RUNNER_PORT ?? '3007');
const profilesRoot = process.env.ORDERONLINE_PROFILES_DIR ?? '/work/auth/profiles';
const legacyProfileDir = process.env.ORDERONLINE_LEGACY_PROFILE_DIR ?? '/work/auth/profile';
const runtimeDir = process.env.ORDERONLINE_RUNTIME_DIR ?? '/work/runtime';
const downloadsRoot = process.env.ORDERONLINE_DOWNLOADS_DIR ?? '/work/imports';
const tokenFile = join(runtimeDir, 'novnc.tokens');
const ordersUrl = process.env.ORDERONLINE_ORDERS_URL ?? 'https://app.orderonline.id/orders';
const viewerOrigin = requireHttpsOrigin('ORDERONLINE_VIEWER_ORIGIN');
const apiToken = requireSecret('ORDERONLINE_RUNNER_API_TOKEN');
const navigationTimeout = parseTimeout(process.env.ORDERONLINE_NAVIGATION_TIMEOUT_MS ?? '30000');
const loginTtlMs = parseTimeout(process.env.ORDERONLINE_LOGIN_TTL_MS ?? '900000');
const downloadTtlMs = parseTimeout(process.env.ORDERONLINE_DOWNLOAD_TTL_MS ?? '86400000');
const maxDownloadBytes = parseTimeout(process.env.ORDERONLINE_MAX_DOWNLOAD_BYTES ?? '10485760');
const connectionIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const downloadIdPattern = /^[0-9a-f]{32}$/i;
const chromiumProfileLockFiles = ['SingletonCookie', 'SingletonLock', 'SingletonSocket'];

let browserQueue = Promise.resolve();
let activeLogin = null;
let shuttingDown = false;

function parsePort(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error('RUNNER_PORT must be a valid TCP port');
  }
  return parsed;
}

function parseTimeout(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error('Timeout values must be positive integers');
  }
  return parsed;
}

function requireSecret(name) {
  const value = process.env[name]?.trim();
  if (!value || value.length < 32) {
    throw new Error(`${name} must be set to a strong secret`);
  }
  return value;
}

function requireHttpsOrigin(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);

  const origin = new URL(value);
  if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error(`${name} must be an HTTPS origin without a path`);
  }
  return origin;
}

function json(response, status, body) {
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(body));
}

function csv(response, body, filename) {
  response.writeHead(200, {
    'cache-control': 'no-store',
    'content-type': 'text/csv; charset=utf-8',
    'content-disposition': `attachment; filename="${sanitizeDownloadFilename(filename)}"`,
    'x-content-type-options': 'nosniff',
  });
  response.end(body);
}

function serializeBrowserTask(task) {
  const next = browserQueue.then(task, task);
  browserQueue = next.catch(() => undefined);
  return next;
}

function isRunnerRequestAuthorized(request) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) return false;

  const supplied = Buffer.from(authorization.slice('Bearer '.length));
  const expected = Buffer.from(apiToken);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function profileDirectory(connectionId) {
  if (!connectionIdPattern.test(connectionId)) {
    throw new Error('Invalid connection identifier');
  }
  return join(profilesRoot, connectionId);
}

function downloadDirectory(connectionId) {
  if (!connectionIdPattern.test(connectionId)) {
    throw new Error('Invalid connection identifier');
  }
  return join(downloadsRoot, connectionId);
}

function downloadPaths(connectionId, downloadId) {
  if (!downloadIdPattern.test(downloadId)) {
    throw new Error('Invalid download identifier');
  }

  const directory = downloadDirectory(connectionId);
  return {
    file: join(directory, `${downloadId}.csv`),
    metadata: join(directory, `${downloadId}.json`),
  };
}

function sanitizeDownloadFilename(value) {
  const cleaned = value
    .replace(/[\\/\0]/g, '-')
    .replace(/[^a-zA-Z0-9._() -]/g, '-')
    .slice(0, 160)
    .trim();
  return cleaned || 'orderonline-export.csv';
}

async function writeAtomic(path, value) {
  const temporaryFile = `${path}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
  await writeFile(temporaryFile, value, { mode: 0o600 });
  await rename(temporaryFile, path);
}

async function readDownloadMetadata(connectionId, downloadId) {
  const { metadata } = downloadPaths(connectionId, downloadId);
  try {
    const raw = await readFile(metadata, 'utf8');
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      parsed.id !== downloadId ||
      typeof parsed.filename !== 'string' ||
      typeof parsed.downloadedAt !== 'string' ||
      !Number.isSafeInteger(parsed.bytes)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function removeDownload(connectionId, downloadId) {
  const { file, metadata } = downloadPaths(connectionId, downloadId);
  await Promise.all([
    rm(file, { force: true }),
    rm(metadata, { force: true }),
  ]);
}

async function pruneExpiredDownloads(connectionId) {
  const directory = downloadDirectory(connectionId);
  const now = Date.now();
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }

  await Promise.all(entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map(async (entry) => {
      const downloadId = entry.name.slice(0, -'.json'.length);
      if (!downloadIdPattern.test(downloadId)) return;
      const metadata = await readDownloadMetadata(connectionId, downloadId);
      if (!metadata || Date.parse(metadata.downloadedAt) + downloadTtlMs <= now) {
        await removeDownload(connectionId, downloadId);
      }
    }));
}

async function listDownloads(connectionId) {
  await pruneExpiredDownloads(connectionId);
  const directory = downloadDirectory(connectionId);
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const downloads = await Promise.all(entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map(async (entry) => {
      const downloadId = entry.name.slice(0, -'.json'.length);
      return downloadIdPattern.test(downloadId)
        ? readDownloadMetadata(connectionId, downloadId)
        : null;
    }));

  return downloads
    .filter(Boolean)
    .sort((left, right) => Date.parse(right.downloadedAt) - Date.parse(left.downloadedAt));
}

async function saveCsvDownload(connectionId, download) {
  const suggestedFilename = sanitizeDownloadFilename(download.suggestedFilename());
  if (!suggestedFilename.toLowerCase().endsWith('.csv')) return;

  const directory = downloadDirectory(connectionId);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const downloadId = randomBytes(16).toString('hex');
  const { file, metadata } = downloadPaths(connectionId, downloadId);

  try {
    await download.saveAs(file);
    const fileStat = await stat(file);
    if (fileStat.size > maxDownloadBytes) {
      await removeDownload(connectionId, downloadId);
      return;
    }

    await writeAtomic(metadata, JSON.stringify({
      id: downloadId,
      filename: suggestedFilename,
      bytes: fileStat.size,
      downloadedAt: new Date().toISOString(),
    }));
  } catch {
    await removeDownload(connectionId, downloadId).catch(() => undefined);
  }
}

function statusForUrl(url) {
  try {
    const current = new URL(url);
    if (current.hostname !== 'app.orderonline.id') return 'needs_manual_login';
    return /\/(login|signin)/i.test(current.pathname)
      ? 'needs_manual_login'
      : 'authenticated';
  } catch {
    return 'unreachable';
  }
}

async function inspectProfile(profileDir) {
  await mkdir(profileDir, { recursive: true });
  const context = await launchPersistentContext(profileDir, {
    acceptDownloads: false,
    headless: true,
  });

  try {
    const page = context.pages()[0] ?? await context.newPage();
    await page.goto(ordersUrl, {
      timeout: navigationTimeout,
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(500);
    return statusForUrl(page.url());
  } catch {
    return 'unreachable';
  } finally {
    await context.close();
  }
}

async function removeStaleChromiumProfileLocks(profileDir) {
  await Promise.all(chromiumProfileLockFiles.map((filename) => rm(join(profileDir, filename), { force: true })));
}

async function launchPersistentContext(profileDir, options) {
  try {
    return await chromium.launchPersistentContext(profileDir, options);
  } catch {
    // A runner/container restart can leave Chromium's singleton files behind.
    // They only protect one persistent profile, and no context exists here because
    // the first launch already failed. Remove them and retry once.
    await removeStaleChromiumProfileLocks(profileDir);
    return chromium.launchPersistentContext(profileDir, options);
  }
}

async function writeViewerTokens() {
  await mkdir(runtimeDir, { recursive: true });
  const content = activeLogin ? `${activeLogin.viewerToken}: 127.0.0.1:5900\n` : '';
  await writeAtomic(tokenFile, content);
}

async function closeActiveLogin() {
  const current = activeLogin;
  if (!current) return;

  activeLogin = null;
  clearTimeout(current.expiryTimer);
  await writeViewerTokens();
  await Promise.allSettled(current.downloadTasks);
  await current.context.close().catch(() => undefined);
}

function viewerUrlFor(viewerToken) {
  const url = new URL('/vnc.html', viewerOrigin);
  url.searchParams.set('autoconnect', '1');
  url.searchParams.set('resize', 'scale');
  // noVNC's standard UI only forwards its `path` setting to the WebSocket
  // URL. Keeping the token in a separate viewer query parameter therefore
  // caused websockify to reject the socket with "Token not present".
  url.searchParams.set('path', `websockify?token=${viewerToken}`);
  return url.toString();
}

async function beginLogin(connectionId) {
  if (activeLogin && activeLogin.connectionId !== connectionId) {
    return { error: 'login_in_progress' };
  }

  if (activeLogin) {
    return {
      expiresAt: activeLogin.expiresAt,
      status: statusForUrl(activeLogin.page.url()),
      viewerUrl: viewerUrlFor(activeLogin.viewerToken),
    };
  }

  const profileDir = profileDirectory(connectionId);
  await mkdir(profileDir, { recursive: true });

  const context = await launchPersistentContext(profileDir, {
    acceptDownloads: true,
    headless: false,
    viewport: { height: 900, width: 1440 },
  });
  const page = context.pages()[0] ?? await context.newPage();
  const downloadTasks = new Set();
  context.on('download', (download) => {
    const task = saveCsvDownload(connectionId, download)
      .catch(() => undefined)
      .finally(() => downloadTasks.delete(task));
    downloadTasks.add(task);
  });

  try {
    await page.goto(ordersUrl, {
      timeout: navigationTimeout,
      waitUntil: 'domcontentloaded',
    });
  } catch {
    // The remote screen remains useful if the page is still loading or can be retried by the user.
  }

  const viewerToken = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + loginTtlMs).toISOString();
  const expiryTimer = setTimeout(() => {
    void serializeBrowserTask(closeActiveLogin);
  }, loginTtlMs);
  expiryTimer.unref();

  activeLogin = { connectionId, context, downloadTasks, expiryTimer, expiresAt, page, viewerToken };
  await writeViewerTokens();

  return {
    expiresAt,
    status: statusForUrl(page.url()),
    viewerUrl: viewerUrlFor(viewerToken),
  };
}

async function finishLogin(connectionId) {
  if (activeLogin?.connectionId === connectionId) {
    const status = statusForUrl(activeLogin.page.url());
    if (status === 'authenticated') {
      await closeActiveLogin();
    }
    return { status };
  }

  return { status: await inspectProfile(profileDirectory(connectionId)) };
}

async function connectionStatus(connectionId) {
  if (activeLogin?.connectionId === connectionId) {
    return { expiresAt: activeLogin.expiresAt, status: statusForUrl(activeLogin.page.url()) };
  }

  return { status: await inspectProfile(profileDirectory(connectionId)) };
}

function publicConnectionRoute(path) {
  return path.match(/^\/api\/v1\/connections\/([0-9a-f-]{36})(?:\/(start|complete|cancel|status))?$/i);
}

function publicDownloadRoute(path) {
  return path.match(/^\/api\/v1\/connections\/([0-9a-f-]{36})\/downloads(?:\/([0-9a-f]{32}))?$/i);
}

async function handleRequest(request, response) {
  const method = request.method ?? 'GET';
  const path = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`).pathname;

  if (method === 'GET' && path === '/health') {
    return json(response, 200, { service: 'orderonline-runner', status: 'ready' });
  }

  // Kept only for the existing private n8n capability-check workflow. It never exposes a profile.
  if (method === 'POST' && path === '/v1/auth/status') {
    const status = await serializeBrowserTask(() => inspectProfile(legacyProfileDir));
    return json(response, 200, { checkedAt: new Date().toISOString(), status });
  }

  const match = publicConnectionRoute(path);
  const downloadMatch = publicDownloadRoute(path);
  if (!match && !downloadMatch) return json(response, 404, { error: 'not_found' });
  if (!isRunnerRequestAuthorized(request)) return json(response, 401, { error: 'unauthorized' });

  if (downloadMatch) {
    const [, connectionId, downloadId] = downloadMatch;
    if (!connectionIdPattern.test(connectionId)) return json(response, 400, { error: 'invalid_connection' });

    if (method === 'GET' && !downloadId) {
      const downloads = await serializeBrowserTask(() => listDownloads(connectionId));
      return json(response, 200, { downloads });
    }

    if (!downloadId || !downloadIdPattern.test(downloadId)) {
      return json(response, 400, { error: 'invalid_download' });
    }

    if (method === 'GET') {
      await serializeBrowserTask(() => pruneExpiredDownloads(connectionId));
      const metadata = await readDownloadMetadata(connectionId, downloadId);
      if (!metadata) return json(response, 404, { error: 'download_not_found' });

      try {
        const { file } = downloadPaths(connectionId, downloadId);
        const contents = await readFile(file);
        return csv(response, contents, metadata.filename);
      } catch {
        return json(response, 404, { error: 'download_not_found' });
      }
    }

    if (method === 'DELETE') {
      await removeDownload(connectionId, downloadId);
      return json(response, 200, { status: 'deleted' });
    }

    return json(response, 405, { error: 'method_not_allowed' });
  }

  const [, connectionId, action = 'status'] = match;
  if (!connectionIdPattern.test(connectionId)) return json(response, 400, { error: 'invalid_connection' });

  if (method === 'POST' && action === 'start') {
    const result = await serializeBrowserTask(() => beginLogin(connectionId));
    return json(response, result.error ? 409 : 200, result);
  }

  if (method === 'POST' && action === 'complete') {
    const result = await serializeBrowserTask(() => finishLogin(connectionId));
    return json(response, 200, result);
  }

  if (method === 'POST' && action === 'cancel') {
    await serializeBrowserTask(async () => {
      if (activeLogin?.connectionId === connectionId) await closeActiveLogin();
    });
    return json(response, 200, { status: 'cancelled' });
  }

  if (method === 'GET' && action === 'status') {
    const result = await serializeBrowserTask(() => connectionStatus(connectionId));
    return json(response, 200, result);
  }

  return json(response, 405, { error: 'method_not_allowed' });
}

const server = createServer((request, response) => {
  void handleRequest(request, response).catch(() => {
    json(response, 500, { error: 'runner_error' });
  });
});

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  await serializeBrowserTask(closeActiveLogin);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

await mkdir(runtimeDir, { recursive: true });
await mkdir(downloadsRoot, { recursive: true, mode: 0o700 });
await writeViewerTokens();

server.listen(port, host, () => {
  console.log(`OrderOnline runner listening on ${host}:${port}`);
});

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

let cachedHandler = null;

async function loadHandler() {
  if (cachedHandler) return cachedHandler;
  const serverMod = await import('./_server.cjs');
  const resolved = serverMod?.default?.default || serverMod?.default || serverMod;
  if (typeof resolved !== 'function') {
    throw new Error('Server bundle did not export a default request handler function.');
  }
  cachedHandler = resolved;
  return cachedHandler;
}

export default async function vercelHandler(req, res) {
  try {
    if (
      typeof req?.url === 'string' &&
      (req.url === '/api/index' || req.url.startsWith('/api/index?')) &&
      typeof req?.headers?.['x-vercel-original-url'] === 'string' &&
      req.headers['x-vercel-original-url'].startsWith('/api/')
    ) {
      req.url = req.headers['x-vercel-original-url'];
    }
    const handler = await loadHandler();
    return await handler(req, res);
  } catch (err) {
    console.error('[Vercel Serverless Boot Error]', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          error: err?.message || 'Serverless function initialization failed.',
          code: err?.code || 'SERVERLESS_BOOT_ERROR',
          nodeVersion: process.version,
        })
      );
    }
  }
}

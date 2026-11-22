import serverMod from './_server.cjs';

const handler = serverMod?.default || serverMod;

export default function vercelHandler(req, res) {
  if (
    typeof req?.url === 'string' &&
    (req.url === '/api/index' || req.url.startsWith('/api/index?')) &&
    typeof req?.headers?.['x-vercel-original-url'] === 'string' &&
    req.headers['x-vercel-original-url'].startsWith('/api/')
  ) {
    req.url = req.headers['x-vercel-original-url'];
  }
  return handler(req, res);
}

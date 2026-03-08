addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const target = url.searchParams.get('url');
  if (!target) {
    return new Response('Add ?url=https://example.com', { status: 400 });
  }

  // Simple shared secret for you + 3 friends (change this!)
  const auth = request.headers.get('X-Secret');
  if (auth !== 'supersecretfor4people123') {
    return new Response('Unauthorized - add header X-Secret', { status: 401 });
  }

  try {
    const res = await fetch(target, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'follow',
    });

    // Forward response with CORS if needed
    const newRes = new Response(res.body, res);
    newRes.headers.set('Access-Control-Allow-Origin', '*'); // Optional for browser use
    return newRes;
  } catch (e) {
    return new Response('Proxy error: ' + e.message, { status: 502 });
  }
}

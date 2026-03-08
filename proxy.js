addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const target = url.searchParams.get('url');           // direct proxy mode
  const query = url.searchParams.get('q');              // search-engine mode

  const SECRET = 'schoolproxy';            // CHANGE THIS!

  // ── Show search-engine-like UI when no params ───────────────────────
  if (!target && !query) {
    if (request.method === 'POST') {
      const formData = await request.formData();
      const q = formData.get('q')?.toString().trim();
      const secret = formData.get('secret')?.toString();

      if (!q) return new Response('Enter a search term', { status: 400 });
      if (secret !== SECRET) return new Response('Wrong secret', { status: 401 });

      // Redirect to ?q=... (clean GET URL)
      return Response.redirect(`${url.origin}/?q=${encodeURIComponent(q)}`, 303);
    }

    // Beautiful minimal Google-like homepage
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Said2's Private Search Proxy</title>
  <style>
    body { margin:0; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; font-family:system-ui, sans-serif; background:#f8f9fa; }
    h1 { font-size:4rem; margin-bottom:1.5rem; color:#202124; font-weight:normal; }
    form { width:100%; max-width:600px; }
    .search-box { display:flex; padding:12px 20px; background:white; border:1px solid #dfe1e5; border-radius:24px; box-shadow:0 1px 6px rgba(32,33,36,0.28); }
    input[type="text"] { flex:1; border:none; outline:none; font-size:1.1rem; }
    input[type="password"] { width:180px; margin-left:12px; padding:12px; border:1px solid #dfe1e5; border-radius:24px; font-size:1rem; }
    button { margin-left:12px; padding:0 24px; background:#1a73e8; color:white; border:none; border-radius:24px; font-size:1rem; cursor:pointer; }
    button:hover { background:#1765cc; }
    .note { margin-top:2rem; color:#5f6368; font-size:0.9rem; }
  </style>
</head>
<body>
  <h1>Said2 Search</h1>
  <form method="POST">
    <div class="search-box">
      <input type="text" name="q" placeholder="Search with %s (e.g. cats)" autofocus required>
      <input type="password" name="secret" placeholder="Secret key" required>
      <button type="submit">Search</button>
    </div>
  </form>
  <p class="note">Powered by your private proxy • Only you + friends know the key</p>
</body>
</html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
  }

  // ── Handle search-engine mode (?q=...) ──────────────────────────────
  let finalTarget;
  if (query) {
    // CHANGE THIS LINE to your preferred search base URL with %s
    finalTarget = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    // Alternatives:
    // finalTarget = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
    // finalTarget = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    // finalTarget = `https://your-site.com/search?q=%s`.replace('%s', encodeURIComponent(query));
  } else if (target) {
    finalTarget = target;
  } else {
    return new Response('Use ?q=your+search or ?url=https://...', { status: 400 });
  }

  if (!finalTarget.startsWith('https://')) {
    return new Response('Only https:// allowed', { status: 400 });
  }

  // Secret check (for both modes)
  const auth = request.headers.get('X-Secret') || (await request.formData?.()?.then(fd => fd.get('secret')) || '');
  if (auth !== SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const outHeaders = new Headers(request.headers);
    outHeaders.delete('Host');
    outHeaders.delete('CF-Connecting-IP');
    outHeaders.delete('X-Forwarded-For');

    const res = await fetch(finalTarget, {
      method: request.method,
      headers: outHeaders,
      body: request.body,
      redirect: 'follow',
    });

    const newRes = new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });

    newRes.headers.set('Access-Control-Allow-Origin', '*'); // optional

    return newRes;
  } catch (e) {
    return new Response(`Proxy error: ${e.message}`, { status: 502 });
  }
}

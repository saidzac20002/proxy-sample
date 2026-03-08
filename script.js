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

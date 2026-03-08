addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const target = url.searchParams.get('url');

  // ── If no ?url= → show the nice form ───────────────────────────────
  if (!target) {
    if (request.method === 'POST') {
      // Handle form submission
      const formData = await request.formData();
      const targetFromForm = formData.get('url')?.toString();
      const secretFromForm = formData.get('secret')?.toString();

      if (!targetFromForm) {
        return new Response('Missing URL', { status: 400 });
      }
      if (secretFromForm !== '123') {
        return new Response('Wrong secret', { status: 401 });
      }

      // Redirect to same URL with ?url= (so GET can handle the proxy)
      return Response.redirect(`${url.origin}/?url=${encodeURIComponent(targetFromForm)}`, 303);
    }


    return new Response(html, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
  }

  // ── Proxy logic (same as before, but with improvements) ─────────────
  if (!target.startsWith('https://')) {
    return new Response('Only https:// URLs allowed', { status: 400 });
  }

  const auth = request.headers.get('X-Secret');
  if (auth !== 'supersecretfor4people123') {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const outHeaders = new Headers(request.headers);
    // Clean up headers that shouldn't go upstream
    outHeaders.delete('Host');
    outHeaders.delete('CF-Connecting-IP');
    outHeaders.delete('X-Forwarded-For');
    // ... add more deletes if needed

    const res = await fetch(target, {
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

    newRes.headers.set('Access-Control-Allow-Origin', '*'); // keep if needed

    return newRes;
  } catch (e) {
    return new Response(`Proxy error: ${e.message}`, { status: 502 });
  }
}
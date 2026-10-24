interface Env {
  GAS_WEB_APP_URL?: string;
}

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request),
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const url = env.GAS_WEB_APP_URL?.trim();
  if (!url || !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec(?:\?.*)?$/.test(url)) {
    return json({ success: false, error: 'Backend Google Apps Script belum dikonfigurasi pada environment deployment.' }, 503, request);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Request harus berupa JSON valid.' }, 400, request);
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json({ success: false, error: 'Format request tidak valid.' }, 400, request);
  }

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(body),
      redirect: 'follow',
    });
    const text = await upstream.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return json({ success: false, error: 'Respons Apps Script bukan JSON yang valid.' }, 502, request);
    }
    return json(parsed, upstream.ok ? 200 : 502, request);
  } catch {
    return json({ success: false, error: 'Tidak dapat menghubungi Google Apps Script. Periksa deployment dan koneksi.' }, 502, request);
  }
};

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('Origin') || '';
  const headers: Record<string, string> = {
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
  };
  // Pages serves the frontend and this API on the same origin. CORS is only allowed
  // for that exact origin, or omitted for server-side clients.
  if (origin && origin === new URL(request.url).origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
  }
  return headers;
}

function json(data: unknown, status: number, request: Request): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(request),
    },
  });
}

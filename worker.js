/**
 * chikennokura - Cloudflare Worker
 *
 * /api/visitor/profile   POST  訪問者プロフィール（年齢確認 + 性癖）を保存
 * /api/visitor/pageview  POST  ページビューを記録
 * /api/visitor/stats     GET   訪問者統計を返す（Supabase RPC）
 * それ以外                →    静的ファイル（assets）を返す
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    // ---- 訪問者プロフィール保存 ----
    if (url.pathname === '/api/visitor/profile' && request.method === 'POST') {
      try {
        const { visitor_id, is_adult, preferences } = await request.json();
        if (!visitor_id) return json({ error: 'visitor_id required' }, 400, cors);

        const res = await sb(env, 'POST', '/visitor_profiles', {
          visitor_id,
          is_adult,
          preferences: preferences ?? [],
        }, { 'Prefer': 'resolution=merge-duplicates,return=minimal' });

        if (!res.ok) throw new Error(await res.text());
        return json({ success: true }, 200, cors);
      } catch (e) {
        return json({ error: e.message }, 500, cors);
      }
    }

    // ---- ページビュー記録 ----
    if (url.pathname === '/api/visitor/pageview' && request.method === 'POST') {
      try {
        const { visitor_id, path, referrer } = await request.json();
        if (!visitor_id || !path) return json({ error: 'visitor_id and path required' }, 400, cors);

        const res = await sb(env, 'POST', '/events', {
          visitor_id,
          event_type: 'pageview',
          properties: { path, referrer: referrer ?? null },
        }, { 'Prefer': 'return=minimal' });

        if (!res.ok) throw new Error(await res.text());
        return json({ success: true }, 200, cors);
      } catch (e) {
        return json({ error: e.message }, 500, cors);
      }
    }

    // ---- 訪問者統計（Supabase PostgreSQL 関数を呼ぶ） ----
    if (url.pathname === '/api/visitor/stats' && request.method === 'GET') {
      try {
        const res = await sb(env, 'POST', '/rpc/get_visitor_stats', {});
        if (!res.ok) throw new Error(await res.text());
        return json(await res.json(), 200, cors);
      } catch (e) {
        return json({ error: e.message }, 500, cors);
      }
    }

    // ---- 静的ファイル ----
    return env.ASSETS.fetch(request);
  },
};

/** Supabase REST API 呼び出しヘルパー */
function sb(env, method, path, body, extra = {}) {
  return fetch(`${env.SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': env.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
      ...extra,
    },
    body: JSON.stringify(body),
  });
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

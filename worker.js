/**
 * chikennokura - Cloudflare Worker
 *
 * /api/survey            POST  アンケート回答を保存する
 * /api/survey/results    GET   アンケート集計結果を返す
 * /api/visitor/profile   POST  訪問者プロフィール（年齢確認 + 性癖）を保存する
 * /api/visitor/pageview  POST  ページビューを記録する
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

    // プリフライト
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    // ---- アンケート送信 ----
    if (url.pathname === '/api/survey' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { content, discovery, frequency, age } = body;

        if (!content || !discovery || !frequency || !age) {
          return json({ error: '全項目を入力してください' }, 400, cors);
        }

        await env.DB.prepare(
          `INSERT INTO survey_responses (content, discovery, frequency, age, submitted_at)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(content, discovery, frequency, age, new Date().toISOString()).run();

        return json({ success: true }, 200, cors);
      } catch (e) {
        return json({ error: e.message }, 500, cors);
      }
    }

    // ---- アンケート集計 ----
    if (url.pathname === '/api/survey/results' && request.method === 'GET') {
      try {
        const total  = await env.DB.prepare('SELECT COUNT(*) as n FROM survey_responses').first('n');
        const byContent   = await agg(env, 'content');
        const byDiscovery = await agg(env, 'discovery');
        const byFrequency = await agg(env, 'frequency');
        const byAge       = await agg(env, 'age');

        return json({ total, byContent, byDiscovery, byFrequency, byAge }, 200, cors);
      } catch (e) {
        return json({ error: e.message }, 500, cors);
      }
    }

    // ---- 訪問者プロフィール保存 ----
    if (url.pathname === '/api/visitor/profile' && request.method === 'POST') {
      try {
        const { visitor_id, is_adult, preferences } = await request.json();
        if (!visitor_id) return json({ error: 'visitor_id required' }, 400, cors);

        await env.DB.prepare(
          `INSERT INTO visitor_profiles (visitor_id, is_adult, preferences, created_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(visitor_id) DO UPDATE SET
             is_adult = excluded.is_adult,
             preferences = excluded.preferences`
        ).bind(
          visitor_id,
          is_adult ? 1 : 0,
          JSON.stringify(preferences || []),
          new Date().toISOString()
        ).run();

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

        await env.DB.prepare(
          `INSERT INTO page_views (visitor_id, path, referrer, viewed_at)
           VALUES (?, ?, ?, ?)`
        ).bind(visitor_id, path, referrer || null, new Date().toISOString()).run();

        return json({ success: true }, 200, cors);
      } catch (e) {
        return json({ error: e.message }, 500, cors);
      }
    }

    // ---- 静的ファイル ----
    return env.ASSETS.fetch(request);
  },
};

async function agg(env, col) {
  const r = await env.DB.prepare(
    `SELECT ${col} as label, COUNT(*) as count
     FROM survey_responses GROUP BY ${col} ORDER BY count DESC`
  ).all();
  return r.results;
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

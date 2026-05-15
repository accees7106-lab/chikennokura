/**
 * chikennokura - Cloudflare Worker
 *
 * /api/survey       POST  アンケート回答を保存する
 * /api/survey/results GET  アンケート集計結果を返す
 * それ以外            →   静的ファイル（assets）を返す
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

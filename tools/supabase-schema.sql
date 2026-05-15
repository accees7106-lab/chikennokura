-- ================================================================
--  chikennokura - Supabase スキーマ
--  Supabase ダッシュボード → SQL Editor で実行してください
-- ================================================================

-- 訪問者プロフィール（年齢確認 + 性癖選択）
CREATE TABLE IF NOT EXISTS visitor_profiles (
    id          BIGSERIAL PRIMARY KEY,
    visitor_id  TEXT NOT NULL UNIQUE,
    is_adult    BOOLEAN NOT NULL,
    preferences JSONB DEFAULT '[]',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 汎用イベントログ（pageview・click など将来的に何でも追加できる）
CREATE TABLE IF NOT EXISTS events (
    id          BIGSERIAL PRIMARY KEY,
    visitor_id  TEXT NOT NULL,
    event_type  TEXT NOT NULL,      -- 'pageview' | 'click' | ...
    properties  JSONB DEFAULT '{}', -- { "path": "/blog/", "referrer": "..." }
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- 分析用インデックス
CREATE INDEX IF NOT EXISTS idx_events_visitor    ON events (visitor_id);
CREATE INDEX IF NOT EXISTS idx_events_type       ON events (event_type);
CREATE INDEX IF NOT EXISTS idx_events_occurred   ON events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_properties ON events USING GIN (properties);

-- ----------------------------------------------------------------
--  Row Level Security（INSERT のみ anon に許可）
-- ----------------------------------------------------------------
ALTER TABLE visitor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events           ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_visitor_profiles" ON visitor_profiles;
CREATE POLICY "anon_insert_visitor_profiles"
    ON visitor_profiles FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "anon_insert_events" ON events;
CREATE POLICY "anon_insert_events"
    ON events FOR INSERT TO anon WITH CHECK (true);

-- ----------------------------------------------------------------
--  統計集計用 PostgreSQL 関数
--  SECURITY DEFINER で RLS を迂回してサーバー側で集計する
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_visitor_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE result JSON;
BEGIN
    SELECT json_build_object(
        'totalVisitors',  (SELECT COUNT(*) FROM visitor_profiles),
        'totalPageviews', (SELECT COUNT(*) FROM events WHERE event_type = 'pageview'),
        'avgPv', (
            SELECT COALESCE(ROUND(AVG(cnt)::numeric, 1), 0)
            FROM (
                SELECT COUNT(*) AS cnt
                FROM events
                WHERE event_type = 'pageview'
                GROUP BY visitor_id
            ) t
        ),
        'genres', (
            SELECT COALESCE(json_agg(r), '[]'::json)
            FROM (
                SELECT g.value AS label, COUNT(*) AS count
                FROM visitor_profiles,
                     jsonb_array_elements_text(preferences) g
                WHERE preferences IS NOT NULL
                  AND preferences <> '[]'::jsonb
                GROUP BY g.value
                ORDER BY count DESC
                LIMIT 10
            ) r
        ),
        'topPages', (
            SELECT COALESCE(json_agg(r), '[]'::json)
            FROM (
                SELECT properties->>'path' AS label, COUNT(*) AS count
                FROM events
                WHERE event_type = 'pageview'
                GROUP BY label
                ORDER BY count DESC
                LIMIT 8
            ) r
        ),
        'referrers', (
            SELECT COALESCE(json_agg(r), '[]'::json)
            FROM (
                SELECT
                    CASE
                        WHEN properties->>'referrer' IS NULL                                              THEN 'ダイレクト'
                        WHEN properties->>'referrer' LIKE '%google%'                                      THEN 'Google'
                        WHEN properties->>'referrer' LIKE '%twitter%'
                          OR properties->>'referrer' LIKE '%x.com%'                                       THEN 'Twitter / X'
                        WHEN properties->>'referrer' LIKE '%chikennokura%'                                THEN '内部リンク'
                        ELSE 'その他'
                    END AS label,
                    COUNT(*) AS count
                FROM events
                WHERE event_type = 'pageview'
                GROUP BY label
                ORDER BY count DESC
            ) r
        )
    ) INTO result;
    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_visitor_stats() TO anon;

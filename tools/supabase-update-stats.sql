-- ================================================================
--  get_visitor_stats() 更新版
--  Supabase ダッシュボード → SQL Editor で実行してください
--  （既存の関数を上書きします）
-- ================================================================

CREATE OR REPLACE FUNCTION get_visitor_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE result JSON;
BEGIN
    SELECT json_build_object(

        -- ---- 基本 KPI ----
        'totalVisitors',  (SELECT COUNT(*) FROM visitor_profiles),
        'totalPageviews', (SELECT COUNT(*) FROM events WHERE event_type = 'pageview'),
        'avgPv', (
            SELECT COALESCE(ROUND(AVG(cnt)::numeric, 1), 0)
            FROM (
                SELECT COUNT(*) AS cnt
                FROM events WHERE event_type = 'pageview'
                GROUP BY visitor_id
            ) t
        ),

        -- ---- エンゲージメント率（2ページ以上閲覧した訪問者の割合）----
        'engagementRate', (
            SELECT COALESCE(
                ROUND(
                    100.0 * COUNT(CASE WHEN cnt >= 2 THEN 1 END)::numeric
                    / NULLIF(COUNT(*), 0),
                    1
                ),
                0
            )
            FROM (
                SELECT visitor_id, COUNT(*) AS cnt
                FROM events WHERE event_type = 'pageview'
                GROUP BY visitor_id
            ) t
        ),

        -- ---- 好みジャンル ----
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

        -- ---- 人気ページ ----
        'topPages', (
            SELECT COALESCE(json_agg(r), '[]'::json)
            FROM (
                SELECT properties->>'path' AS label, COUNT(*) AS count
                FROM events WHERE event_type = 'pageview'
                GROUP BY label
                ORDER BY count DESC
                LIMIT 8
            ) r
        ),

        -- ---- 流入元 ----
        'referrers', (
            SELECT COALESCE(json_agg(r), '[]'::json)
            FROM (
                SELECT
                    CASE
                        WHEN properties->>'referrer' IS NULL                                         THEN 'ダイレクト'
                        WHEN properties->>'referrer' LIKE '%google%'                                 THEN 'Google'
                        WHEN properties->>'referrer' LIKE '%twitter%'
                          OR properties->>'referrer' LIKE '%x.com%'                                  THEN 'Twitter / X'
                        WHEN properties->>'referrer' LIKE '%chikennokura%'                           THEN '内部リンク'
                        ELSE 'その他'
                    END AS label,
                    COUNT(*) AS count
                FROM events WHERE event_type = 'pageview'
                GROUP BY label
                ORDER BY count DESC
            ) r
        ),

        -- ---- 時間帯別アクセス（日本時間）----
        'hourly', (
            SELECT COALESCE(json_agg(r ORDER BY r.hour), '[]'::json)
            FROM (
                SELECT
                    EXTRACT(HOUR FROM occurred_at AT TIME ZONE 'Asia/Tokyo')::int AS hour,
                    COUNT(*) AS count
                FROM events WHERE event_type = 'pageview'
                GROUP BY hour
            ) r
        ),

        -- ---- 曜日別アクセス（0=日〜6=土）----
        'weekly', (
            SELECT COALESCE(json_agg(r ORDER BY r.dow), '[]'::json)
            FROM (
                SELECT
                    EXTRACT(DOW FROM occurred_at AT TIME ZONE 'Asia/Tokyo')::int AS dow,
                    COUNT(*) AS count
                FROM events WHERE event_type = 'pageview'
                GROUP BY dow
            ) r
        )

    ) INTO result;
    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_visitor_stats() TO anon;

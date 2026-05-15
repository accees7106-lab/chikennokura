-- アンケート回答テーブル
-- 初回セットアップ時に一度だけ実行する
-- 実行方法: npx wrangler d1 execute chikennokura-survey --file=tools/init-survey-db.sql

CREATE TABLE IF NOT EXISTS survey_responses (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  content      TEXT NOT NULL,   -- 好きなコンテンツ
  discovery    TEXT NOT NULL,   -- 知ったきっかけ
  frequency    TEXT NOT NULL,   -- 訪問頻度
  age          TEXT NOT NULL,   -- 年代
  submitted_at TEXT NOT NULL    -- 送信日時 (ISO 8601)
);

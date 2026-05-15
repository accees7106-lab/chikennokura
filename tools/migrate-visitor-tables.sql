-- 訪問者プロフィール（年齢確認 + 性癖選択）
CREATE TABLE IF NOT EXISTS visitor_profiles (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor_id  TEXT NOT NULL UNIQUE,
    is_adult    INTEGER NOT NULL,  -- 1: 18歳以上, 0: 未満
    preferences TEXT,              -- JSON 配列 ["巨乳・爆乳", ...]
    created_at  TEXT NOT NULL
);

-- ページビュー記録
CREATE TABLE IF NOT EXISTS page_views (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor_id  TEXT NOT NULL,
    path        TEXT NOT NULL,
    referrer    TEXT,
    viewed_at   TEXT NOT NULL
);

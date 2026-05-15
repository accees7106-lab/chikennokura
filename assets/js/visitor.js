(function () {
    'use strict';

    var ID_KEY       = 'ckv_id';
    var DONE_KEY     = 'ckv_done';
    var REJECTED_KEY = 'ckv_rej';
    var OWNER_KEY    = 'ckv_owner';

    var GENRES = [
        '巨乳・爆乳',
        'ロリ系',
        'お姉さん・熟女',
        'NTR・寝取られ',
        '調教・SM',
        '百合・GL',
        'ショタ',
        '触手・モンスター',
        'バニラ・純愛',
        'その他',
    ];

    var STYLES = [
        '#ckv-overlay{position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:9999;',
            'display:flex;align-items:center;justify-content:center;padding:1rem}',
        '#ckv-box{background:#fff;border-radius:16px;padding:2rem;max-width:460px;',
            'width:100%;box-shadow:0 24px 64px rgba(0,0,0,.45);font-family:sans-serif}',
        '#ckv-box h2{font-size:1.3rem;color:#1e293b;margin:0 0 .75rem}',
        '#ckv-box p{color:#475569;font-size:.93rem;line-height:1.65;margin:0 0 1.25rem}',
        '.ckv-row{display:flex;gap:.75rem;flex-wrap:wrap}',
        '.ckv-btn{flex:1;padding:.7rem 1rem;border:none;border-radius:8px;',
            'font-size:.97rem;font-weight:700;cursor:pointer;transition:background .18s}',
        '.ckv-ok{background:#4a90e2;color:#fff}.ckv-ok:hover{background:#2563eb}',
        '.ckv-ng{background:#e2e8f0;color:#475569}.ckv-ng:hover{background:#cbd5e1}',
        '.ckv-checks{display:flex;flex-direction:column;gap:.5rem;margin-bottom:1.25rem}',
        '.ckv-checks label{display:flex;align-items:center;gap:.55rem;font-size:.92rem;',
            'color:#334155;cursor:pointer;padding:.35rem .6rem;border-radius:6px;transition:background .13s}',
        '.ckv-checks label:hover{background:#f1f5f9}',
        '.ckv-checks input[type=checkbox]{accent-color:#4a90e2;width:15px;height:15px;flex-shrink:0}',
        '.ckv-wall{text-align:center;padding:.5rem 0}',
        '.ckv-wall h2{color:#dc2626}',
    ].join('');

    function getVisitorId() {
        var id = localStorage.getItem(ID_KEY);
        if (!id) {
            id = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
            localStorage.setItem(ID_KEY, id);
        }
        return id;
    }

    function post(path, body) {
        return fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }).catch(function () {});
    }

    function trackPageView() {
        post('/api/visitor/pageview', {
            visitor_id: getVisitorId(),
            path: location.pathname + location.search,
            referrer: document.referrer || null,
        });
    }

    function removeOverlay() {
        var el = document.getElementById('ckv-overlay');
        if (el) el.remove();
    }

    function showWall(box) {
        box.innerHTML = [
            '<div class="ckv-wall">',
            '<h2>⚠️ ご利用いただけません</h2>',
            '<p>このサイトは18歳以上の方を対象としています。<br>ご退場をお願いします。</p>',
            '</div>',
        ].join('');
    }

    function showStep2(box) {
        var items = GENRES.map(function (g) {
            return '<label><input type="checkbox" value="' + g + '">' + g + '</label>';
        }).join('');

        box.innerHTML = [
            '<h2>好きなジャンルを教えてください</h2>',
            '<p>複数選択できます（省略可）。コンテンツの最適化に使用します。</p>',
            '<div class="ckv-checks">' + items + '</div>',
            '<div class="ckv-row">',
            '<button class="ckv-btn ckv-ok" id="ckv-submit">回答して入場する</button>',
            '</div>',
        ].join('');

        document.getElementById('ckv-submit').addEventListener('click', function () {
            var checked = Array.prototype.slice.call(
                box.querySelectorAll('input[type=checkbox]:checked')
            ).map(function (el) { return el.value; });

            post('/api/visitor/profile', {
                visitor_id: getVisitorId(),
                is_adult: true,
                preferences: checked,
            });

            localStorage.setItem(DONE_KEY, '1');
            removeOverlay();
            trackPageView();
        });
    }

    function showStep1() {
        var overlay = document.createElement('div');
        overlay.id = 'ckv-overlay';
        overlay.innerHTML = [
            '<div id="ckv-box">',
            '<h2>🔞 年齢確認</h2>',
            '<p>このサイトはアダルトコンテンツを含む場合があります。<br>',
            'あなたは <strong>18歳以上</strong> ですか？</p>',
            '<div class="ckv-row">',
            '<button class="ckv-btn ckv-ok" id="ckv-yes">はい、18歳以上です</button>',
            '<button class="ckv-btn ckv-ng" id="ckv-no">いいえ</button>',
            '</div>',
            '</div>',
        ].join('');
        document.body.appendChild(overlay);

        var box = document.getElementById('ckv-box');
        document.getElementById('ckv-yes').addEventListener('click', function () {
            showStep2(box);
        });
        document.getElementById('ckv-no').addEventListener('click', function () {
            localStorage.setItem(REJECTED_KEY, '1');
            showWall(box);
        });
    }

    function injectStyles() {
        var s = document.createElement('style');
        s.textContent = STYLES;
        document.head.appendChild(s);
    }

    window.addEventListener('DOMContentLoaded', function () {
        // オーナーモード: 計測もポップアップも完全スキップ
        if (localStorage.getItem(OWNER_KEY)) {
            return;
        }

        injectStyles();
        getVisitorId();

        if (localStorage.getItem(REJECTED_KEY)) {
            showStep1(); // 再度壁を見せる（年齢確認からやり直し）
            return;
        }

        if (localStorage.getItem(DONE_KEY)) {
            trackPageView();
            return;
        }

        showStep1();
    });
}());

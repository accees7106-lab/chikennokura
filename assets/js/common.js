async function loadComponent(id, file) {
    const element = document.getElementById(id);
    if (!element) return;
    try {
        const response = await fetch(file);
        if (!response.ok) throw new Error('load failed: ' + file);
        element.innerHTML = await response.text();

        // スクリプトを直列実行：inline（設定変数）→ external（ウィジェット）の順を保証する
        const scripts = [...element.querySelectorAll('script')];
        for (const orig of scripts) {
            await new Promise(resolve => {
                const s = document.createElement('script');
                [...orig.attributes].forEach(attr => s.setAttribute(attr.name, attr.value));
                s.textContent = orig.textContent;
                if (s.src) {
                    s.onload = resolve;
                    s.onerror = resolve;
                } else {
                    // inline スクリプトは replaceWith で即時実行される
                    resolve();
                }
                orig.replaceWith(s);
            });
        }
    } catch (error) {
        console.error(error);
    }
}

window.onload = () => {
    loadComponent('common-header',  '/assets/components/header.html');
    loadComponent('common-sidebar', '/assets/components/sidebar.html');
    loadComponent('common-footer',  '/assets/components/footer.html');
};

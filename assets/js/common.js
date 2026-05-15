async function loadComponent(id, file) {
    const element = document.getElementById(id);
    if (!element) return;
    try {
        const response = await fetch(window.location.origin + file);
        if (!response.ok) throw new Error('読み込みに失敗しましたわ：' + file);
        element.innerHTML = await response.text();

        // innerHTML で挿入した <script> はブラウザが実行しないため手動で再生成する
        element.querySelectorAll('script').forEach(orig => {
            const s = document.createElement('script');
            [...orig.attributes].forEach(attr => s.setAttribute(attr.name, attr.value));
            s.textContent = orig.textContent;
            orig.replaceWith(s);
        });
    } catch (error) {
        console.error(error);
    }
}

window.onload = () => {
    loadComponent('common-header',  '/assets/components/header.html');
    loadComponent('common-sidebar', '/assets/components/sidebar.html');
    loadComponent('common-footer',  '/assets/components/footer.html');
};

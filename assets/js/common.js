async function loadComponent(id, file) {
    const element = document.getElementById(id);
    if (element) {
        try {
            // location.origin を使うことで、どの階層からでもルート(Top)からファイルを探せます
            const response = await fetch(window.location.origin + file);
            if (!response.ok) throw new Error('読み込みに失敗しましたわ：' + file);
            const content = await response.text();
            element.innerHTML = content;
        } catch (error) {
            console.error(error);
        }
    }
}

window.onload = () => {
    // 最初の「/」を忘れずに！
    loadComponent('common-header', '/assets/components/header.html');
    loadComponent('common-footer', '/assets/components/footer.html');
};
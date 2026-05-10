// 指定したIDの要素に、外部HTMLファイルを流し込む関数です
async function loadComponent(id, file) {
    const element = document.getElementById(id);
    if (element) {
        const response = await fetch(file);
        const content = await response.text();
        element.innerHTML = content;
    }
}

// ページが読み込まれたら実行
window.onload = () => {
    loadComponent('common-header', 'header.html');
    loadComponent('common-footer', 'footer.html');
};
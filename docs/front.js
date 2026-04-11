document.querySelector('form').addEventListener('input', () => {
    localStorage.setItem('title', document.getElementById('title-input').value);
    localStorage.setItem('body', document.getElementById('body-input').value);
});

document.getElementById('privacychoice').addEventListener('click', () => {
    document.getElementById('popup-bg').style.display = 'block';
    document.getElementById('privacypopup').style.display = 'block';
});
document.getElementById('closePrivacy').addEventListener('click', () => { closePrivacyPopup(); });
document.getElementById('popup-bg').addEventListener('click', () => { closePrivacyPopup(); });
function closePrivacyPopup() {
    document.getElementById('privacypopup').style.display = 'none';
    document.getElementById('popup-bg').style.display = 'none';
}
// プライバシー選択の保存
document.querySelectorAll('input[name="privacy"]').forEach(input => {
    input.addEventListener('change', () => {
        const choice = document.querySelector('input[name="privacy"]:checked').value;
        localStorage.setItem('privacyChoice', choice);
    });
});
// ページ読み込み時に選択を復元
document.addEventListener('DOMContentLoaded', () => {
    const savedChoice = localStorage.getItem('privacyChoice');
    if (savedChoice) {
        document.getElementById(savedChoice).checked = true;
    }
    //フォーム内容(title,body)の復元
    document.getElementById('title-input').value = localStorage.getItem('title') || '';
    document.getElementById('body-input').value = localStorage.getItem('body') || '';
    //テキストサイズの復元
    const savedTextSize = localStorage.getItem('textSize');
    if (savedTextSize) {
        document.getElementById('text-size').value = savedTextSize;
        document.body.style.fontSize = savedTextSize;
    }
});

/*拒否状態でない場合に
       <script src="//accaii.com/harutv/script.js" async>と、<noscript><img src="//accaii.com/harutv/script?guid=on"></noscript>を設置
*/
// プライバシー選択に応じたスクリプトの読み込み
function loadAnalyticsScript() {
    const choice = localStorage.getItem('privacyChoice');
    if (choice !== 'reject') {
        const script = document.createElement('script');
        script.src = '//accaii.com/harutv/script.js';
        script.async = true;
        document.getElementById('analytics-tag-area').appendChild(script);

        const noscript = document.createElement('noscript');
        noscript.innerHTML = '<img src="//accaii.com/harutv/script?guid=on" alt="Analytics">';
        document.getElementById('analytics-tag-area').appendChild(noscript);
    }
}
loadAnalyticsScript();
document.querySelector('form').addEventListener('submit', () => {
    localStorage.removeItem('title');
    localStorage.removeItem('body');
});
document.addEventListener('DOMContentLoaded', () => {
    const audio = document.querySelector('#audio-player');
    const source = '/stream/playlist.m3u8';

    // HLS 読み込み
    if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(source);
        hls.attachMedia(audio);
    } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        audio.src = source;
    }

    // Plyr 初期化
    const player = new Plyr(audio, {
        controls: ['play', 'progress', 'current-time', 'mute', 'volume', 'settings']
    });
});

// スクロールでヘッダー隠す
/*window.addEventListener('scroll', () => {
    
    const header = document.getElementById('header');
    header.style.top = window.scrollY > 50 ? '-100px' : '0';
    
});*/
//ガクガクしないように、スクロールする方向を判定する
document.body.style.backgroundColor = 'rgb(115, 115, 165)';

const lastScrollY = 0;
const form = document.querySelector('.oniisan-form');
window.addEventListener('scroll', () => {
    const header = document.getElementById('header');
    if (window.scrollY > lastScrollY && window.scrollY > 50) {
        header.style.top = '-100px';
    } else {
        header.style.top = '0';
    }
    //お兄さんお便りフォームが見えるようになったらbodyの背景色を#f0f0f0にフェードで徐々に変える

    const formTop = form.offsetTop;
    const formHeight = form.offsetHeight;
    const windowBottom = window.scrollY + window.innerHeight;
    if (windowBottom > formTop && window.scrollY < formTop + formHeight) {
        document.body.style.transition = 'background-color 0.8s';
        document.body.style.backgroundColor = '#f0f0f0';
    } else {
        document.body.style.transition = 'background-color 0.5s';
        document.body.style.backgroundColor = 'rgb(115, 115, 165)';
    }
});
// ----------------------------
// 文字 → 時間換算（統一関数）
// ----------------------------
function calcSentenceTime(sentence) {
    let t = 0;
    for (let char of sentence) {
        if (char.match(/[一-龯]/)) t += 0.3;       // 漢字
        else if (char.match(/[ぁ-ん]/)) t += 0.2; // ひらがな
        else if (char.match(/[ァ-ン]/)) t += 0.2; // カタカナ
        else t += 0.1;                            // その他
    }
    return t;
}

// ----------------------------
// README 取得 → DISCUSS 部分抽出
// ----------------------------
const scrolledbyuser = false; // ユーザースクロールフラグ
fetch('/readme.md')
    .then(response => response.text())
    .then(text => {
        const startMarker = '<!-- DISCUSS_COACH_START -->';
        const endMarker = '<!-- DISCUSS_COACH_END -->';
        const startIndex = text.indexOf(startMarker) + startMarker.length;
        const endIndex = text.indexOf(endMarker);
        const discussContent = text.substring(startIndex, endIndex).trim();

        const contentBox = document.getElementById('contentbox');

        // 文の区切り強化（。！!？? 改行）
        const sentences = discussContent.split(/(?<=[。！!？?\n])/);

        // 表示（# と * を削除）
        sentences.forEach(sentence => {
            const p = document.createElement('p');
            p.textContent = sentence
                .trim()
                .replace(/#/g, '')   // ← 削除
                .replace(/\*/g, ''); // ← 削除
            contentBox.appendChild(p);
        });

        const audio = document.querySelector('#audio-player');

        // ----------------------------
        // クリック → 再生位置へジャンプ
        // ----------------------------
        sentences.forEach((sentence, index) => {
            const p = contentBox.children[index];
            p.addEventListener('click', () => {
                let time = 0;
                for (let i = 0; i < index; i++) {
                    time += calcSentenceTime(sentences[i]);
                }
                audio.currentTime = time;
            });
        });

        // ----------------------------
        // 再生時間 → 現在の文をハイライト
        // ----------------------------
        audio.addEventListener('timeupdate', () => {
            let t = 0;
            for (let i = 0; i < sentences.length; i++) {
                t += calcSentenceTime(sentences[i]);
                if (audio.currentTime < t) {
                    [...contentBox.children].forEach(p => p.classList.remove('nowct'));
                    contentBox.children[i].classList.add('nowct');
                    // 現在の文が見えるようにスクロール
                    const pTop = contentBox.children[i].offsetTop;
                    const pHeight = contentBox.children[i].offsetHeight;
                    const boxTop = contentBox.scrollTop;
                    const boxHeight = contentBox.offsetHeight;
                    if (pTop < boxTop || pTop + pHeight > boxTop + boxHeight) {
                        contentBox.scrollTo({
                            top: pTop - boxHeight / 2 + pHeight / 2,
                            behavior: 'smooth'
                        });
                    }
                    break;

                }
            }
        });
    })
    .catch(error => console.error('Error fetching README:', error));
//スマホの画面サイズならh11の文字列を「はるはる体操のお兄さん」に変更
window.addEventListener('resize', () => {
    const h11 = document.getElementById('h11');
    if (window.innerWidth < 600) {
        h11.textContent = 'はるはる体操のお兄さん';
    } else {
        h11.textContent = 'はるはる Conversations - with 体操のお兄さんラジオ';
    }
});

//初期化
window.dispatchEvent(new Event('resize'));
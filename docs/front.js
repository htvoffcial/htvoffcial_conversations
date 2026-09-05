var formEl = document.querySelector('form');
var titleInput = document.getElementById('title-input');
var bodyInput = document.getElementById('body-input');

let saveDraftTimer;
if (formEl && titleInput && bodyInput) {
    // localStorage 書き込みを間引いて入力時のブロッキングを減らす
    formEl.addEventListener('input', () => {
        clearTimeout(saveDraftTimer);
        saveDraftTimer = setTimeout(() => {
            localStorage.setItem('title', titleInput.value);
            localStorage.setItem('body', bodyInput.value);
        }, 150);
    });
}

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
    const audio = document.querySelector('#audio-player');
    const source = 'stream/playlist.m3u8';

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
if (formEl) {
    formEl.addEventListener('submit', () => {
        localStorage.removeItem('title');
        localStorage.removeItem('body');
    });
}


// スクロールでヘッダー隠す
/*window.addEventListener('scroll', () => {
    
    const header = document.getElementById('header');
    header.style.top = window.scrollY > 50 ? '-100px' : '0';
    
});*/
//ガクガクしないように、スクロールする方向を判定する
document.body.style.backgroundColor = '#587bb0';
document.body.style.transition = 'background-color 0.6s';

let lastScrollY = 0;
let scrollTicking = false;
let isFormVisible = false;
const form = document.querySelector('#bg-flg-elm');
const header = document.getElementById('header');

function updateOnScroll() {
    const currentScrollY = window.scrollY;

    if (header) {
        if (currentScrollY > lastScrollY && currentScrollY > 50) {
            header.style.top = '-100px';
        } else {
            header.style.top = '0';
        }
    }

    // お兄さんお便りフォームが見える間だけ背景色を切り替える
    if (form) {
        const formRect = form.getBoundingClientRect();
        const visibleNow = formRect.top < window.innerHeight && formRect.bottom > 0;
        if (visibleNow !== isFormVisible) {
            document.body.style.backgroundColor = visibleNow ? '#f0f0f0' : '#587bb0';
            isFormVisible = visibleNow;
        }
    }

    lastScrollY = currentScrollY;
    scrollTicking = false;
}

window.addEventListener('scroll', () => {
    if (!scrollTicking) {
        requestAnimationFrame(updateOnScroll);
        scrollTicking = true;
    }
}, { passive: true });
// ----------------------------
// 文字 → 時間換算（統一関数）
// ----------------------------
function calcSentenceTime(sentence) {
    let t = 0;
    for (let char of sentence) {
        if (char.match(/[一-龯]/)) t += 0.16;       // 漢字
        else if (char.match(/[ぁ-ん]/)) t += 0.1; // ひらがな
        else if (char.match(/[ァ-ン]/)) t += 0.1; // カタカナ
        else if (char.match(/[a-zA-Z]/)) t += 0.04; // 英字
        else if (char.match(/[\d]/)) t += 0.1;     // 数字
        else if (char.match(/[、。！？()（）]/)) t += 0.4;    // 句読点
        else if (char.match(/[-]/)) t += 0.9;     // ハイフン
        else if (char.match(/[\n]/)) t += 0.3;    // 改行
        else if (char.match(/[「」]/)) t += 0.2; // 鉤括弧
        else t += 0.1;                            // その他
    }
    return t;
}

// ----------------------------
// README 取得 → DISCUSS 部分抽出
// ----------------------------
fetch('readme.md')
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
        const sentenceDurations = sentences.map(calcSentenceTime);
        const sentenceEndTimes = [];
        let cumulativeTime = 0;
        sentenceDurations.forEach(duration => {
            cumulativeTime += duration;
            sentenceEndTimes.push(cumulativeTime);
        });

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
                const startTime = index === 0 ? 0 : sentenceEndTimes[index - 1];
                audio.currentTime = startTime;
            });
        });

        // ----------------------------
        // 再生時間 → 現在の文をハイライト
        // ----------------------------
        let activeSentenceIndex = -1;

        function findSentenceIndex(currentTime) {
            let low = 0;
            let high = sentenceEndTimes.length - 1;
            while (low <= high) {
                const mid = Math.floor((low + high) / 2);
                if (currentTime < sentenceEndTimes[mid]) {
                    high = mid - 1;
                } else {
                    low = mid + 1;
                }
            }
            return low;
        }

        audio.addEventListener('timeupdate', () => {
            const nextIndex = findSentenceIndex(audio.currentTime);
            if (nextIndex === activeSentenceIndex || nextIndex >= contentBox.children.length) {
                return;
            }

            if (activeSentenceIndex >= 0) {
                contentBox.children[activeSentenceIndex].classList.remove('nowct');
            }
            contentBox.children[nextIndex].classList.add('nowct');
            activeSentenceIndex = nextIndex;

            // 現在の文が見えるようにスクロール
            const currentP = contentBox.children[nextIndex];
            const pTop = currentP.offsetTop;
            const pHeight = currentP.offsetHeight;
            const boxTop = contentBox.scrollTop;
            const boxHeight = contentBox.offsetHeight;
            if (pTop < boxTop || pTop + pHeight > boxTop + boxHeight) {
                contentBox.scrollTo({
                    top: pTop - boxHeight / 2 + pHeight / 2,
                    behavior: 'smooth'
                });
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
document.getElementById('text-size').addEventListener('change', function() {
    document.body.style.fontSize = this.value;
    localStorage.setItem('textSize', this.value);
});
//初期化
window.dispatchEvent(new Event('resize'));
// console.error の処理を何もしない空関数に置き換える
console.error = function() {};

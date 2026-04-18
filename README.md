
# htvoffcial_conversations

GitHub Discussions の内容（`htvoffcial/htvoffcial` 側の README 内 `<!-- DISCUSS_COACH_START -->...<!-- DISCUSS_COACH_END -->` 区間）を元に、

- **Azure Cognitive Services Speech**（Text-to-Speech）で **MP3** を生成し
- **ffmpeg** で **HLS（m3u8 + ts セグメント）** に変換して
- **GitHub Pages（`docs/`）** で再生・表示する

…という一連を **GitHub Actions の定期実行**で自動更新するためのリポジトリです。

---

## 構成（ディレクトリ / 主要ファイル）

- `docs/`  
  GitHub Pages 公開物（フロントエンド一式）
  - `docs/index.html`：表示ページ（フォーム、免責、プライバシー選択UI、プレイヤー）
  - `docs/front.js`：表示・再生制御（README抽出表示、クリックでシーク、再生位置ハイライト、HLS再生など）
  - `docs/main.css`：スタイル
  - `docs/readme.md`：Actions が取得して保存した **元README**（抽出対象の本文が入る）
  - `docs/stream/playlist.m3u8` + `docs/stream/data*.ts`：HLS ストリーム
  - `docs/CNAME`：カスタムドメイン設定
  - `docs/_redirects`：リダイレクト設定（ホスティング側仕様用）
- `scripts/ai-azure-tts.py`  
  Azure Speech SDK を使って `TTS_TEXT` を音声合成し、MP3を書き出すスクリプト
- `.github/workflows/auto-audio-exchange.yml`  
  定期実行で「抽出 → TTS → HLS化 → アーカイブ → commit/push」まで行うワークフロー
- `Archives/`  
  月別（`YYYY-MM`）フォルダに日別（`DD.mp3`）で MP3 を保存するアーカイブ
- `latest.mp3`  
  最新の合成音声（リポジトリ直下に配置）

---

## 仕組み（データフロー）

1. GitHub Actions が `htvoffcial/htvoffcial` の `README.md` を取得
2. `<!-- DISCUSS_COACH_START -->`〜`<!-- DISCUSS_COACH_END -->` を正規表現で抽出し、見出し/強調などの装飾を除去して **読み上げテキスト**を作成
3. `scripts/ai-azure-tts.py` が Azure TTS で `latest.mp3` を生成
4. `ffmpeg` が `latest.mp3` を HLS に変換し `docs/stream/` に出力
5. `docs/readme.md` に取得した README をコピーして保存（フロント側の表示元）
6. `Archives/YYYY-MM/DD.mp3` として MP3 を保存
7. 変更を commit/push（`contents: write`）

---

## 使用技術

### バックエンド/自動化
- GitHub Actions（cron + 手動実行 `workflow_dispatch`）
- Python 3
- Azure Cognitive Services Speech SDK（`azure-cognitiveservices-speech`）
- ffmpeg（MP3 → HLS 変換）

### フロントエンド（GitHub Pages / `docs/`）
- HTML/CSS/JavaScript（素の構成）
- HLS 再生：
  - `hls.js`（ブラウザがHLS非対応の場合）
  - ネイティブHLS（Safari等で `application/vnd.apple.mpegurl` 再生可能な場合）
- UI プレイヤー：`Plyr`
- 保存・UX：
  - `localStorage` にフォーム入力下書き・テキストサイズ・プライバシー選択を保存
  - README（`docs/readme.md`）から DISCUSS 部分を抽出し、文をクリックするとその文の開始時間へジャンプ
  - 再生時間に応じて現在文をハイライト

---

## 重要な環境変数 / Secrets（Actions）

GitHub Actions では以下の Secrets が必要です：

- `AZURE_SPEECH_KEY`
- `AZURE_SPEECH_REGION`

（音声は既定で `ja-JP-KeitaNeural` を利用）

---

## 開発メモ

- ローカルで `docs/` を確認する場合、`.vscode/settings.json` では Live Server のポートが `5501` に設定されています。

---

## 免責

`docs/index.html` に記載の通り、このプロジェクトは **NHKの「たいそうのおにいさん」とは関係ありません。**

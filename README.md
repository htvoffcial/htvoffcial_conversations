# htvoffcial_conversations

`htvoffcial/htvoffcial` の GitHub Discussions 相当のテキスト（`README.md` 内の `<!-- DISCUSS_COACH_START -->...<!-- DISCUSS_COACH_END -->` 区間）を元に、

- **Google Cloud Text-to-Speech（GCP TTS）** で音声を生成し（いったん MP3）
- **Opus** に再圧縮して軽量化し
- **ffmpeg** で **HLS（m3u8 + ts セグメント）** に変換して
- **GitHub Pages（`docs/`）** で再生・表示する

…という一連を **GitHub Actions の定期実行**で自動更新するためのリポジトリです。

---

## 構成（ディレクトリ / 主要ファイル）

- `docs/`  
  GitHub Pages 公開物（フロントエンド一式）
  - `docs/index.html`：表示ページ（フォーム、免責、プライバシー選択UI、プレイヤー）
  - `docs/front.js`：表示・再生制御（README 抽出表示、クリックでシーク、再生位置ハイライト、HLS 再生など）
  - `docs/main.css`：スタイル
  - `docs/readme.md`：Actions が取得して保存した **元 README**（抽出対象の本文が入る）
  - `docs/stream/playlist.m3u8` + `docs/stream/data*.ts`：HLS ストリーム
  - `docs/CNAME`：カスタムドメイン設定（運用している場合）
  - `docs/_redirects`：リダイレクト設定（ホスティング側仕様用）

- `scripts/ai-gcp-tts.py`  
  Google Cloud Text-to-Speech を使って `TTS_TEXT` を音声合成し、MP3 を書き出すスクリプト

- `.github/workflows/auto-audio-exchange.yml`  
  定期実行で「抽出 → TTS → Opus 変換 → HLS 化 → アーカイブ → commit/push」まで行うワークフロー

- `Archives/`  
  月別（`YYYY-MM`）フォルダに日別（`DD.opus`）で Opus を保存するアーカイブ

- `latest.opus`  
  最新の合成音声（リポジトリ直下に配置）

---

## 仕組み（データフロー）

1. GitHub Actions が `htvoffcial/htvoffcial` の `README.md` を取得
2. `<!-- DISCUSS_COACH_START -->`〜`<!-- DISCUSS_COACH_END -->` を正規表現で抽出し、見出し/強調などの装飾を除去して **読み上げテキスト** を作成
3. `scripts/ai-gcp-tts.py` が **Google Cloud Text-to-Speech** で `latest.mp3` を生成
4. `ffmpeg` で `latest.mp3` を **Opus（`latest.opus`）** に再圧縮（軽量化）
5. `ffmpeg` が `latest.opus` を HLS に変換し `docs/stream/` に出力
6. `docs/readme.md` に取得した README をコピーして保存（フロント側の表示元）
7. `Archives/YYYY-MM/DD.opus` として Opus を保存
8. 変更を commit/push（`contents: write`）

---

## 使用技術

### バックエンド/自動化

- GitHub Actions（cron + 手動実行 `workflow_dispatch`）
- Python 3
- Google Cloud Text-to-Speech（`google-cloud-texttospeech`）
- ffmpeg（MP3 → Opus 変換 / HLS 変換）

### フロントエンド（GitHub Pagesなどの静的ホスティングCI/CD / `docs/`）

- HTML/CSS/JavaScript（素の構成）
- HLS 再生：
  - `hls.js`（ブラウザが HLS 非対応の場合）
  - ネイティブ HLS（Safari 等で `application/vnd.apple.mpegurl` 再生可能な場合）
- UI プレイヤー：`Plyr`
- 保存・UX：
  - `localStorage` にフォーム入力下書き・テキストサイズ・プライバシー選択を保存
  - README（`docs/readme.md`）から DISCUSS 部分を抽出し、文をクリックするとその文の開始時間へジャンプ
  - 再生時間に応じて現在文をハイライト

---

## 重要な環境変数 / Secrets（Actions）

GitHub Actions では以下の Secrets / env を使用します：

- `GCP_SA_KEY`（**必須**）
  - Google Cloud のサービスアカウント鍵 JSON を **文字列** として Secrets に保存したもの
  - ワークフロー内で一時ファイル化し、`GOOGLE_APPLICATION_CREDENTIALS` に設定して利用します

- `GCP_TTS_VOICE`（任意）
  - 例：`ja-JP-Standard-B`

加えて、スクリプト側で以下の環境変数を参照します：

- `TTS_TEXT`（読み上げ対象テキスト）
- `TTS_OUT`（出力ファイルパス。既定：`latest.mp3`）

---

## 開発メモ

- ローカルで `docs/` を確認する場合、`.vscode/settings.json` では Live Server のポートが `5501` に設定されています。

---

## ライセンス/コンプライアンス（Google Cloud Text-to-Speech）

本リポジトリの音声生成は **Google Cloud Text-to-Speech** を使用しており、
Google の提供する **公式クライアントライブラリ / 公式 API 経由**で実行しています。
利用にあたっては **Google Cloud の利用規約・ライセンスに基づく適切な運用**（サービスアカウント鍵管理、Secrets 利用等）を前提としています。

> 注意: 実際の利用条件や制限は契約プラン/規約に依存するため、運用時は最新の公式ドキュメント/契約内容を確認してください。

---

## Webフロント（docs/）: 読み上げ位置の同期表示（疑似「同期歌詞」）

`docs/` 配下の Web フロントでは、HLS 音声再生にあわせてテキスト表示を「音楽サブスクの同期歌詞」のように同期させます。

機械音声（TTS）は人間の朗読に比べて **発話速度の揺らぎが小さく、文字種や記号に応じた所要時間をある程度予測できる** ことを利用し、
本文を文単位に分割したうえで、独自の時間推定ロジックにより各文の想定再生位置を計算し、再生時刻に応じて現在位置をハイライト/クリックでジャンプ可能にしています。

※同期用の計算ロジック（エンジン）の詳細は本 README では公開しません。

---

## 免責

`docs/index.html` に記載の通り、このプロジェクトは **NHK の「たいそうのおにいさん」とは関係ありません。**

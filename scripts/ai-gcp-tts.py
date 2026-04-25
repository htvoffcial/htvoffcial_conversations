import json
import os
import sys
import tempfile

from google.cloud import texttospeech


def main() -> int:
    text = os.environ.get("TTS_TEXT", "").strip()
    if not text:
        print("TTS_TEXT is empty", file=sys.stderr)
        return 2

    out_path = os.environ.get("TTS_OUT", "latest.mp3")

    # GitHub Secrets に入れたサービスアカウントJSON（文字列）を受け取る
    sa_key = os.environ.get("GCP_SA_KEY", "").strip()
    if not sa_key:
        print("GCP_SA_KEY is required", file=sys.stderr)
        return 2

    # google-cloud-texttospeech は通常ファイルパス認証が楽なので一時ファイル化
    try:
        json.loads(sa_key)  # validate
    except Exception as e:
        print(f"GCP_SA_KEY is not valid JSON: {e}", file=sys.stderr)
        return 2

    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".json") as f:
        f.write(sa_key)
        cred_path = f.name

    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = cred_path

    # Standard 音声（例: ja-JP-Standard-A）
    voice_name = os.environ.get("GCP_TTS_VOICE", "ja-JP-Standard-C")
    # language code は voice_name からそれっぽく推定（ja-JP-Standard-A -> ja-JP）
    language_code = "-".join(voice_name.split("-")[0:2]) if "-" in voice_name else "ja-JP"

    try:
        client = texttospeech.TextToSpeechClient()

        synthesis_input = texttospeech.SynthesisInput(text=text)

        voice = texttospeech.VoiceSelectionParams(
            language_code=language_code,
            name=voice_name,
        )

        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3
        )

        response = client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config,
        )

        with open(out_path, "wb") as out:
            out.write(response.audio_content)

        print(f"OK: wrote {out_path} (voice={voice_name})")
        return 0

    except Exception as e:
        print(f"Failed to synthesize: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

import os
import sys
import azure.cognitiveservices.speech as speechsdk

def main() -> int:
    text = os.environ.get("TTS_TEXT", "").strip()
    if not text:
        print("TTS_TEXT is empty", file=sys.stderr)
        return 2

    key = os.environ.get("AZURE_SPEECH_KEY")
    region = os.environ.get("AZURE_SPEECH_REGION")

    if not key or not region:
        print("AZURE_SPEECH_KEY / AZURE_SPEECH_REGION are required", file=sys.stderr)
        return 2

    voice = os.environ.get("AZURE_VOICE", "ja-JP-KeitaNeural")
    out_path = os.environ.get("TTS_OUT", "latest.mp3")

    speech_config = speechsdk.SpeechConfig(subscription=key, region=region)
    speech_config.speech_synthesis_voice_name = voice
    
    speech_config.set_speech_synthesis_output_format(
        speechsdk.SpeechSynthesisOutputFormat.Audio16Khz128KBitRateMonoMp3
    )
    # MP3 出力（必要ならビットレート等は後で調整可）
    audio_config = speechsdk.audio.AudioOutputConfig(filename=out_path)
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)

    result = synthesizer.speak_text_async(text).get()

    if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
        print(f"OK: wrote {out_path}")
        return 0

    if result.reason == speechsdk.ResultReason.Canceled:
        details = speechsdk.SpeechSynthesisCancellationDetails.from_result(result)
        print(f"Canceled: {details.reason}", file=sys.stderr)
        if details.error_details:
            print(details.error_details, file=sys.stderr)
        return 1

    print(f"Unexpected result reason: {result.reason}", file=sys.stderr)
    return 1

if __name__ == "__main__":
    raise SystemExit(main())

import { useEffect, useRef, useState } from "react";
import {
  Check,
  CircleHelp,
  Download,
  Play,
  Square,
  Video,
} from "lucide-react";

const QUESTIONS = [
  "How would you describe yourself in three words?",
  "How do you handle pressure at work?",
  "What are your long-term career goals?",
  "What would you do if you were not selected for this position?",
  "Would you admit your mistake even if nobody noticed it?",
  "How do you define success?",
  "What would you do if you were assigned a task you had never performed before?",
  "How do you react when things don't go according to plan?",
];

function getRecordingType() {
  if (typeof MediaRecorder === "undefined") return "";

  return [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ].find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function canPlayRecordingAudio(mimeType) {
  const audio = document.createElement("audio");
  const codec = mimeType.includes("mp4")
    ? 'audio/mp4; codecs="mp4a.40.2"'
    : 'audio/webm; codecs="opus"';

  return audio.canPlayType(codec) !== "";
}

function createWavCapture(microphone) {
  const context = new AudioContext();
  const source = context.createMediaStreamSource(
    new MediaStream([microphone])
  );
  const processor = context.createScriptProcessor(4096, 1, 1);
  const silentGain = context.createGain();
  const chunks = [];

  silentGain.gain.value = 0;
  processor.onaudioprocess = (event) => {
    chunks.push(
      new Float32Array(event.inputBuffer.getChannelData(0))
    );
  };
  source.connect(processor);
  processor.connect(silentGain);
  silentGain.connect(context.destination);

  return {
    context,
    source,
    processor,
    silentGain,
    chunks,
    sampleRate: context.sampleRate,
  };
}

function disposeWavCapture(capture) {
  capture.processor.onaudioprocess = null;
  capture.source.disconnect();
  capture.processor.disconnect();
  capture.silentGain.disconnect();

  if (capture.context.state !== "closed") {
    capture.context.close().catch((error) => {
      console.error("Failed to close microphone audio context:", error);
    });
  }
}

function finishWavCapture(capture) {
  const sampleCount = capture.chunks.reduce(
    (total, chunk) => total + chunk.length,
    0
  );
  if (!sampleCount) {
    disposeWavCapture(capture);
    return null;
  }

  const samples = new Float32Array(sampleCount);
  let offset = 0;
  for (const chunk of capture.chunks) {
    samples.set(chunk, offset);
    offset += chunk.length;
  }

  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeText = (position, value) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(position + index, value.charCodeAt(index));
    }
  };

  writeText(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, capture.sampleRate, true);
  view.setUint32(28, capture.sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, dataSize, true);

  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(
      44 + index * 2,
      sample < 0 ? sample * 0x8000 : sample * 0x7fff,
      true
    );
  }

  disposeWavCapture(capture);
  return new Blob([buffer], { type: "audio/wav" });
}

export default function VideoQA() {
  const [selectedQuestion, setSelectedQuestion] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [startingRecording, setStartingRecording] = useState(false);
  const [error, setError] = useState("");
  const [playbackError, setPlaybackError] = useState("");
  const [recordings, setRecordings] = useState({});
  const cameraRef = useRef(null);
  const videoPlaybackRef = useRef(null);
  const audioPlaybackRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const wavCaptureRef = useRef(null);
  const chunksRef = useRef([]);
  const recordingUrlsRef = useRef([]);
  const mountedRef = useRef(true);
  const activeRecording = recordings[selectedQuestion];

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const recorder = recorderRef.current;
      if (recorder?.state === "recording") {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.stop();
      }

      if (wavCaptureRef.current) {
        disposeWavCapture(wavCaptureRef.current);
        wavCaptureRef.current = null;
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
      recordingUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (cameraRef.current && streamRef.current) {
      cameraRef.current.srcObject = streamRef.current;
    }
  }, [cameraReady, activeRecording]);

  useEffect(() => {
    if (
      activeRecording &&
      !activeRecording.audioUrl &&
      !canPlayRecordingAudio(activeRecording.blob.type)
    ) {
      setPlaybackError("This browser cannot play the audio format in this take. Record the answer again to create browser-compatible audio.");
      return;
    }

    setPlaybackError("");
  }, [activeRecording]);

  const enableCamera = async () => {
    setError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera recording is not supported in this browser. Try a current version of Chrome, Edge, or Firefox.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const microphone = stream.getAudioTracks().find(
        (track) => track.readyState === "live" && track.enabled
      );
      if (!microphone) {
        stream.getTracks().forEach((track) => track.stop());
        setError("No active microphone was found. Check your browser microphone permission and try again.");
        return;
      }

      streamRef.current = stream;
      setCameraReady(true);
    } catch (cameraError) {
      console.error("Unable to access camera and microphone:", cameraError);
      setError("Camera and microphone access was blocked. Allow access in your browser settings, then try again.");
    }
  };

  const startRecording = async () => {
    if (startingRecording || recording) return;
    setStartingRecording(true);
    setError("");

    let wavCapture;
    try {
      if (!streamRef.current) {
        setError("Enable your camera and microphone before starting a recording.");
        return;
      }

      const microphone = streamRef.current.getAudioTracks().find(
        (track) => track.readyState === "live" && track.enabled
      );
      if (!microphone) {
        setError("Your microphone is no longer available. Re-enable camera and microphone access before recording.");
        return;
      }

      if (typeof MediaRecorder === "undefined") {
        setError("Video recording is not supported in this browser.");
        return;
      }

      const mimeType = getRecordingType();
      if (!canPlayRecordingAudio(mimeType)) {
        wavCapture = createWavCapture(microphone);
        wavCaptureRef.current = wavCapture;
        if (wavCapture.context.state !== "running") {
          await wavCapture.context.resume();
        }
      }

      if (!mountedRef.current) return;

      const recordingStream = new MediaStream([
        ...streamRef.current.getVideoTracks(),
        microphone,
      ]);
      const recorder = new MediaRecorder(recordingStream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 128_000,
      });
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const audioBlob = wavCaptureRef.current
          ? finishWavCapture(wavCaptureRef.current)
          : null;
        wavCaptureRef.current = null;
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "video/webm",
        });
        const url = URL.createObjectURL(blob);
        const audioUrl = audioBlob ? URL.createObjectURL(audioBlob) : null;
        recordingUrlsRef.current.push(url);
        if (audioUrl) recordingUrlsRef.current.push(audioUrl);
        setRecordings((current) => ({
          ...current,
          [selectedQuestion]: { blob, url, audioUrl },
        }));
        setRecording(false);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch (recordingError) {
      if (wavCaptureRef.current) {
        disposeWavCapture(wavCaptureRef.current);
        wavCaptureRef.current = null;
      } else if (wavCapture) {
        disposeWavCapture(wavCapture);
      }
      console.error("Unable to start video recording:", recordingError);
      if (mountedRef.current) {
        setError("The recording could not be started. Please check your camera and microphone and try again.");
      }
    } finally {
      if (mountedRef.current) setStartingRecording(false);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  };

  const removeRecording = () => {
    if (!activeRecording) return;
    const urls = [activeRecording.url, activeRecording.audioUrl].filter(Boolean);
    urls.forEach((url) => URL.revokeObjectURL(url));
    recordingUrlsRef.current = recordingUrlsRef.current.filter(
      (url) => !urls.includes(url)
    );
    setRecordings((current) => {
      const updated = { ...current };
      delete updated[selectedQuestion];
      return updated;
    });
  };

  const playFallbackAudio = () => {
    const video = videoPlaybackRef.current;
    const audio = audioPlaybackRef.current;
    if (!video || !audio) return;

    audio.currentTime = video.currentTime;
    audio.playbackRate = video.playbackRate;
    audio.play().catch((playError) => {
      console.error("Unable to play the recorded audio:", playError);
      setPlaybackError("The audio could not be played. Use the audio controls below the video to try again.");
    });
  };

  const playFallbackVideo = () => {
    const video = videoPlaybackRef.current;
    const audio = audioPlaybackRef.current;
    if (!video || !audio || !video.paused) return;

    video.currentTime = audio.currentTime;
    video.play().catch((playError) => {
      console.error("Unable to play the recorded video:", playError);
      setPlaybackError("The video could not be played. Use the video controls to try again.");
    });
  };

  const syncFallbackPlayback = (source) => {
    const video = videoPlaybackRef.current;
    const audio = audioPlaybackRef.current;
    if (!video || !audio) return;

    if (source === "video") {
      audio.currentTime = video.currentTime;
      audio.playbackRate = video.playbackRate;
    } else {
      video.currentTime = audio.currentTime;
    }
  };

  return (
    <div className="dashboard-product">
      <header className="product-page-header">
        <div>
          <h1>Video Q&amp;A</h1>
          <p>Practice common interview questions by recording your answers. Review or download each take when you are done.</p>
        </div>
      </header>

      <div className="product-notice">
        <CircleHelp size={16} />
        <span>Your recordings stay in this browser session. Download any take you want to keep before leaving this page.</span>
      </div>

      {error && <div className="product-error" role="alert">{error}</div>}

      <div className="video-qa-layout">
        <section className="product-card video-qa-questions" aria-label="Interview questions">
          <div className="product-card-header">
            <h2>Choose a question</h2>
            <p>{Object.keys(recordings).length} of {QUESTIONS.length} answered</p>
          </div>

          <ol className="video-qa-question-list">
            {QUESTIONS.map((question, index) => (
              <li key={question}>
                <button
                  type="button"
                  className={`video-qa-question ${selectedQuestion === index ? "selected" : ""} ${recordings[index] ? "answered" : ""}`}
                  onClick={() => setSelectedQuestion(index)}
                  disabled={recording}
                  aria-current={selectedQuestion === index ? "step" : undefined}
                >
                  <span className="video-qa-question-number">
                    {recordings[index] ? <Check size={15} /> : String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{question}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>

        <section className="product-card video-qa-recorder">
          <div className="product-card-header">
            <div>
              <h2>Question {String(selectedQuestion + 1).padStart(2, "0")}</h2>
              <p>{QUESTIONS[selectedQuestion]}</p>
            </div>
          </div>

          <div className="video-qa-preview">
            {activeRecording ? (
              <video
                key={activeRecording.url}
                ref={videoPlaybackRef}
                src={activeRecording.url}
                controls
                playsInline
                muted={Boolean(activeRecording.audioUrl)}
                onPlay={playFallbackAudio}
                onPause={() => {
                  if (audioPlaybackRef.current && !audioPlaybackRef.current.paused) {
                    audioPlaybackRef.current.pause();
                  }
                }}
                onEnded={() => audioPlaybackRef.current?.pause()}
                onSeeking={() => syncFallbackPlayback("video")}
                onRateChange={() => syncFallbackPlayback("video")}
                onError={() => setPlaybackError("This recording could not be played. Record this answer again to create a compatible video.")}
              />
            ) : cameraReady ? (
              <video ref={cameraRef} autoPlay muted playsInline />
            ) : (
              <div className="video-qa-camera-placeholder">
                <Video size={30} />
                <strong>Your camera preview will appear here</strong>
                <span>Allow camera and microphone access to get started.</span>
              </div>
            )}
            {recording && <span className="video-qa-recording-indicator">Recording</span>}
          </div>

          {activeRecording?.audioUrl && (
            <div className="video-qa-audio-playback">
              <span>Recorded audio</span>
              <audio
                ref={audioPlaybackRef}
                src={activeRecording.audioUrl}
                controls
                preload="auto"
                aria-label="Recorded answer audio"
                onPlay={playFallbackVideo}
                onPause={() => {
                  if (videoPlaybackRef.current && !videoPlaybackRef.current.paused) {
                    videoPlaybackRef.current.pause();
                  }
                }}
                onEnded={() => videoPlaybackRef.current?.pause()}
                onSeeking={() => syncFallbackPlayback("audio")}
              />
            </div>
          )}

          {playbackError && <p className="product-error" role="alert">{playbackError}</p>}

          <div className="video-qa-actions">
            {activeRecording ? (
              <>
                <a
                  className="product-button primary"
                  href={activeRecording.url}
                  download={`westforce-answer-${selectedQuestion + 1}.${activeRecording.blob.type.includes("mp4") ? "mp4" : "webm"}`}
                >
                  <Download size={15} /> Download answer
                </a>
                <button type="button" className="product-button" onClick={removeRecording}>
                  Record again
                </button>
              </>
            ) : recording ? (
              <button type="button" className="product-button primary" onClick={stopRecording}>
                <Square size={14} /> Stop recording
              </button>
            ) : cameraReady ? (
              <button type="button" className="product-button primary" onClick={startRecording} disabled={startingRecording}>
                <Play size={15} /> {startingRecording ? "Preparing recording..." : "Start recording"}
              </button>
            ) : (
              <button type="button" className="product-button primary" onClick={enableCamera}>
                <Video size={15} /> Enable camera &amp; microphone
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

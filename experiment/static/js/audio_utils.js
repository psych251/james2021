// audio_utils.js
// Generic helpers to record mic audio and upload to your Flask endpoint.

let mediaRecorder = null;
let recordedChunks = [];

// Start microphone recording
async function startRecording() {
  recordedChunks = [];
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };
  mediaRecorder.start();
}

// Stop and return Blob
function stopRecording() {
  return new Promise((resolve) => {
    if (!mediaRecorder) {
      resolve(null);
      return;
    }
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: "audio/webm" });
      resolve(blob);
    };
    mediaRecorder.stop();
  });
}

// Flask endpoint that writes into your Google-Drive-synced folder
const AUDIO_UPLOAD_URL = "http://localhost:5000/upload_audio";

// Upload the blob as a file with the given filename, plus extra metadata
function uploadAudio(blob, filename, extraFields = {}) {
  const fd = new FormData();
  fd.append("audio_data", blob, filename);

  for (const [k, v] of Object.entries(extraFields)) {
    fd.append(k, v);
  }

  return fetch(AUDIO_UPLOAD_URL, {
    method: "POST",
    body: fd
  }).then((r) => r.json());
}

// Date stamp like "Dec12025"
function currentDateStamp() {
  const d = new Date();
  const months = ["Jan","Feb","Mar","Apr","May","Jun",
                  "Jul","Aug","Sep","Oct","Nov","Dec"];
  const month = months[d.getMonth()];
  const day   = d.getDate();
  const year  = d.getFullYear();
  return `${month}${day}${year}`;
}

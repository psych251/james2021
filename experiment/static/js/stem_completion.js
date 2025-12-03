// ----------------------------------------------------------
// stem_completion.js
//
//  - Custom jsPsych plugin: jsPsychSimpleAudioRecord
//    (uses MediaRecorder, no html-audio-response plugin)
//  - Prolific ID, mic check, and stem-completion trials
//  - Uploads mic-check + stem recordings to Google Drive
//    via your Apps Script web app endpoint.
// ----------------------------------------------------------

// ====== CONFIG: Google Apps Script upload endpoint =======
const STEM_UPLOAD_URL =
  "https://script.google.com/macros/s/AKfycbwfXKhQIuFrH-9hCJt7bTthQEQsjQ8FmNtdxvSzDeHoppnhOsojcW5TF2biufuXWuNd/exec";

// Directory for stem cue audio
const STEM_AUDIO_DIR = "stimuli/audio/cues_renormalized/";

// Global Prolific ID (set after the ID trial)
let CURRENT_PROLIFIC_ID = null;

// ----------------------------------------------------------
// 1. Custom plugin: jsPsychSimpleAudioRecord
// ----------------------------------------------------------
var jsPsychSimpleAudioRecord = (function (jsPsych) {
  const plugin = {};

  plugin.info = {
    name: "simple-audio-record",
    parameters: {
      prompt: {
        type: jsPsych.plugins.parameterType.HTML_STRING,
        default: "",
      },
      trial_id: {
        type: jsPsych.plugins.parameterType.STRING,
        default: "",
      },
      item_label: {
        type: jsPsych.plugins.parameterType.STRING,
        default: "",
      },
      task_label: {
        type: jsPsych.plugins.parameterType.STRING,
        default: "",
      },
      prolific_id: {
        type: jsPsych.plugins.parameterType.STRING,
        default: "",
      },
      max_length_ms: {
        type: jsPsych.plugins.parameterType.INT,
        default: 15000,
      },
      upload: {
        type: jsPsych.plugins.parameterType.BOOL,
        default: true,
      },
      upload_url: {
        type: jsPsych.plugins.parameterType.STRING,
        default: STEM_UPLOAD_URL,
      },
    },
  };

  plugin.trial = function (display_element, trial) {
    let mediaRecorder = null;
    let chunks = [];
    let audioBlob = null;
    let audioUrl = null;
    let stream = null;
    let recordingStartedAt = null;

    // --- HTML scaffold ---
    display_element.innerHTML = `
      <div style="max-width:800px;margin:40px auto;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <div style="margin-bottom:24px;font-size:18px;line-height:1.4;">
          ${trial.prompt || ""}
        </div>

        <div style="margin-bottom:16px;">
          <button class="jspsych-btn" id="sar-start">Start recording</button>
          <button class="jspsych-btn" id="sar-stop" disabled>Stop</button>
          <button class="jspsych-btn" id="sar-play" disabled>Play recording</button>
        </div>

        <audio id="sar-audio" style="display:none;margin-top:10px;" controls></audio>

        <div id="sar-status" style="margin-top:12px;font-style:italic;color:#444;">
          Click <strong>Start recording</strong> when you are ready.
        </div>

        <div style="margin-top:32px;">
          <button class="jspsych-btn" id="sar-continue" disabled>Continue</button>
        </div>
      </div>
    `;

    const startBtn = display_element.querySelector("#sar-start");
    const stopBtn = display_element.querySelector("#sar-stop");
    const playBtn = display_element.querySelector("#sar-play");
    const contBtn = display_element.querySelector("#sar-continue");
    const audioEl = display_element.querySelector("#sar-audio");
    const statusEl = display_element.querySelector("#sar-status");

    async function ensureStream() {
      if (stream) return stream;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        statusEl.textContent =
          "Your browser does not support microphone recording. Please try a different browser.";
        startBtn.disabled = true;
        return null;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        return stream;
      } catch (err) {
        console.error("[Recorder] getUserMedia error:", err);
        statusEl.textContent =
          "We could not access your microphone. Please check your browser permissions and refresh the page.";
        startBtn.disabled = true;
        return null;
      }
    }

    function resetRecordingState() {
      chunks = [];
      audioBlob = null;
      audioUrl = null;
      audioEl.src = "";
      audioEl.style.display = "none";
      playBtn.disabled = true;
      contBtn.disabled = true;
    }

    startBtn.addEventListener("click", async () => {
      const s = await ensureStream();
      if (!s) return;

      resetRecordingState();

      try {
        mediaRecorder = new MediaRecorder(s);
      } catch (err) {
        console.error("[Recorder] MediaRecorder failure:", err);
        statusEl.textContent =
          "Recording is not supported in this browser. Please try a different one.";
        startBtn.disabled = true;
        return;
      }

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        if (chunks.length === 0) {
          statusEl.textContent =
            "No audio was captured. Please try recording again.";
          startBtn.disabled = false;
          stopBtn.disabled = true;
          return;
        }
        audioBlob = new Blob(chunks, {
          type: mediaRecorder.mimeType || "audio/webm",
        });
        audioUrl = URL.createObjectURL(audioBlob);
        audioEl.src = audioUrl;
        audioEl.style.display = "block";
        playBtn.disabled = false;
        contBtn.disabled = false;
        statusEl.textContent =
          "Recording finished. You can listen to it and then click Continue.";
        stopBtn.disabled = true;
        startBtn.disabled = false;
      };

      chunks = [];
      mediaRecorder.start();
      recordingStartedAt = performance.now();

      statusEl.textContent = "Recording…";
      startBtn.disabled = true;
      stopBtn.disabled = false;

      if (trial.max_length_ms && trial.max_length_ms > 0) {
        setTimeout(() => {
          if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
          }
        }, trial.max_length_ms);
      }
    });

    stopBtn.addEventListener("click", () => {
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
      }
    });

    playBtn.addEventListener("click", () => {
      if (audioUrl) audioEl.play();
    });

    contBtn.addEventListener("click", async () => {
      let base64 = null;
      if (audioBlob) {
        base64 = await blobToBase64(audioBlob);
      }

      const trial_data = {
        trial_type: "simple-audio-record",
        trial_id: trial.trial_id || "",
        item_label: trial.item_label || "",
        task_label: trial.task_label || "",
        prolific_id: trial.prolific_id || "",
        recording_duration_ms: audioBlob
          ? Math.round(performance.now() - recordingStartedAt)
          : null,
        audio_base64: base64,
      };

      let upload_ok = false;
      if (trial.upload && trial.upload_url && base64) {
        try {
          const payload = {
            prolific_id: trial.prolific_id || "",
            trial_id: trial.trial_id || "",
            item_label: trial.item_label || "",
            task_label: trial.task_label || "",
            audio_base64: base64,
          };

          const resp = await fetch(trial.upload_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          upload_ok = resp.ok;
          if (!resp.ok) {
            console.warn(
              "[Recorder] Upload failed, status:",
              resp.status,
              resp.statusText
            );
          }
        } catch (err) {
          console.error("[Recorder] Upload error:", err);
        }
      }

      trial_data.upload_success = upload_ok;

      jsPsych.finishTrial(trial_data);
    });

    function blobToBase64(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = String(reader.result || "");
          const parts = dataUrl.split(",");
          resolve(parts.length > 1 ? parts[1] : "");
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  };

  return plugin;
})(jsPsych);

// ----------------------------------------------------------
// 2. Prolific ID entry trial
// ----------------------------------------------------------

const prolificIdTrial =
  typeof jsPsychSurveyText !== "undefined"
    ? {
        type: jsPsychSurveyText,
        questions: [
          {
            prompt: "Please enter your <strong>Prolific ID</strong> below:",
            placeholder: "Prolific ID",
            required: true,
          },
        ],
        button_label: "Continue",
        on_finish: (data) => {
          const resp = data.response || {};
          const val =
            typeof resp.Q0 !== "undefined"
              ? String(resp.Q0).trim()
              : String(resp).trim();
          CURRENT_PROLIFIC_ID = val || "";
          console.log("[Prolific] captured ID:", CURRENT_PROLIFIC_ID);
        },
      }
    : {
        // Fallback if plugin-survey-text somehow missing
        type: jsPsychHtmlButtonResponse,
        stimulus: `
          <div style="max-width:700px;margin:60px auto;">
            <p>Please enter your <strong>Prolific ID</strong> below.</p>
            <input id="prolific-id-input" type="text"
                   style="width:100%;padding:8px;font-size:16px;"/>
          </div>
        `,
        choices: ["Continue"],
        on_finish: () => {
          const el = document.querySelector("#prolific-id-input");
          CURRENT_PROLIFIC_ID = el ? String(el.value).trim() : "";
          console.log("[Prolific] captured ID (fallback):", CURRENT_PROLIFIC_ID);
        },
      };

// ----------------------------------------------------------
// 3. Microphone check trials
// ----------------------------------------------------------

const mic_intro = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div style="max-width:800px;margin:60px auto;">
      <h2>Microphone check</h2>
      <p>
        Next, we will check that your microphone is working properly.
        You will be asked to say a short sentence out loud and then
        listen back to your recording.
      </p>
      <p>Please make sure you are in a quiet environment.</p>
    </div>
  `,
  choices: ["Begin mic check"],
};

const mic_check = {
  type: jsPsychSimpleAudioRecord,
  prompt: `
    <p>Please say the following sentence out loud:</p>
    <p style="margin-top:12px;font-style:italic;">
      "The quick brown fox jumps over the lazy dog."
    </p>
    <p style="margin-top:12px;">
      Click <strong>Start recording</strong>, say the sentence,
      then click <strong>Stop</strong>. Listen to your recording
      and click <strong>Continue</strong>.
    </p>
  `,
  trial_id: "mic_check",
  item_label: "mic_check",
  task_label: "mic_check",
  max_length_ms: 15000,
  upload: true,
  upload_url: STEM_UPLOAD_URL,
  prolific_id: "",
  on_start: (trial) => {
    trial.prolific_id = CURRENT_PROLIFIC_ID || "";
  },
};

const mic_verification =
  typeof jsPsychSurveyText !== "undefined"
    ? {
        type: jsPsychSurveyText,
        questions: [
          {
            prompt:
              "Were you able to clearly hear your recording in the microphone check?",
            placeholder: "Yes / No (optional comments)",
            required: false,
          },
        ],
        button_label: "Continue",
      }
    : {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
          <div style="max-width:700px;margin:60px auto;">
            <p>
              Were you able to clearly hear your recording in the microphone check?
            </p>
            <p>(If not, please return the study rather than continuing.)</p>
          </div>
        `,
        choices: ["Continue"],
      };

// ----------------------------------------------------------
// 4. Stem overview / instructions
// ----------------------------------------------------------

const stem_overview = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div style="max-width:800px;margin:60px auto;">
      <h2>Word completion task</h2>
      <p>
        You will hear the beginning of words from the story.
        For each cue, say the <strong>whole word</strong> out loud
        as clearly as you can.
      </p>
    </div>
  `,
  choices: ["Continue"],
};

const stem_instructions = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div style="max-width:800px;margin:60px auto;">
      <p>For each trial:</p>
      <ol>
        <li>Listen carefully to the audio cue.</li>
        <li>When prompted, say the whole word out loud.</li>
        <li>You may listen to your recording before continuing.</li>
      </ol>
      <p>Please speak clearly and try your best, even if you are unsure.</p>
    </div>
  `,
  choices: ["Start the task"],
};

// ----------------------------------------------------------
// 5. Stem completion trials
// ----------------------------------------------------------

const stem_preload_trial = {
  type: jsPsychPreload,
  audio: STEMCOMP_ITEMS.map((item) => STEM_AUDIO_DIR + item.audio_cue),
};

function makeStemCompPhase() {
  const trials = [];

  trials.push(stem_preload_trial);

  STEMCOMP_ITEMS.forEach((item, idx) => {
    const cueAudioPath = STEM_AUDIO_DIR + item.audio_cue;
    const cueLabel = item.item || `item_${idx + 1}`;

    // Cue (play audio, no response)
    trials.push({
      type: jsPsychAudioKeyboardResponse,
      stimulus: cueAudioPath,
      choices: "NO_KEYS",
      trial_ends_after_audio: true,
      prompt: `
        <div style="text-align:center;margin-top:24px;">
          <p>Listen carefully to the beginning of the word.</p>
        </div>
      `,
      data: {
        event: "stem_cue",
        stem_index: idx + 1,
        stem_item: cueLabel,
        audio_file: item.audio_cue,
      },
    });

    // Record response
    trials.push({
      type: jsPsychSimpleAudioRecord,
      prompt: `
        <p>Now say the <strong>whole word</strong> that starts with:</p>
        <p style="margin-top:8px;font-size:22px;font-weight:bold;">
          ${item.written_cue || ""}
        </p>
        <p style="margin-top:12px;">
          Click <strong>Start recording</strong>, say the word,
          then click <strong>Stop</strong>. After listening,
          click <strong>Continue</strong>.
        </p>
      `,
      trial_id: `stem_${idx + 1}`,
      item_label: cueLabel,
      task_label: "stem_completion",
      max_length_ms: 4000,
      upload: true,
      upload_url: STEM_UPLOAD_URL,
      prolific_id: "",
      on_start: (trial) => {
        trial.prolific_id = CURRENT_PROLIFIC_ID || "";
      },
    });
  });

  return trials;
}

// ----------------------------------------------------------
// 6. Finish screen
// ----------------------------------------------------------

const stem_finish = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div style="max-width:800px;margin:60px auto;text-align:center;">
      <h2>All done with the word task!</h2>
      <p>Thank you for your responses.</p>
      <p>Click the button below to continue.</p>
    </div>
  `,
  choices: ["Continue"],
  data: { event: "stem_finish" },
};

// ----------------------------------------------------------
// experiment.js will call addTestPhases(timeline) and expect:
//   prolificIdTrial, mic_intro, mic_check, mic_verification,
//   stem_overview, stem_instructions, makeStemCompPhase, stem_finish
// to exist globally. They are all defined above.
// ----------------------------------------------------------

// ---------------------- CONFIG ----------------------
const DEFAULT_CONDITION = 'A';                      // change to 'B' or 'C' if you want a different default
const urlCond = new URLSearchParams(location.search).get('cond');
const CONDITION = (urlCond || DEFAULT_CONDITION).toUpperCase(); // 'A' | 'B' | 'C'

// Paths are relative to index.html inside /experiment
const CSV_PATH = `stimuli/storyTask${CONDITION}_picOnly_spreadsheet.csv`;
const IMG_DIR  = `stimuli/images/Picture scenes 2/`;
const AUD_DIR  = `stimuli/audio/story_audio/`;

// Column names from the CSV
const COL_DISPLAY = 'display';
const COL_PIC     = 'picture';
const COL_AUDIO   = 'audio';

// ---------------------- INIT ------------------------
const exp_started_at_ms = performance.now();
let isRunning = false;     // gate for global event logging

const jsPsych = initJsPsych({
  on_finish: () => {
    // stop logging while timeline is no longer active
    isRunning = false;
    detachMonitors();

    // show data table
    jsPsych.data.displayData();
  }
});

// --- global monitors (attached only while running) ---
const handlers = {
  keydown(e) {
    safeWrite({ event: 'keydown', key: e.key, code: e.code, ts: performance.now() });
  },
  click(e) {
    safeWrite({
      event: 'click',
      x: e.clientX, y: e.clientY,
      target: (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : 'unknown',
      ts: performance.now()
    });
  },
  blur() {
    safeWrite({ event: 'window_blur', ts: performance.now() });
  },
  focus() {
    safeWrite({ event: 'window_focus', ts: performance.now() });
  },
  visibility() {
    safeWrite({ event: 'visibility_change', state: document.visibilityState, ts: performance.now() });
  }
};

function attachMonitors() {
  window.addEventListener('keydown', handlers.keydown);
  window.addEventListener('click',   handlers.click);
  window.addEventListener('blur',    handlers.blur);
  window.addEventListener('focus',   handlers.focus);
  document.addEventListener('visibilitychange', handlers.visibility);
}

function detachMonitors() {
  window.removeEventListener('keydown', handlers.keydown);
  window.removeEventListener('click',   handlers.click);
  window.removeEventListener('blur',    handlers.blur);
  window.removeEventListener('focus',   handlers.focus);
  document.removeEventListener('visibilitychange', handlers.visibility);
}

// Safe writer: no-op after the experiment ends (prevents TypeError)
function safeWrite(obj) {
  if (!isRunning) return;
  try { jsPsych.data.write(obj); } catch (_) { /* ignore */ }
}

const trim = (s) => (typeof s === 'string' ? s.trim() : s);

// ---------------------- BUILD & RUN ------------------
const timeline = [];

// Intro screen
timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div style="max-width:800px;margin:60px auto;text-align:center">
      <h1>Story Task — Condition ${CONDITION}</h1>
      <p>This will present each image with its audio, in the order listed in the CSV.</p>
      <p>The page will automatically advance when each audio clip finishes.</p>
    </div>
  `,
  choices: ['Start'],
  data: { event: 'intro', condition: CONDITION }
});

// Load CSV and construct trials in the listed order
d3.csv(CSV_PATH).then((rows) => {
  if (!rows || rows.length === 0) throw new Error(`CSV empty or not found: ${CSV_PATH}`);

  // Only keep storyScreens rows
  const storyRows = rows.filter(r => trim(r[COL_DISPLAY]) === 'storyScreens');
  if (storyRows.length === 0) {
    throw new Error(`No rows with display == "storyScreens" in ${CSV_PATH}`);
  }

  // Preload lists
  const preloadImages = [];
  const preloadAudio  = [];
  const trials = [];

  storyRows.forEach((r, i) => {
    const pic   = trim(r[COL_PIC]);
    const audio = trim(r[COL_AUDIO]);
    if (!pic || !audio) return; // skip incomplete rows

    const imgPath = IMG_DIR + pic;     // e.g., "stimuli/images/Picture scenes 2/Scene1.JPG"
    const audPath = AUD_DIR + audio;   // e.g., "stimuli/audio/story_audio/CA_P1.mp3"

    preloadImages.push(imgPath);
    preloadAudio.push(audPath);

    trials.push({
      type: jsPsychAudioKeyboardResponse,
      stimulus: audPath,
      choices: "NO_KEYS",
      trial_ends_after_audio: true, // auto-proceed when audio ends
      prompt: `
        <div style="text-align:center; padding:24px;">
          <img src="${imgPath}" alt="${pic}" style="max-width:80vmin;height:auto;display:block;margin:0 auto;" />
        </div>
      `,
      on_start: () => {
        // per-trial console log
        console.log(
          `[${new Date().toISOString()}] TRIAL ${i + 1} — image: ${pic} | audio: ${audio}`
        );
      },
      data: {
        event: 'story_trial',
        condition: CONDITION,
        csv_index: i + 1,
        csv_picture: pic,
        csv_audio: audio
      }
    });
  });

  // Preload all media
  timeline.push({
    type: jsPsychPreload,
    images: preloadImages,
    audio: preloadAudio,
    message: `<div style="text-align:center;padding:24px">Loading media…</div>`,
    data: { event: 'preload', condition: CONDITION }
  });

  // Push trials (in order; no randomization)
  timeline.push(...trials);

  // Outro — write the summary row right before showing the final button
  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div style="text-align:center; padding:40px;">
        <h2>All done ✅</h2>
        <p>Click <b>Show data</b> to preview the recorded log.</p>
      </div>
    `,
    choices: ['Show data'],
    data: { event: 'outro', condition: CONDITION },
    on_start: () => {
      const ended = performance.now();
      const duration = ended - exp_started_at_ms;

      // console: duration at end
      console.log(
        `[${new Date().toISOString()}] END — duration_ms: ${Math.round(duration)}`
      );

      // append a summary row while a trial is active (safe to write here)
      jsPsych.data.write({
        event: 'experiment_summary',
        condition: CONDITION,
        started_at_ms: exp_started_at_ms,
        ended_at_ms: ended,
        duration_ms: duration,
        total_trials: jsPsych.data.get().count()
      });
    }
  });

  // ---- START LOGGING + RUN ----
  console.log(`[${new Date().toISOString()}] START — condition: ${CONDITION}`);
  attachMonitors();
  isRunning = true;

  jsPsych.run(timeline);

}).catch((err) => {
  console.error(err);
  document.body.innerHTML = `
    <div style="max-width:800px;margin:80px auto;color:#b00020">
      <h2>The experiment failed to load.</h2>
      <p>${String(err)}</p>
      <p>Checked path: <code>${CSV_PATH}</code></p>
    </div>
  `;
});
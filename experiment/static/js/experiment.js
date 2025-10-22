/* jsPsychModule, jsPsychPlugins */

// -------------------------------
// Utilities
// -------------------------------

function getURLParams() {
  return Object.fromEntries(new URLSearchParams(window.location.search).entries());
}

// Simple hash → stable condition assignment (quasi-balancing without a server)
function hash3(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  const x = Math.abs(h) % 3;
  return ['A','B','C'][x];
}

// Load a CSV (returns Promise of array of rows as objects)
function loadCSV(url) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      header: true,
      dynamicTyping: true,
      download: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: reject
    });
  });
}

// Build audio file list from story rows
function audioList(rows) {
  const list = [];
  rows.forEach(r => { if (r.audio) list.push(`stimuli/audio/story_audio${r.audio}`); });
  return list;
}

// -------------------------------
// Init jsPsych
// -------------------------------
const jsPsych = new jsPsychModule.JsPsych({
  display_element: "jspsych-target",
  on_finish: async () => {
    // Offer local CSV save (works on GitHub Pages)
    jsPsych.data.get().localSave('csv', `storybook_${participant_id}.csv`);
    // Show a friendly end screen
    document.body.innerHTML = `
      <div class="center">
        <h2>Thank you!</h2>
        <p>Your data file has been downloaded.</p>
        ${prolific_completion_code ? `<p>Prolific completion code: <strong>${prolific_completion_code}</strong></p>` : ``}
      </div>`;
  }
});

const {
  preload,
  htmlButtonResponse,
  audioButtonResponse,
  audioKeyboardResponse,
  surveyHtmlForm
} = jsPsychPlugins;

// -------------------------------
// Participant / condition assignment
// -------------------------------
const params = getURLParams();
const prolific_pid = params.PROLIFIC_PID || params.prolific_pid || '';
const study_id = params.STUDY_ID || '';
const session_id = params.SESSION_ID || '';
const prolific_completion_code = params.completion || ''; // pass via url if you like

// Use stable quasi-balanced assignment if we have an ID; otherwise random
const participant_id = prolific_pid || cryptoRandomID();
const assigned_version = prolific_pid ? hash3(prolific_pid) : jsPsych.randomization.sampleWithoutReplacement(['A','B','C'], 1)[0];

function cryptoRandomID() {
  // short random string for non-Prolific pilots
  return Math.random().toString(36).slice(2, 10);
}

// Add global properties
jsPsych.data.addProperties({
  participant_id,
  prolific_pid,
  study_id,
  session_id,
  assigned_version
});

// -------------------------------
// Consent HTML (edit as needed)
// -------------------------------
const CONSENT_HTML = `
  <div class="consent-box">
    <h2>Consent to Participate</h2>
    <p>You are invited to take part in a research study on language learning.
    Your participation is voluntary and you may stop at any time.
    No identifying information will be collected. Audio will be played.</p>
    <p>By clicking "I agree", you consent to participate.</p>
  </div>
`;

// -------------------------------
// Timeline
// -------------------------------
const timeline = [];

// Welcome
timeline.push({
  type: htmlButtonResponse,
  stimulus: `<h1>Welcome!</h1><p>In this study you will listen to a short illustrated story (audio only) and answer a few questions.</p>`,
  choices: ['Continue']
});

// Sound check
timeline.push({
  type: audioButtonResponse,
  stimulus: 'stimuli/audio/check_tone.wav', // put a short WAV/MP3 here
  prompt: `<p>Please make sure your volume is comfortable.<br/>Could you hear the sound clearly?</p>`,
  choices: ['Yes, I heard it', 'No, I could not hear'],
  data: {phase: 'soundcheck'},
  on_finish: d => d.sound_pass = (d.response === 0)
});

// Branch: reject if sound failed
timeline.push({
  timeline: [{
    type: htmlButtonResponse,
    stimulus: `<h2>Audio Issue</h2><p>It looks like the sound wasn't audible. Please adjust your device audio and try again.</p>`,
    choices: ['End study'],
    data: {excluded: 'audio-fail'}
  }],
  conditional_function: () => jsPsych.data.get().last(1).values()[0].sound_pass !== true
});

// Stop timeline if excluded from audio
timeline.push({
  conditional_function: () => jsPsych.data.get().last(2).values()[0]?.data?.excluded === 'audio-fail',
  timeline: [{ type: htmlButtonResponse, stimulus: '', choices: ['Close'] }]
});

// Consent
timeline.push({
  type: surveyHtmlForm,
  preamble: CONSENT_HTML,
  html: `
    <label><input type="radio" name="consent" value="agree" required> I agree to participate</label><br/>
    <label><input type="radio" name="consent" value="decline"> I do not agree</label>
  `,
  button_label: 'Continue',
  data: {phase: 'consent'},
  on_finish: d => d.consent_ok = (d.response.consent === 'agree')
});

// Branch: reject if no consent
timeline.push({
  timeline: [{
    type: htmlButtonResponse,
    stimulus: `<h2>Consent Not Given</h2><p>You must consent to participate. Thank you for your time.</p>`,
    choices: ['End study'],
    data: {excluded: 'no-consent'}
  }],
  conditional_function: () => jsPsych.data.get().last(1).values()[0].consent_ok !== true
});

// Demographics + eligibility
timeline.push({
  type: surveyHtmlForm,
  preamble: `<h2>About You</h2>`,
  html: `
    <p><label>Age: <input type="number" min="18" max="99" name="age" required></label></p>
    <p>
      <label>Do you have normal hearing?<br/>
        <select name="hearing" required>
          <option value="">-- choose --</option>
          <option>Yes</option>
          <option>No</option>
        </select>
      </label>
    </p>
    <p>
      <label>Are you fluent in English?<br/>
        <select name="english" required>
          <option value="">-- choose --</option>
          <option>Yes</option>
          <option>No</option>
        </select>
      </label>
    </p>
  `,
  button_label: 'Continue',
  data: {phase: 'demographics'},
  on_finish: d => {
    const r = d.response;
    d.eligible = (+r.age >= 18) && (r.hearing === 'Yes') && (r.english === 'Yes');
    jsPsych.data.addProperties({
      age: +r.age, hearing: r.hearing, english: r.english, eligible: d.eligible
    });
  }
});

// Branch: reject if ineligible
timeline.push({
  timeline: [{
    type: htmlButtonResponse,
    stimulus: `<h2>Not Eligible</h2><p>Thanks for your interest. Based on your answers you’re not eligible for this study.</p>`,
    choices: ['End study'],
    data: {excluded: 'ineligible'}
  }],
  conditional_function: () => jsPsych.data.get().last(1).values()[0].eligible !== true
});

// Randomiser announcement (A / B / C)
timeline.push({
  type: htmlButtonResponse,
  stimulus: () => `<h2>Story Assignment</h2><p>You have been assigned to <strong>Story ${assigned_version}</strong>.</p>`,
  choices: ['Begin']
});

// -------------------------------
// Story exposure (passive listening)
// -------------------------------

// We’ll load the correct story CSV and build the block at runtime
async function makeStoryBlock(version) {
  const rows = await loadCSV(`stimuli/story_${version}.csv`);
  // optional image column is ignored in this “no orthography” build
  const tv = rows.map(r => ({
    audio: `stimuli/audio/story_audio${r.audio}`,
    caption: r.caption || '' // optional debug/prompt text
  }));

  return {
    timeline: [{
      type: audioKeyboardResponse,
      stimulus: jsPsych.timelineVariable('audio'),
      choices: "NO_KEYS",
      trial_ends_after_audio: true,
      prompt: () => '',  // keep screen clean (no text)
      data: () => ({phase: 'exposure', story_version: version})
    }],
    timeline_variables: tv
  };
}

// -------------------------------
// Attention check (simple confirmation)
// -------------------------------
const attentionCheck = {
  type: htmlButtonResponse,
  stimulus: `<p>Attention check: to confirm you followed instructions, please press <strong>"Yes"</strong>.</p>`,
  choices: ['Yes', 'No'],
  data: {phase: 'attention'},
  on_finish: d => d.attention_pass = (d.response === 0)
};

// Attention failure → reject
const attentionReject = {
  timeline: [{
    type: htmlButtonResponse,
    stimulus: `<h2>End of Study</h2><p>Thanks for your time. Unfortunately you did not meet the attention check requirement.</p>`,
    choices: ['Finish'],
    data: {excluded: 'attention-fail'}
  }],
  conditional_function: () => jsPsych.data.get().last(1).values()[0].attention_pass !== true
};

// -------------------------------
// Preload everything (faster starts)
// -------------------------------

(async function boot() {
  // Load story rows to know what to preload
  const rows = await loadCSV(`stimuli/story_${assigned_version}.csv`);
  const toPreload = audioList(rows).concat(['stimuli/audio/check_tone.wav']);

  timeline.unshift({
    type: preload,
    audio: toPreload,
    message: 'Loading audio…'
  });

  // Story block
  const storyBlock = await makeStoryBlock(assigned_version);
  timeline.push(storyBlock);

  // Attention
  timeline.push(attentionCheck, attentionReject);

  // End screen if passed
  timeline.push({
    timeline: [{
      type: htmlButtonResponse,
      stimulus: `<h2>All done!</h2><p>Thank you for participating.</p>`,
      choices: ['Download data & finish'],
      data: {phase: 'debrief'}
    }],
    conditional_function: () => jsPsych.data.get().last(2).values()[0]?.data?.excluded !== 'attention-fail'
  });

  jsPsych.run(timeline);
})();

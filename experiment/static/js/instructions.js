// static/js/instructions.js
// Creates an intro timeline. You can extend/replace these screens as needed.
window.makeIntroTimeline = function(jsPsych, storyLetter) {
  const welcome = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div style="max-width:750px;margin:2rem auto;line-height:1.5">
        <h2>Welcome!</h2>
        <p>You’ll see a picture while a sound plays. The page advances automatically when the sound ends.</p>
        <p><b>Condition:</b> ${storyLetter}</p>
      </div>`,
    choices: ['Begin'],
    on_finish: () => {
      jsPsych.data.write({event:'begin', timestamp:new Date().toISOString()});
      if (typeof window.startGlobalEventLogging === 'function') window.startGlobalEventLogging();
    }
  };

  // Example “sound check” or consent screens can be added here later if needed.

  return [welcome];
};

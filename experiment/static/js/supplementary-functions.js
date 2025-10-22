function randomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

async function loadSession(condition, counter) {
  // loads counterbalanced resource and starts experiment script
  // requires jquery
  console.log("values in loadSession Function", condition, counter);
  await $.getScript("/static/js/pregenerated_sessions/" + condition + "/" + counter + ".js");
}

function non_mutating_sort(array) {
	return array.concat().sort()
}

function addInstructionHTMLTags(instructions) {
    let next = '<p class="inst">Press space to continue.</p>';
    return instructions.map(x => `<p class="inst-justified">${x}</p>${next}`)
}

function addStimHTMLTags(list) {
  if (!Array.isArray(list)) {
    console.error("Error: list is not an array or is undefined", list);
    return []; // Return an empty array to prevent errors
}
    return list.map(x => ({stimulus: `<p class="stim">${x.toUpperCase()}</p>`}));
}

function addRecallHTMLTags(list) {
    return list.map(x => `<p class="stim">${x.toUpperCase()}</p>`);
}

function* listParametersGenerator(list, conditions) {
  console.log("list before passing to addStimHTMLTags:", list);
  if (list === undefined) {
      console.error("Error: list is undefined inside listParametersGenerator");
  }

  // Takes an array of words and an object describing list conditions.
  // for this task, the list is shuffled based on the "pos" condition

  var stimuli = addStimHTMLTags(list)
  let positions = [...Array(list.length).keys()];

  if(conditions.pos == "spatial") {
    // sort stimuli alphabetically and randomize positions
    let sorted_list = non_mutating_sort(list)
    stimuli = addStimHTMLTags(non_mutating_sort(list))

    for(let i=0; i < positions.length; i++) {
        positions[i] = list.indexOf(sorted_list[i]) + 1
    }
  }
  else if(conditions.pos == "sequential") {
    // use default sort, sequential positions
    for(let i=0; i < positions.length; i++) {
        positions[i] += 1
    }
  }
  else if(conditions.pos == "temporal") {
    // sort words alphabetically in space and show random positions
    let sorted_list = non_mutating_sort(list)

    for(let i=0; i < positions.length; i++) {
        positions[i] = sorted_list.indexOf(list[i]) + 1
    }
  }

  for(var i=0; i < list.length; i++) {
    if(conditions.pos == "static") {
      stimuli[i].row = 2;
      stimuli[i].grid_rows = 3;
    }
    else {
        stimuli[i].row = positions[i]
	// to make the grid rows dependent on the json files
	// use condition.max_list instead
        stimuli[i].grid_rows = positions.length;
    }
  }
  yield* stimuli;
}

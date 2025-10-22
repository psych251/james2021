/*
    0 temporal, read aloud, fixed words
    1 spatial, read aloud, fixed words
    2 temporal, read silently, fixed words
    3 spatial, read silently, fixed words
    4 temporal, read aloud, varied words
    5 spatial, read aloud, varied words
    6 temporal, read silently, varied words
    7 spatial, read silently, varied words
*/

var condition = randomInt(0,4); //calling this to try to generate varying condition values
var counterbalance = randomInt(0,100); //calling this to try to generate varying counterbalance values
//var condition = 0;
//var counter = 0;
console.log(condition, counterbalance);

let temporal = condition % 2 < 1;
let read_aloud = condition % 4 < 2;
let hold_keys = false;
let keys = ["a", "l"];

let continue_prompt = hold_keys ? `<p class="inst">Hold down the \"${keys[0].toUpperCase()}\" and \"${keys[1].toUpperCase()}\" keys to start the next list`
        + " and continue holding them through the list presentation period.</p>" :

        `<p class="inst">Press the \"${keys[0].toUpperCase()}\" and \"${keys[1].toUpperCase()}\" keys to start the next list</p>`;


let reading_instruction = read_aloud ? "Read each word aloud as it appears on the screen." :
        "Read each word silently as it appears on the screen."


let temporal_pages = [`Welcome to the experiment!<br>During this experiment, you will see lists of words, which you should try to remember.  Following a 10-second countdown period, each list of words will be presented visually on the screen, one word at a time for about 2 seconds each, with each word in a different location on the screen in a vertical column.`,

`The spatial arrangement of the words will always be alphabetical, with the word at the top of the column always first in alphabetical order and the word at the bottom of the column always last in alphabetical order, but the temporal sequence in which the words occur will vary across trials, and your primary goal is to learn and reconstruct the temporal sequence (the sequence in which the words appear in time). <br><br>  To understand temporal order, consider a list of three letters A, B, C and three locations arrayed horizontally - - -, with the to-be-remembered order BCA. The sequence shown on the screen might be - B -, - - C, A - -, <b>so the temporal order would be BCA</b> because the letter B appeared first, then the letter C, and then the letter A appeared last.`,

`There will always be 12 words in each list. ${reading_instruction} The words that appear will vary across each list. <br><br>Try to remember the temporal order (the sequence in which the words appear in time) in which the words were displayed on each list.`,

`After each list of words ends, you will see on the left side of the screen, a vertically arranged alphabetical ordering of the words from the list you just saw, and you will see on the right side of the screen a vertically arranged set of empty boxes, one box for each position in the list.  Your task is to reconstruct the temporal order (the sequence in which the words appear in time) of the words in the list you just saw by using your mouse to drag each word on the left to a different box on the right depending on its temporal position in the list.`,

    `You should place the first word that you just saw into the top box, the second word that appeared in the list into the second box, and so on, with the last word that appeared in the list into the bottom box.  Thus, the words in the boxes should end up being in the same temporal order as they appeared in the list you just saw.`,

    `You can fill in the boxes in any order you want, not necessarily from top to bottom.  Also, you can reorder the words by moving a word from one box to another box or by temporarily moving a word that you put in one of the boxes on the right back to its location in the alphabetical ordering on the left and later moving it to a new box on the right.`,

    
    `After you have filled in all of the boxes on the right and are satisfied with the order of the words in the boxes, you should press the SUBMIT button on the bottom of the screen to submit your ordering and proceed to a new list of words.`,

    `Please try hard throughout the reconstruction period, making your best effort to reconstruct the temporal order (the sequence in which the words appear in time) of the words in the list.  As this is a memory experiment, we ask that you help us preserve the integrity of our research by relying only on your memory to perform this task.  The correctness of your responses will not change your payment for this task.`,

`You will now have a chance to familiarize yourself with the task by completing three practice trials.`,

`Remember that there are three steps in each trial. <br><br> 1. You will be presented with a list of words, one at a time. <br> <br> 2. You will see the words from the list arranged vertically in alphabetical order on the left side of the screen, and you should reconstruct the temporal list order (the sequence in which the words appear in time) by dragging each word with your mouse to one of the boxes on the right side of the screen depending on when it occurred in the list, with reordering allowed until you are satisfied with the order of the words in the boxes. <br> <br> 3. Finally, you should press the SUBMIT button when you are ready to proceed to a new list of words.`]

let spatial_pages = [`Welcome to the experiment!<br>During this experiment, you will see lists of words, which you should try to remember.  Following a 10-second countdown period, each list of words will be presented visually on the screen, one word at a time for about 2 seconds each, with each word in a different location on the screen in a vertical column.`,

    `The temporal sequence of the words will always be alphabetical, with the first word shown always first in alphabetical order and the last word shown always last in alphabetical order, but the spatial arrangement (locations) in which the words occur will vary across trials, and your primary goal is to learn and reconstruct the spatial arrangement.  <br><br>  To understand the spatial arrangement, consider a list of three letters A, B, C and three locations arrayed horizontally - - -, with the to-be-remembered order BCA. The sequence shown on the screen <br> might be  - - A, B - -, - C -, <b>so the spatial order would be BCA</b> because the letter B appeared in the first spatial location, the letter C appeared in the middle location, and then the letter A appeared last location.`,

    `There will always be 12 words in each list. ${reading_instruction} The words that appear will vary across each list. <br><br>Try to remember the spatial order (locations) in which the words were displayed on each list.`,

`After each list of words ends, you will see on the left side of the screen, a vertically arranged alphabetical ordering of the words from the list you just saw, and you will see on the right side of the screen a vertically arranged set of empty boxes, one box for each position in the list.  Your task is to reconstruct the spatial order (locations) of the words in the list you just saw by using your mouse to drag each word on the left to a different box on the right depending on its spatial position in the list.`,

    `The spatially first word (the word that appeared in the top box) should be placed into the top box, the spatially second word (the word that appeared in the second box) should be placed into the second box, and so on, with the spatially last word of the list into the bottom box.  Thus, the words in the boxes should end up being in the same spatial order (locations) as they appeared in the list you just saw.`,

    `You can fill in the boxes in any order you want, not necessarily from top to bottom.  Also, you can reorder the words by moving a word from one box to another box or by temporarily moving a word that you put in one of the boxes on the right back to its location in the alphabetical ordering on the left and later moving it to a new box on the right.`,

    `After you have filled in all of the boxes on the right and are satisfied with the order of the words in the boxes, you should press the SUBMIT button on the bottom of the screen to submit your ordering and proceed to a new list of words.`,

`Please try hard throughout the reconstruction period, making your best effort to reconstruct the spatial order (locations) of the words in the list.  As this is a memory experiment, we ask that you help us preserve the integrity of our research by relying only on your memory to perform this task.  The correctness of your responses will not change your payment for this task.`,

`You will now have a chance to familiarize yourself with the task by completing three practice trials.`,  
              
 `Remember that there are three steps in each trial. <br><br> 1. You will be presented with a list of words, one at a time. <br><br> 2. You will see the words from the list arranged vertically in alphabetical order on the left side of the screen, and you should reconstruct the spatial list order (locations) by dragging each word with your mouse to one of the boxes on the right side of the screen depending on where it occurred in the list, with reordering allowed until you are satisfied with the order of the words in the boxes. <br><br>  3. Finally, you should press the SUBMIT button when you are ready to proceed to a new list of words.`]

var instruction_pages = addInstructionHTMLTags(temporal ? temporal_pages : spatial_pages);
console.log(temporal);

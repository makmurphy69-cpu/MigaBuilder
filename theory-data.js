/* Theory Forge content: the lesson path, public-domain songs and chord studies,
 * famous progressions and interval reference songs.
 * In lesson bodies:
 *   <button class="try" data-play="C4 E4 G4" data-how="seq|chord|arp|both">  plays notes and lights them on the instrument
 *   <div class="staff" data-notes="C4:1 D4:1" data-key="C">                   draws notes on a staff
 *   <button class="go" data-go="scale:C:major | chord:C:maj | prog:pop | song:twinkle | ear:intervals | inst:guitar">  opens another part
 * All songs are traditional or by composers who died more than 100 years ago. */
(function (root) {
  'use strict';
  const LEVELS = [
    { n: 1, title: 'Notes, rhythm and your instrument', icon: '🌱' },
    { n: 2, title: 'Scales and keys', icon: '🪜' },
    { n: 3, title: 'Chords and harmony', icon: '🎹' },
    { n: 4, title: 'Use it for real', icon: '🎤' }
  ];

  const LESSONS = [
    /* ---------------- level 1 ---------------- */
    {
      id: 'alphabet', level: 1, title: 'The musical alphabet', mins: 4,
      body: `<p>Music uses just <b>seven letter names</b>: <b>A B C D E F G</b>. After G you start again at A — but higher. That repeat is called an <b>octave</b>: two notes an octave apart sound like the same note, one high and one low.</p>
<p><button class="try" data-play="C4 D4 E4 F4 G4 A4 B4 C5">▶ C D E F G A B C</button> Listen: the last C sounds like “home” again, just higher.</p>
<p><button class="try" data-play="C3 C4 C5" data-how="seq">▶ Three Cs, three octaves</button> <button class="try" data-play="C4 C5" data-how="chord">▶ C and C together</button> — they blend almost into one sound.</p>
<p>Every note has a <b>pitch</b>: how high or low it is. Pitch is how fast the air vibrates. The A above middle C vibrates 440 times a second (440 Hz); the next A up vibrates 880 times — exactly double. That is why octaves blend so well.</p>
<p>Notes are named with a number for the octave: <b>C4</b> is “middle C” in the middle of the piano, C5 is the next C up.</p>
<p class="tip">Try it: press the white keys on the piano below from C to C and say each letter out loud.</p>`,
      real: `When a singer says “that’s too high for me, take it down an octave”, they sing the same notes one octave lower. A man and a woman singing “the same note” are usually an octave apart.`,
      quiz: [
        { q: 'What letter comes after G?', a: ['H', 'A', 'C', 'F'], c: 1, why: 'Music uses only A to G, then starts again at A.' },
        { q: 'How many different letter names are there?', a: ['5', '7', '8', '12'], c: 1, why: 'A B C D E F G — seven letters.' },
        { q: 'Listen. Are these two notes an octave apart?', play: 'A3 A4', a: ['Yes', 'No'], c: 0, why: 'A3 and A4: same letter, one octave apart. 220 Hz and 440 Hz.' },
        { q: 'A note vibrates 220 times a second. What does the note an octave higher do?', a: ['230 times', '330 times', '440 times', '880 times'], c: 2, why: 'Going up an octave doubles the vibration speed.' }
      ]
    },
    {
      id: 'halfsteps', level: 1, title: 'Half steps, whole steps, sharps and flats', mins: 5,
      body: `<p>Between the letters there are extra notes — the <b>black keys</b> on a piano. All together there are <b>12 different notes</b> in an octave.</p>
<p>The smallest step is a <b>half step</b> (also called a semitone): from one key to the very next key, black or white. Two half steps make a <b>whole step</b> (a tone).</p>
<p><button class="try" data-play="C4 C#4">▶ Half step: C to C♯</button> <button class="try" data-play="C4 D4">▶ Whole step: C to D</button></p>
<ul><li><b>♯ sharp</b> = one half step <b>higher</b>. C♯ is just above C.</li><li><b>♭ flat</b> = one half step <b>lower</b>. D♭ is just below D.</li><li>So C♯ and D♭ are the <b>same key</b> with two names (they are “enharmonic”).</li></ul>
<p>Two pairs of white keys have <b>no black key between them: E–F and B–C</b>. They are already a half step apart.</p>
<p><button class="try" data-play="E4 F4">▶ E to F: a half step</button> <button class="try" data-play="B4 C5">▶ B to C: a half step</button></p>
<p><button class="try" data-play="C4 C#4 D4 D#4 E4 F4 F#4 G4 G#4 A4 A#4 B4 C5" data-tempo="200">▶ All 12 notes (the chromatic scale)</button></p>
<p class="tip">On a guitar, ukulele, bass or mandolin, <b>each fret is one half step</b>. Two frets = one whole step.</p>`,
      real: `Guitarists say “move it up two frets” — that is a whole step. Singers asking for a song “a half step down” want every note one key lower.`,
      quiz: [
        { q: 'How many half steps are in a whole step?', a: ['1', '2', '3', '4'], c: 1 },
        { q: 'Which pair of white keys has no black key between them?', a: ['C–D', 'E–F', 'G–A', 'A–B'], c: 1, why: 'E–F and B–C are already a half step apart.' },
        { q: 'What is another name for G♯?', a: ['A♭', 'G♭', 'A♯', 'F♯'], c: 0, why: 'G♯ is a half step above G, which is the same as a half step below A.' },
        { q: 'On a guitar, how many frets is a whole step?', a: ['1', '2', '3', '12'], c: 1 }
      ]
    },
    {
      id: 'rhythm', level: 1, title: 'Beat, rhythm and time signatures', mins: 6,
      body: `<p>The <b>beat</b> is the steady pulse you tap your foot to. <b>Tempo</b> is how fast the beat goes, in beats per minute (BPM): 60 BPM is one beat a second, 120 BPM is two.</p>
<p>Note lengths are counted in beats:</p>
<table class="mini"><tr><th>Note</th><th>Beats (in 4/4)</th><th>Count it</th></tr>
<tr><td>𝅝 Whole note</td><td>4</td><td>1-2-3-4</td></tr><tr><td>𝅗𝅥 Half note</td><td>2</td><td>1-2</td></tr><tr><td>♩ Quarter note</td><td>1</td><td>1</td></tr><tr><td>♪ Eighth note</td><td>½</td><td>1-and</td></tr><tr><td>Dotted note</td><td>+ half its length</td><td>dotted half = 3</td></tr></table>
<div class="staff" data-notes="C5:4 C5:2 C5:2 C5:1 C5:1 C5:1 C5:1 C5:0.5 C5:0.5 C5:0.5 C5:0.5 C5:0.5 C5:0.5 C5:0.5 C5:0.5"></div>
<p><button class="try" data-play="C5:4 C5:2 C5:2 C5:1 C5:1 C5:1 C5:1 C5:0.5 C5:0.5 C5:0.5 C5:0.5 C5:0.5 C5:0.5 C5:0.5 C5:0.5" data-click="1" data-tempo="90">▶ Hear it with a click</button></p>
<p>A <b>time signature</b> groups beats into <b>bars</b> (measures). The top number is how many beats are in a bar:</p>
<ul><li><b>4/4</b> — 1 2 3 4: most pop, rock and hip-hop. <button class="try" data-play="C5 G4 G4 G4 C5 G4 G4 G4" data-tempo="110" data-accent="4">▶</button></li>
<li><b>3/4</b> — 1 2 3: waltzes, “Happy Birthday”, “Amazing Grace”. <button class="try" data-play="C5 G4 G4 C5 G4 G4 C5 G4 G4" data-tempo="130">▶</button></li>
<li><b>6/8</b> — 1 2 3 4 5 6 felt as two big swaying beats: “Row, Row, Row Your Boat”, many ballads and Irish jigs. <button class="try" data-play="C5:0.5 G4:0.5 G4:0.5 E5:0.5 G4:0.5 G4:0.5 C5:0.5 G4:0.5 G4:0.5 E5:0.5 G4:0.5 G4:0.5" data-tempo="100">▶</button></li></ul>
<p class="tip">Every song has a metronome button: turn on the click and play along — keeping steady time matters more than playing fast.</p>`,
      real: `Count “1-2-3-4” before a band starts so everyone begins together. DJs match songs by BPM; most dance music is 120–128 BPM, ballads 60–80.`,
      quiz: [
        { q: 'How many quarter notes fit in a whole note?', a: ['2', '3', '4', '8'], c: 2 },
        { q: 'How many beats does a dotted half note last?', a: ['1½', '2', '3', '4'], c: 2, why: 'A half note is 2 beats; the dot adds half of that (1).' },
        { q: 'Listen and count. Which time signature is this?', play: 'C5 G4 G4 C5 G4 G4 C5 G4 G4', a: ['4/4', '3/4'], c: 1, why: 'The strong beat comes every three notes.' },
        { q: 'A song at 120 BPM has how many beats every second?', a: ['1', '2', '4', '12'], c: 1 }
      ]
    },
    {
      id: 'staff', level: 1, title: 'Reading notes on the staff', mins: 6,
      body: `<p>Written music uses a <b>staff</b>: five lines and the four spaces between them. Higher on the staff = higher note.</p>
<p>The <b>treble clef</b> (𝄞) is for higher instruments: right hand of piano, violin, flute, voice, guitar, ukulele, mandolin. The <b>bass clef</b> (𝄢) is for low ones: left hand of piano, bass guitar, cello.</p>
<div class="staff" data-notes="E4:1 G4:1 B4:1 D5:1 F5:1" data-labels="1"></div>
<p>Treble clef <b>lines</b> from the bottom: <b>E G B D F</b> — “<b>E</b>very <b>G</b>ood <b>B</b>oy <b>D</b>oes <b>F</b>ine”. <button class="try" data-play="E4 G4 B4 D5 F5">▶</button></p>
<div class="staff" data-notes="F4:1 A4:1 C5:1 E5:1" data-labels="1"></div>
<p>Treble clef <b>spaces</b> spell <b>F A C E</b> — “face”. <button class="try" data-play="F4 A4 C5 E5">▶</button></p>
<div class="staff" data-notes="C4:1 D4:1 E4:1 F4:1 G4:1 A4:1 B4:1 C5:1" data-labels="1"></div>
<p><b>Middle C</b> sits on a short extra line (a <b>ledger line</b>) below the staff. <button class="try" data-play="C4 D4 E4 F4 G4 A4 B4 C5">▶</button></p>
<p>Bass clef lines are <b>G B D F A</b> (“<b>G</b>ood <b>B</b>oys <b>D</b>o <b>F</b>ine <b>A</b>lways”) and the spaces <b>A C E G</b> (“<b>A</b>ll <b>C</b>ows <b>E</b>at <b>G</b>rass”).</p>
<p class="tip">Every song in the Songs tab shows the staff and the tab together, with the note you are on lit up — the fastest way to learn to read.</p>`,
      real: `Choirs, orchestras, school bands and most piano books use the staff. Guitar and bass players often read <b>tab</b> instead (lesson 5), but chord charts and lead sheets still use letter names and rhythm.`,
      quiz: [
        { q: 'Which note is on the bottom line of the treble clef?', a: ['C', 'E', 'F', 'G'], c: 1, why: 'Every Good Boy Does Fine: E is the bottom line.' },
        { q: 'The four spaces of the treble clef spell…', a: ['FACE', 'CAGE', 'BEAD', 'EGBD'], c: 0 },
        { q: 'Where is middle C in the treble clef?', a: ['On the middle line', 'On a ledger line below the staff', 'In the top space', 'Above the staff'], c: 1 },
        { q: 'Which clef does a bass guitar read?', a: ['Treble clef', 'Bass clef'], c: 1 }
      ]
    },
    {
      id: 'instrument', level: 1, title: 'Finding notes on your instrument (and reading tab)', mins: 7,
      body: `<p><b>Piano:</b> the black keys come in groups of 2 and 3. <b>C is the white key just left of each group of two black keys</b>. Find any C and you can find every other note. <button class="go" data-go="inst:piano">Show the piano</button></p>
<p><b>Guitar:</b> the six open strings, from the thickest (lowest) to the thinnest, are <b>E A D G B E</b> — “<b>E</b>ddie <b>A</b>te <b>D</b>ynamite, <b>G</b>ood <b>B</b>ye <b>E</b>ddie”. <button class="try" data-play="E2 A2 D3 G3 B3 E4" data-inst="guitar">▶ The open strings</button> <button class="go" data-go="inst:guitar">Show the guitar</button></p>
<p>Each fret is a half step, so the <b>12th fret is the same note one octave up</b> (there are usually two dots there).</p>
<p><b>Bass guitar:</b> E A D G — the same as the four lowest guitar strings, one octave lower. <button class="try" data-play="E1 A1 D2 G2" data-inst="bass">▶</button></p>
<p><b>Ukulele:</b> G C E A (“<b>G</b>ood <b>C</b>ats <b>E</b>at <b>A</b>pples”). The G string is high, so the strings don’t go strictly low to high. <button class="try" data-play="G4 C4 E4 A4" data-inst="ukulele">▶ My dog has fleas</button></p>
<p><b>Violin and mandolin:</b> G D A E, each string a perfect fifth (7 half steps) above the last. The violin has no frets: you learn where to put your fingers by ear. <button class="try" data-play="G3 D4 A4 E5" data-inst="violin">▶ Violin strings</button></p>
<h4>Reading tab</h4>
<p><b>Tablature (tab)</b> shows strings as lines and <b>which fret</b> to press as a number. The top line is the thinnest, highest string — the one closest to the floor when you play.</p>
<pre class="tabdemo">e|-----------0-|
B|---------1---|
G|-----0-2-----|
D|---2---------|
A|-3-----------|
E|-------------|</pre>
<p>Read left to right: A string fret 3, D string fret 2, open G, G fret 2, B fret 1, open high e — that is a C major scale, C D E F G A! <button class="try" data-play="C3 D3 E3 F3 G3 A3" data-inst="guitar">▶</button> Tab is easy but doesn’t show rhythm, so it is usually written under the staff — exactly like the songs here.</p>`,
      real: `Guitar and bass songbooks and most online song sites use tab and chord boxes. Once you know your open strings and that every fret is a half step, you can work out any note on the neck.`,
      quiz: [
        { q: 'On a piano, C is the white key just left of…', a: ['the group of three black keys', 'the group of two black keys', 'any black key', 'the lowest key'], c: 1 },
        { q: 'What are the open strings of a guitar, low to high?', a: ['E A D G B E', 'G C E A', 'G D A E', 'E B G D A E'], c: 0 },
        { q: 'In tab, a “0” means…', a: ['Don’t play this string', 'Play the string open (no fret pressed)', 'Press the first fret', 'Rest'], c: 1 },
        { q: 'On which fret does the open-string note repeat an octave higher?', a: ['5th', '7th', '12th', '24th'], c: 2 }
      ]
    },
    /* ---------------- level 2 ---------------- */
    {
      id: 'major', level: 2, title: 'The major scale', mins: 6,
      body: `<p>A <b>scale</b> is a set of notes, in order, that a melody is made from. The most important one is the <b>major scale</b>. Its pattern of steps is:</p>
<p class="big">W – W – H – W – W – W – H</p>
<p>(W = whole step, H = half step). Start on C and follow it and you get only white keys: <b>C D E F G A B C</b>. <button class="try" data-play="C4 D4 E4 F4 G4 A4 B4 C5">▶ C major</button></p>
<div class="staff" data-notes="C4:1 D4:1 E4:1 F4:1 G4:1 A4:1 B4:1 C5:1" data-labels="1"></div>
<p>The notes are numbered as <b>degrees</b> 1 to 7. The 1st note, the <b>tonic</b>, is home: melodies feel finished when they land on it. Try stopping on 7 — it pulls hard to 1. <button class="try" data-play="C4 D4 E4 F4 G4 A4 B4">▶ Stop on 7…</button> <button class="try" data-play="B4 C5">▶ …and resolve home</button></p>
<p><b>Start the pattern on another note</b> and you have to use sharps or flats to keep it. From G: G A B C D E <b>F♯</b> G. <button class="try" data-play="G4 A4 B4 C5 D5 E5 F#5 G5">▶ G major</button> <button class="go" data-go="scale:G:major">See G major on your instrument</button></p>
<p>Singers use <b>do re mi fa sol la ti do</b> for the same degrees in any key.</p>`,
      real: `“Twinkle Twinkle”, “Ode to Joy” and “Mary Had a Little Lamb” use only the C major scale here. Most pop melodies use the major scale of their key, so if you know a song is in G, the notes of G major are your safe notes.`,
      song: 'ode',
      quiz: [
        { q: 'What is the step pattern of the major scale?', a: ['W W H W W W H', 'W H W W H W W', 'H W W W H W W', 'W W W H W W H'], c: 0 },
        { q: 'Which note needs a sharp in G major?', a: ['C♯', 'F♯', 'G♯', 'B♯'], c: 1 },
        { q: 'What is the 5th degree of C major?', a: ['E', 'F', 'G', 'A'], c: 2 },
        { q: 'Listen: does this melody end on the tonic (home)?', play: 'E4 D4 C4 D4 E4 E4 E4 D4 D4 E4 D4 C4', a: ['Yes, it feels finished', 'No, it feels unfinished'], c: 0 }
      ]
    },
    {
      id: 'intervals', level: 2, title: 'Intervals: the distance between notes', mins: 7,
      body: `<p>An <b>interval</b> is the distance between two notes, counted in half steps. Every interval has its own sound — learning them is how musicians play by ear.</p>
<table class="mini" id="ivTable"></table>
<p><b>Perfect</b> intervals (unison, 4th, 5th, octave) sound open and stable. <b>Major and minor 3rds</b> are the sweet sound inside every chord. 2nds and 7ths are tense and want to move. The <b>tritone</b> (6 half steps) is the most restless interval of all.</p>
<p class="tip">Tie each interval to the start of a song you know (see the table). Then practise for a few minutes a day in <button class="go" data-go="ear:intervals">Ear training</button> — short daily practice beats long sessions.</p>`,
      real: `Hearing that a melody “goes up a fifth” lets you find it on your instrument without sheet music. Harmony singers find their part by singing a 3rd above the melody.`,
      quiz: [
        { q: 'How many half steps is a perfect 5th?', a: ['5', '6', '7', '8'], c: 2 },
        { q: 'Which interval is 4 half steps — the sound of the start of “When the Saints Go Marching In”?', a: ['Minor 3rd', 'Major 3rd', 'Perfect 4th', 'Major 2nd'], c: 1 },
        { q: 'Listen. Which interval is this?', play: 'C4 G4', a: ['Major 3rd', 'Perfect 4th', 'Perfect 5th', 'Octave'], c: 2, why: 'The first two notes of “Twinkle Twinkle Little Star”.' },
        { q: 'Which interval is the most unstable?', a: ['Octave', 'Perfect 5th', 'Tritone', 'Major 3rd'], c: 2 }
      ]
    },
    {
      id: 'minor', level: 2, title: 'Minor scales', mins: 6,
      body: `<p>The <b>natural minor scale</b> has the pattern <b>W – H – W – W – H – W – W</b>. From A it uses only white keys: <b>A B C D E F G A</b>. <button class="try" data-play="A3 B3 C4 D4 E4 F4 G4 A4">▶ A minor</button> <button class="try" data-play="C4 D4 E4 F4 G4 A4 B4 C5">▶ compare C major</button></p>
<p>Compared with major, the minor scale has a lowered (♭) <b>3rd, 6th and 7th</b>. The ♭3 is what makes it sound sad or serious.</p>
<p><b>Relative keys:</b> A minor and C major use exactly the same notes — they just start on a different home note. Every major key has a relative minor <b>three half steps lower</b> (G major ↔ E minor, F major ↔ D minor).</p>
<p>Two other minor scales are common:</p>
<ul><li><b>Harmonic minor</b> raises the 7th (G → G♯ in A minor). It sounds exotic and gives a strong pull home. <button class="try" data-play="A3 B3 C4 D4 E4 F4 G#4 A4">▶ A harmonic minor</button></li>
<li><b>Melodic minor</b> raises the 6th and 7th going up. <button class="try" data-play="A3 B3 C4 D4 E4 F#4 G#4 A4">▶ A melodic minor</button></li></ul>
<p><button class="go" data-go="scale:A:minor">Explore A minor</button> <button class="go" data-go="song:greensleeves">Learn “Greensleeves” (uses G♯ from harmonic minor)</button></p>`,
      real: `“House of the Rising Sun”, “Greensleeves” and “Drunken Sailor” are in minor keys. Film composers switch to minor for sad or scary scenes — try playing “Twinkle Twinkle” with E♭ instead of E and hear it turn gloomy.`,
      song: 'greensleeves',
      quiz: [
        { q: 'What is the relative minor of C major?', a: ['C minor', 'A minor', 'E minor', 'D minor'], c: 1 },
        { q: 'Which degrees are lowered in natural minor (compared with major)?', a: ['2, 4, 5', '3, 6, 7', '1, 3, 5', 'Only 7'], c: 1 },
        { q: 'Listen. Major or minor?', play: 'A3 B3 C4 D4 E4 F4 G4 A4', a: ['Major', 'Minor'], c: 1 },
        { q: 'Harmonic minor raises which note?', a: ['The 3rd', 'The 5th', 'The 6th', 'The 7th'], c: 3 }
      ]
    },
    {
      id: 'pentatonic', level: 2, title: 'Pentatonic and blues scales — your first solos', mins: 7,
      body: `<p><b>Pentatonic</b> means five notes. Take the major scale and remove the 4th and 7th — the two notes that form half steps — and nothing can clash any more.</p>
<ul><li><b>Major pentatonic</b> (1 2 3 5 6): C D E G A. <button class="try" data-play="C4 D4 E4 G4 A4 C5">▶</button> Happy, open — folk, country, and the black keys of the piano.</li>
<li><b>Minor pentatonic</b> (1 ♭3 4 5 ♭7): A C D E G. <button class="try" data-play="A3 C4 D4 E4 G4 A4">▶</button> The rock and blues solo scale.</li>
<li><b>Blues scale</b> = minor pentatonic + the “blue note” ♭5: A C D <b>E♭</b> E G. <button class="try" data-play="A3 C4 D4 Eb4 E4 G4 A4">▶</button></li></ul>
<p>On guitar, the minor pentatonic has one famous <b>box shape</b> that you can slide to any key. <button class="go" data-go="scale:A:minpent">See the A minor pentatonic box</button></p>
<p class="tip"><b>Your first improvisation:</b> open the <button class="go" data-go="prog:blues">12-bar blues jam</button>, press Play, and play any notes of the highlighted A blues scale. Start with just 2 or 3 notes, leave gaps, and end phrases on A.</p>`,
      real: `Most rock guitar solos use the minor pentatonic. “Amazing Grace” and “Auld Lang Syne” use only the five pentatonic notes — that’s why you can play them on just the black keys of a piano.`,
      song: 'amazing',
      quiz: [
        { q: 'How many notes are in a pentatonic scale?', a: ['4', '5', '6', '7'], c: 1 },
        { q: 'Which note does the blues scale add to the minor pentatonic?', a: ['The ♭5', 'The 2nd', 'The major 7th', 'The 6th'], c: 0 },
        { q: 'Which notes are in A minor pentatonic?', a: ['A B C D E', 'A C D E G', 'A C# E F# G', 'A D E F G'], c: 1 },
        { q: 'Why does pentatonic sound good over many chords?', a: ['It has no half steps to clash', 'It has more notes', 'It is always in C', 'It is played slower'], c: 0 }
      ]
    },
    {
      id: 'keys', level: 2, title: 'Keys, key signatures and the circle of fifths', mins: 7,
      body: `<p>A song’s <b>key</b> is its home note and scale: “in G major” means the melody and chords mostly use the G major scale and feel at home on G.</p>
<p>The <b>key signature</b> at the start of each line of music lists the sharps or flats of that key, so they don’t have to be written on every note. G major has one sharp (F♯); F major has one flat (B♭).</p>
<p>The <b>circle of fifths</b> puts the 12 keys in a circle. Going clockwise each key is a fifth higher and has <b>one more sharp</b>; going anticlockwise each has <b>one more flat</b>. Neighbours on the circle share all but one note, so songs often move between them. The inner ring shows each key’s relative minor.</p>
<div class="circle-slot"></div>
<p>Order of sharps: <b>F C G D A E B</b> (“<b>F</b>ather <b>C</b>harles <b>G</b>oes <b>D</b>own <b>A</b>nd <b>E</b>nds <b>B</b>attle”). Flats are the same backwards: <b>B E A D G C F</b>.</p>
<p class="tip">Quick trick: in a sharp key, the last sharp is the 7th degree — the key is one half step above it. Three sharps (F♯ C♯ G♯) → A major.</p>`,
      real: `Guitar-friendly keys are G, D, A, E and C (lots of open strings). Brass and wind players prefer flat keys like B♭ and E♭. If a song is too high to sing, move it to a neighbouring key on the circle.`,
      quiz: [
        { q: 'How many sharps does D major have?', a: ['0', '1', '2', '3'], c: 2, why: 'F♯ and C♯.' },
        { q: 'Going clockwise on the circle of fifths, each key…', a: ['adds one flat', 'adds one sharp', 'is a half step higher', 'is minor'], c: 1 },
        { q: 'Which key has one flat (B♭)?', a: ['G major', 'F major', 'D major', 'E minor'], c: 1 },
        { q: 'What is the relative minor of G major?', a: ['G minor', 'B minor', 'E minor', 'D minor'], c: 2 }
      ]
    },
    /* ---------------- level 3 ---------------- */
    {
      id: 'triads', level: 3, title: 'Triads: how chords are built', mins: 6,
      body: `<p>A <b>chord</b> is three or more notes played together. The basic chord, the <b>triad</b>, is built by stacking <b>3rds</b>: a root, a 3rd and a 5th — every other note of the scale.</p>
<table class="mini"><tr><th>Triad</th><th>Formula</th><th>From C</th><th>Sound</th><th></th></tr>
<tr><td>Major</td><td>1 3 5 (4 + 3 half steps)</td><td>C E G</td><td>Happy, stable</td><td><button class="try" data-play="C4 E4 G4" data-how="both">▶</button></td></tr>
<tr><td>Minor</td><td>1 ♭3 5 (3 + 4)</td><td>C E♭ G</td><td>Sad, soft</td><td><button class="try" data-play="C4 Eb4 G4" data-how="both">▶</button></td></tr>
<tr><td>Diminished</td><td>1 ♭3 ♭5 (3 + 3)</td><td>C E♭ G♭</td><td>Tense</td><td><button class="try" data-play="C4 Eb4 Gb4" data-how="both">▶</button></td></tr>
<tr><td>Augmented</td><td>1 3 ♯5 (4 + 4)</td><td>C E G♯</td><td>Suspense</td><td><button class="try" data-play="C4 E4 G#4" data-how="both">▶</button></td></tr></table>
<p>Major and minor differ by just <b>one note</b>: the 3rd. Move it down a half step and major turns minor.</p>
<p>Notes of a chord can be played in any order and octave and it is still the same chord: C E G, E G C and G C E are all C major (the last two are <b>inversions</b>). <button class="try" data-play="C4 E4 G4" data-how="chord">▶ C</button> <button class="try" data-play="E4 G4 C5" data-how="chord">▶ 1st inversion</button> <button class="try" data-play="G3 C4 E4" data-how="chord">▶ 2nd inversion</button></p>
<p>That’s why a guitar C chord (x32010) has C E G spread over five strings. <button class="go" data-go="chord:C:maj">See C major on every instrument</button></p>`,
      real: `Chord symbols on lead sheets and song sites are just a letter for the root plus a quality: “Am” = A minor, “F♯dim” = F♯ diminished. If you know the formula you can work out any chord, even one you’ve never seen.`,
      quiz: [
        { q: 'Which notes make a G major triad?', a: ['G B D', 'G B♭ D', 'G C D', 'G A B'], c: 0 },
        { q: 'What makes a chord minor instead of major?', a: ['A lower 3rd', 'A lower 5th', 'A higher root', 'An extra note'], c: 0 },
        { q: 'Listen. Major or minor chord?', play: '[A3 C4 E4]', a: ['Major', 'Minor'], c: 1 },
        { q: 'Is E G C still a C major chord?', a: ['Yes, an inversion', 'No, it’s E minor', 'No, it’s a new chord'], c: 0 }
      ]
    },
    {
      id: 'diatonic', level: 3, title: 'Chords in a key and Roman numerals', mins: 7,
      body: `<p>Build a triad on <b>every note of the major scale</b>, using only notes of that scale, and you get the seven chords that belong to the key:</p>
<p class="big">I &nbsp; ii &nbsp; iii &nbsp; IV &nbsp; V &nbsp; vi &nbsp; vii°</p>
<p>Uppercase = major, lowercase = minor, ° = diminished. The pattern is the same in every major key. In C: <b>C Dm Em F G Am B°</b>. In G: <b>G Am Bm C D Em F♯°</b>.</p>
<div class="diatonic-slot" data-key="C"></div>
<p>Each chord has a job:</p>
<ul><li><b>I (tonic)</b> — home, rest.</li><li><b>IV (subdominant)</b> — moving away, open.</li><li><b>V (dominant)</b> — tension, it wants to go back to I. <button class="try" data-play="[G3 B3 D4] [C4 E4 G4]" data-how="chords">▶ V → I</button></li><li><b>vi</b> — the relative minor; a sad version of home.</li></ul>
<p>Roman numerals let you describe a song <b>in any key at once</b>: “I–IV–V” in C is C–F–G, in G it’s G–C–D, in A it’s A–D–E. <button class="go" data-go="scale:G:major">Chords in G</button></p>`,
      real: `Musicians say “it’s a one-four-five in A” and everyone can play along. Learn the chords of the keys G, C, D and A and you can play thousands of songs. Transposing to a new key is just swapping the chords for the same numerals.`,
      quiz: [
        { q: 'In C major, which chord is V?', a: ['F', 'G', 'Am', 'Em'], c: 1 },
        { q: 'In any major key, chord vi is…', a: ['major', 'minor', 'diminished', 'augmented'], c: 1 },
        { q: 'I–IV–V in the key of D is…', a: ['D G A', 'D E F♯', 'D F G', 'D G Bm'], c: 0 },
        { q: 'Which chord wants to resolve to I?', a: ['ii', 'iii', 'V', 'vi'], c: 2 }
      ]
    },
    {
      id: 'progressions', level: 3, title: 'Chord progressions that power thousands of songs', mins: 8,
      body: `<p>A <b>progression</b> is the order of chords in a song. A handful of progressions are used again and again:</p>
<div class="prog-list-slot"></div>
<p>Press a progression to hear it, open it in the jam player to loop it in any key, and improvise over it with the highlighted scale.</p>
<p class="tip">Ear trick: most songs start and end on <b>I</b>. The chord that sounds most like “the end” is usually the key.</p>`,
      real: `Many famous songs share the same chords — that’s not copying, it’s the language of music. Learning the four chords G, D, Em and C (I–V–vi–IV in G) lets a beginner guitarist strum along with a huge number of pop songs.`,
      quiz: [
        { q: 'The “pop progression” I–V–vi–IV in C is…', a: ['C G Am F', 'C F G C', 'Am F C G', 'C Am F G'], c: 0 },
        { q: 'How many bars long is a standard blues?', a: ['8', '12', '16', '32'], c: 1 },
        { q: 'The jazz progression is usually…', a: ['I IV V', 'ii V I', 'vi IV I V', 'I vi IV V'], c: 1 },
        { q: 'Listen. Which progression is this?', play: '[C4 E4 G4] [B3 D4 G4] [A3 C4 E4] [A3 C4 F4]', a: ['I–V–vi–IV', 'I–IV–V–I', 'ii–V–I'], c: 0 }
      ]
    },
    {
      id: 'sevenths', level: 3, title: 'Seventh chords, tension and release', mins: 6,
      body: `<p>Add one more 3rd on top of a triad and you get a <b>seventh chord</b> — four notes with more colour.</p>
<table class="mini"><tr><th>Chord</th><th>Formula</th><th>From C</th><th>Sound</th><th></th></tr>
<tr><td>Major 7 (Cmaj7)</td><td>1 3 5 7</td><td>C E G B</td><td>Dreamy, jazzy</td><td><button class="try" data-play="C4 E4 G4 B4" data-how="both">▶</button></td></tr>
<tr><td>Dominant 7 (C7)</td><td>1 3 5 ♭7</td><td>C E G B♭</td><td>Bluesy, wants to move</td><td><button class="try" data-play="C4 E4 G4 Bb4" data-how="both">▶</button></td></tr>
<tr><td>Minor 7 (Cm7)</td><td>1 ♭3 5 ♭7</td><td>C E♭ G B♭</td><td>Mellow, soul</td><td><button class="try" data-play="C4 Eb4 G4 Bb4" data-how="both">▶</button></td></tr>
<tr><td>Half-diminished (Cm7♭5)</td><td>1 ♭3 ♭5 ♭7</td><td>C E♭ G♭ B♭</td><td>Dark</td><td><button class="try" data-play="C4 Eb4 Gb4 Bb4" data-how="both">▶</button></td></tr></table>
<p>The <b>V7</b> chord (G7 in C) contains a tritone (B and F). The tension is released when B rises to C and F falls to E — that is why V7 → I sounds like the end of a story. <button class="try" data-play="[G3 B3 D4 F4] [G3 C4 E4 G4]" data-how="chords">▶ G7 → C</button></p>
<p>In the blues, <b>every chord is a dominant 7</b> (A7, D7, E7) — that gritty sound is the blues. <button class="go" data-go="prog:blues">Hear the 12-bar blues</button></p>`,
      real: `Jazz standards use maj7, m7 and 7 chords almost everywhere. Country and folk players add a 7th to the V chord right before going home. Songwriters use “sus4 → major” for the same tension-and-release in a softer way.`,
      quiz: [
        { q: 'A dominant 7th chord has which 7th?', a: ['Major 7th', 'Minor (♭) 7th', 'No 7th', 'Diminished 7th'], c: 1 },
        { q: 'Which notes make G7?', a: ['G B D F', 'G B D F♯', 'G B♭ D F', 'G B D E'], c: 0 },
        { q: 'Where does the V7 chord want to go?', a: ['IV', 'ii', 'I', 'vi'], c: 2 },
        { q: 'Listen. Which chord is this?', play: '[C4 E4 G4 B4]', a: ['Cmaj7', 'C7', 'Cm7'], c: 0 }
      ]
    },
    /* ---------------- level 4 ---------------- */
    {
      id: 'modes', level: 4, title: 'Modes: new colours from the same notes', mins: 7,
      body: `<p>Play the white keys but start and end on a different note, and the same seven notes get a new mood. These are the <b>modes</b>:</p>
<table class="mini"><tr><th>Mode</th><th>White keys</th><th>Like…</th><th>Sound</th><th></th></tr>
<tr><td>Ionian</td><td>C–C</td><td>major</td><td>Happy</td><td><button class="try" data-play="C4 D4 E4 F4 G4 A4 B4 C5">▶</button></td></tr>
<tr><td>Dorian</td><td>D–D</td><td>minor with a ♮6</td><td>Hopeful minor, folk, funk</td><td><button class="try" data-play="D4 E4 F4 G4 A4 B4 C5 D5">▶</button></td></tr>
<tr><td>Phrygian</td><td>E–E</td><td>minor with a ♭2</td><td>Spanish, metal</td><td><button class="try" data-play="E4 F4 G4 A4 B4 C5 D5 E5">▶</button></td></tr>
<tr><td>Lydian</td><td>F–F</td><td>major with a ♯4</td><td>Dreamy, film</td><td><button class="try" data-play="F4 G4 A4 B4 C5 D5 E5 F5">▶</button></td></tr>
<tr><td>Mixolydian</td><td>G–G</td><td>major with a ♭7</td><td>Rock, blues, Celtic</td><td><button class="try" data-play="G4 A4 B4 C5 D5 E5 F5 G5">▶</button></td></tr>
<tr><td>Aeolian</td><td>A–A</td><td>natural minor</td><td>Sad</td><td><button class="try" data-play="A4 B4 C5 D5 E5 F5 G5 A5">▶</button></td></tr>
<tr><td>Locrian</td><td>B–B</td><td>diminished</td><td>Unstable</td><td><button class="try" data-play="B4 C5 D5 E5 F5 G5 A5 B5">▶</button></td></tr></table>
<p>The trick is to <b>hear the home note</b>: hold a drone on D and play the white keys, and you hear Dorian. Each mode has one “colour note” that makes it different from plain major or minor — the ♮6 of Dorian, the ♭7 of Mixolydian, the ♯4 of Lydian.</p>
<p><button class="go" data-go="song:sailor">Learn “Drunken Sailor” (Dorian)</button> <button class="go" data-go="prog:mixo">Jam: I–♭VII–IV (Mixolydian rock)</button></p>`,
      real: `Rock songs that go D–C–G–D are Mixolydian (the C chord comes from the ♭7). “Drunken Sailor” and “Scarborough Fair” are Dorian. Modes are also the secret behind many film and video-game scores.`,
      song: 'sailor',
      quiz: [
        { q: 'Which mode is like major with a ♭7?', a: ['Dorian', 'Lydian', 'Mixolydian', 'Phrygian'], c: 2 },
        { q: 'Dorian is like natural minor but with…', a: ['a ♭2', 'a raised (♮) 6th', 'a ♯4', 'a major 3rd'], c: 1 },
        { q: 'On the white keys, which note do you start on for Phrygian?', a: ['C', 'D', 'E', 'G'], c: 2 },
        { q: 'The chords D–C–G–D come from which mode?', a: ['D Mixolydian', 'D Dorian', 'D Lydian', 'D minor'], c: 0 }
      ]
    },
    {
      id: 'melody', level: 4, title: 'Writing melodies that fit the chords', mins: 7,
      body: `<p>Good melodies follow a few simple habits — you can see all of them in the songs here:</p>
<ol><li><b>Chord tones on strong beats.</b> On beat 1 of each bar, use a note of the chord (1, 3 or 5). In bar 1 of “Twinkle” the chord is C and the melody is C C G G — all C-chord notes.</li>
<li><b>Mostly steps, a few leaps.</b> Move to the next scale note most of the time. After a big leap, step back the other way. <button class="try" data-play="C4 G4 A4 G4 F4 E4 D4 C4">▶ Leap up, step down</button></li>
<li><b>Repeat and vary.</b> Play an idea, repeat it, then change it a little. “Twinkle” repeats its middle line twice.</li>
<li><b>Question and answer.</b> End the first phrase on 2 or 5 (an open, “question” feeling), the second on 1 (the answer). <button class="try" data-play="E4 D4 C4 D4 E4 E4 D4:2">▶ Question…</button> <button class="try" data-play="E4 D4 C4 D4 E4 E4 C4:2">▶ …answer</button></li>
<li><b>Leave space.</b> Rests let the music breathe — and give singers time to breathe too.</li></ol>
<p>Notes <b>between</b> chord tones (passing notes) are fine on weak beats: they connect the chord tones.</p>
<p class="tip">Try it: open the <button class="go" data-go="prog:pop">I–V–vi–IV jam</button>, and on the piano or fretboard play only lit chord tones on beat 1 and any scale notes in between.</p>`,
      real: `Songwriters, jingle writers and game composers work exactly like this: pick chords, then hum a melody that lands on chord tones and moves in steps.`,
      quiz: [
        { q: 'Over a C chord, which note is a chord tone?', a: ['D', 'E', 'F', 'B'], c: 1 },
        { q: 'After a big leap up, a melody usually…', a: ['leaps up again', 'steps back down', 'stops', 'changes key'], c: 1 },
        { q: 'Which note makes a phrase sound finished?', a: ['The 1st (tonic)', 'The 2nd', 'The 7th', 'The 4th'], c: 0 },
        { q: 'A passing note is best on…', a: ['a strong beat', 'a weak beat'], c: 1 }
      ]
    },
    {
      id: 'byear', level: 4, title: 'Playing by ear, transposing and the capo', mins: 7,
      body: `<h4>Find the key of any song</h4>
<ol><li>Listen to the end of the song or the chorus — which note or chord feels like home? Hum it.</li><li>Find that note on your instrument. That’s your key note (the tonic).</li><li>Happy or sad? Major or minor. Now you know the scale and the seven likely chords.</li></ol>
<h4>Work out the melody</h4>
<p>Hum the first two notes and ask: <b>up or down? step or leap?</b> Use your <b>interval</b> songs to name the leap, then find it. You only need the scale of the key — most notes are in it.</p>
<h4>Transposing</h4>
<p>To move a song to another key, move <b>every note and chord by the same distance</b>. C–Am–F–G up two half steps becomes D–Bm–G–A. Roman numerals stay the same: it’s still I–vi–IV–V. Every song here has a <b>Transpose</b> button that does this for you.</p>
<h4>The capo</h4>
<p>A capo clamps across the guitar neck and raises every string. <b>Capo on fret 2 + a G chord shape = an A chord.</b> So a guitarist can play a song in A, B♭ or B using the easy open shapes of G, C, D and Em.</p>
<table class="mini"><tr><th>Shape</th><th>Capo 1</th><th>Capo 2</th><th>Capo 3</th><th>Capo 5</th></tr><tr><td>G</td><td>A♭</td><td>A</td><td>B♭</td><td>C</td></tr><tr><td>C</td><td>D♭</td><td>D</td><td>E♭</td><td>F</td></tr><tr><td>D</td><td>E♭</td><td>E</td><td>F</td><td>G</td></tr><tr><td>Em</td><td>Fm</td><td>F♯m</td><td>Gm</td><td>Am</td></tr></table>`,
      real: `Choose the key that suits your voice: if the chorus is too high, transpose the song down a couple of half steps. Bands transpose for singers all the time; a capo makes it painless on guitar.`,
      quiz: [
        { q: 'C–F–G transposed up a whole step is…', a: ['D–G–A', 'C♯–F♯–G♯', 'E–A–B', 'D–F–G'], c: 0 },
        { q: 'Capo on fret 2, playing a G shape. What chord sounds?', a: ['G', 'A', 'B', 'F'], c: 1 },
        { q: 'To find a song’s key, listen for…', a: ['the loudest note', 'the note or chord that feels like home', 'the first note only', 'the highest note'], c: 1 },
        { q: 'When you transpose a song, its Roman numerals…', a: ['change', 'stay the same'], c: 1 }
      ]
    },
    {
      id: 'songwriting', level: 4, title: 'Put it together: make your own song', mins: 10,
      body: `<p>You now have everything you need for a short song. Here’s a recipe:</p>
<ol><li><b>Pick a key</b> that’s easy on your instrument — G or C on guitar, C on piano, C or G on ukulele.</li>
<li><b>Pick a progression</b> for the verse (try I–vi–IV–V) and a different one for the chorus (try IV–V–I or I–V–vi–IV). Changing chords between sections makes the chorus lift.</li>
<li><b>Choose a rhythm</b>: 4/4 at 90–120 BPM for pop, 3/4 for a waltz feel, 6/8 for a ballad.</li>
<li><b>Hum a melody</b> over the loop using the habits from the last lesson: chord tones on beat 1, steps, repetition, question and answer.</li>
<li><b>Structure:</b> Verse – Chorus – Verse – Chorus – Bridge (try the vi or IV chord) – Chorus.</li></ol>
<p><button class="go" data-go="prog:custom">Open the progression builder</button> — click chords from the key to build your own loop, play it, improvise on the instrument, and download the chord chart and tab.</p>
<p class="tip">Record yourself with your phone. Listening back is the fastest way to hear what works — and you can turn your idea into a full backing track in <a href="music-forge.html">Music Forge</a>.</p>`,
      real: `This is how most songs are actually written: a chord loop, a hummed melody, then words. You don’t need to know all the theory first — use it to get unstuck and to understand why your favourite songs work.`,
      quiz: [
        { q: 'A good first step when writing a song is to…', a: ['pick a key and a chord loop', 'learn every scale first', 'use all 12 notes', 'avoid repeating anything'], c: 0 },
        { q: 'A common song structure is…', a: ['Verse–Chorus–Verse–Chorus–Bridge–Chorus', 'Chorus only', 'Intro–Outro', 'Bridge–Bridge–Bridge'], c: 0 },
        { q: 'Which time signature gives a waltz feel?', a: ['4/4', '3/4', '2/4', '5/4'], c: 1 }
      ]
    }
  ];

  /* ---------- songs ---------- */
  // melody: "note:beats" (r = rest); chords: "Chord:beats" (- = no chord). pickup = beats before bar 1.
  const SONGS = [
    {
      id: 'twinkle', title: 'Twinkle, Twinkle, Little Star', origin: 'French folk tune (18th century)', level: 1, key: 'C', time: [4, 4], tempo: 96,
      melody: 'C4:1 C4:1 G4:1 G4:1 A4:1 A4:1 G4:2 F4:1 F4:1 E4:1 E4:1 D4:1 D4:1 C4:2 G4:1 G4:1 F4:1 F4:1 E4:1 E4:1 D4:2 G4:1 G4:1 F4:1 F4:1 E4:1 E4:1 D4:2 C4:1 C4:1 G4:1 G4:1 A4:1 A4:1 G4:2 F4:1 F4:1 E4:1 E4:1 D4:1 D4:1 C4:2',
      chords: 'C:4 F:2 C:2 F:2 C:2 G:2 C:2 C:2 F:2 C:2 G:2 C:2 F:2 C:2 G:2 C:4 F:2 C:2 F:2 C:2 G:2 C:2',
      learn: ['Only the C major scale — no sharps or flats.', 'Just three chords: I (C), IV (F) and V (G).', 'Starts with a leap of a <b>perfect 5th</b> (C → G) — the interval to remember for ear training.', 'Shape A–B–A: the middle line repeats, then the first line returns. Every phrase ends with a long note.'],
      tip: 'On guitar this sits on the A, D and G strings in the first frets. On piano, keep your right thumb on C and your little finger reaches A.'
    },
    {
      id: 'mary', title: 'Mary Had a Little Lamb', origin: 'American nursery rhyme (1830s)', level: 1, key: 'C', time: [4, 4], tempo: 100,
      melody: 'E4:1 D4:1 C4:1 D4:1 E4:1 E4:1 E4:2 D4:1 D4:1 D4:2 E4:1 G4:1 G4:2 E4:1 D4:1 C4:1 D4:1 E4:1 E4:1 E4:1 E4:1 D4:1 D4:1 E4:1 D4:1 C4:4',
      chords: 'C:4 C:4 G:4 C:4 C:4 C:4 G:4 C:4',
      learn: ['Only five notes, moving mostly by <b>step</b>.', 'Two chords: I (C) and V (G). The melody note D fits G; E and C fit the C chord.', 'Same first half twice — the second time it ends on C, the tonic, so it sounds finished.'],
      tip: 'A perfect first song for piano (three fingers: E D C) and for any fretted instrument.'
    },
    {
      id: 'ode', title: 'Ode to Joy', origin: 'Ludwig van Beethoven, 9th Symphony (1824)', level: 1, key: 'C', time: [4, 4], tempo: 108,
      melody: 'E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 E4:1.5 D4:0.5 D4:2 E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 D4:1.5 C4:0.5 C4:2 D4:1 D4:1 E4:1 C4:1 D4:1 E4:0.5 F4:0.5 E4:1 C4:1 D4:1 E4:0.5 F4:0.5 E4:1 D4:1 C4:1 D4:1 G3:2 E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 D4:1.5 C4:0.5 C4:2',
      chords: 'C:4 G:4 C:4 C:2 G:2 C:4 G:4 C:4 G:2 C:2 G:2 C:2 G:2 C:2 G:2 C:2 C:2 G:2 C:4 G:4 C:4 G:2 C:2',
      learn: ['Almost all <b>steps</b> in the C major scale — a great reading exercise.', 'Phrase 1 ends on D (2nd degree) = a <b>question</b>; phrase 2 ends on C = the <b>answer</b>.', 'Dotted rhythm (1½ + ½) at the end of each phrase.', 'Chords I and V only.'],
      tip: 'Play slowly with the click on, then raise the tempo.'
    },
    {
      id: 'row', title: 'Row, Row, Row Your Boat', origin: 'Traditional round (1852)', level: 1, key: 'C', time: [6, 8], tempo: 150,
      melody: 'C4:3 C4:3 C4:2 D4:1 E4:3 E4:2 D4:1 E4:2 F4:1 G4:6 C5:1 C5:1 C5:1 G4:1 G4:1 G4:1 E4:1 E4:1 E4:1 C4:1 C4:1 C4:1 G4:2 F4:1 E4:2 D4:1 C4:6',
      chords: 'C:6 C:6 C:6 C:6 C:6 C:6 G:6 C:6',
      learn: ['<b>6/8 time</b>: six eighth notes per bar felt as two big beats (count 1-2-3 4-5-6).', 'The melody climbs C–D–E–F–G, then comes back down the <b>C major arpeggio</b> (C5–G–E–C).', 'It is a <b>round</b>: a second person starts from the beginning when the first reaches bar 3, and it still fits — because the chords never change.'],
      tip: 'Tempo is counted in eighth notes here.'
    },
    {
      id: 'frere', title: 'Frère Jacques', origin: 'French round (18th century)', level: 1, key: 'C', time: [4, 4], tempo: 112,
      melody: 'C4:1 D4:1 E4:1 C4:1 C4:1 D4:1 E4:1 C4:1 E4:1 F4:1 G4:2 E4:1 F4:1 G4:2 G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4:1 C4:1 G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4:1 C4:1 C4:1 G3:1 C4:2 C4:1 G3:1 C4:2',
      chords: 'C:4 C:4 C:4 C:4 C:4 C:4 C:1 G:1 C:2 C:1 G:1 C:2',
      learn: ['Each bar is played twice — great for memorising.', 'Eighth notes in bars 5–6 (count 1-and-2-and).', 'Ends with a leap down a <b>perfect 4th</b> (C → G) and back.', 'Another round: up to four people can sing it, each starting two bars later.'],
      tip: 'Clap the rhythm first, then play.'
    },
    {
      id: 'birthday', title: 'Happy Birthday', origin: 'Hill sisters’ tune (1893), public domain', level: 2, key: 'C', time: [3, 4], tempo: 110, pickup: 1,
      melody: 'G4:0.75 G4:0.25 A4:1 G4:1 C5:1 B4:2 G4:0.75 G4:0.25 A4:1 G4:1 D5:1 C5:2 G4:0.75 G4:0.25 G5:1 E5:1 C5:1 B4:1 A4:1 F5:0.75 F5:0.25 E5:1 C5:1 D5:1 C5:3',
      chords: '-:1 C:3 G:3 G:3 C:3 C:3 F:3 C:2 G:1 C:3',
      learn: ['<b>3/4 time</b> with a <b>pickup</b>: the first two notes come before bar 1.', 'Starts with a <b>major 2nd</b> (G → A) and later leaps an <b>octave</b> (G4 → G5).', 'Dotted eighth + sixteenth rhythm on “Happy”.', 'Uses I, IV and V — the IV chord (F) arrives on the big high note.'],
      tip: 'The octave leap is the hard part — practise bars 4–5 slowly on their own.'
    },
    {
      id: 'amazing', title: 'Amazing Grace', origin: 'Hymn tune “New Britain” (1829)', level: 2, key: 'G', time: [3, 4], tempo: 84, pickup: 1,
      melody: 'D4:1 G4:2 B4:0.5 G4:0.5 B4:2 A4:1 G4:2 E4:1 D4:2 D4:1 G4:2 B4:0.5 G4:0.5 B4:2 A4:1 D5:3 D5:2 B4:1 D5:2 B4:0.5 G4:0.5 B4:2 A4:1 G4:2 E4:1 D4:2 D4:1 G4:2 B4:0.5 G4:0.5 B4:2 A4:1 G4:3',
      chords: '-:1 G:3 G:3 C:3 G:3 G:3 G:3 D:3 D:3 G:3 G:3 C:3 G:3 G:3 G:2 D:1 G:3',
      learn: ['Uses only the 5 notes of the <b>G major pentatonic</b> scale (G A B D E).', 'Starts with a <b>perfect 4th</b> (D → G).', '3/4 time with a pickup note.', 'Chords I, IV and V in G: G, C and D — the most popular guitar key.'],
      tip: 'Guitarists: G, C and D chords — the same three chords as countless folk songs.'
    },
    {
      id: 'jingle', title: 'Jingle Bells (chorus)', origin: 'James Lord Pierpont (1857)', level: 2, key: 'C', time: [4, 4], tempo: 120,
      melody: 'E4:1 E4:1 E4:2 E4:1 E4:1 E4:2 E4:1 G4:1 C4:1.5 D4:0.5 E4:4 F4:1 F4:1 F4:1.5 F4:0.5 F4:1 E4:1 E4:1 E4:0.5 E4:0.5 E4:1 D4:1 D4:1 E4:1 D4:2 G4:2 E4:1 E4:1 E4:2 E4:1 E4:1 E4:2 E4:1 G4:1 C4:1.5 D4:0.5 E4:4 F4:1 F4:1 F4:1.5 F4:0.5 F4:1 E4:1 E4:1 E4:0.5 E4:0.5 G4:1 G4:1 F4:1 D4:1 C4:4',
      chords: 'C:4 C:4 C:4 C:4 F:4 C:4 D7:4 G:4 C:4 C:4 C:4 C:4 F:4 C:4 G7:4 C:4',
      learn: ['Repeated notes make the rhythm the star — count the dotted quarter (1½ beats).', 'Bar 7 borrows a <b>D7</b> chord (the “V of V”): it points strongly to G, which then points home to C.', 'The final G7 → C is the classic <b>V7 → I</b> ending.'],
      tip: 'Notice how the first and second halves differ only in the last two bars.'
    },
    {
      id: 'auld', title: 'Auld Lang Syne', origin: 'Scottish folk tune (1788)', level: 2, key: 'F', time: [4, 4], tempo: 88, pickup: 1,
      melody: 'C4:1 F4:1.5 F4:0.5 F4:1 A4:1 G4:1.5 F4:0.5 G4:1 A4:1 F4:1.5 F4:0.5 A4:1 C5:1 D5:3 D5:1 C5:1.5 A4:0.5 A4:1 F4:1 G4:1.5 F4:0.5 G4:1 A4:1 F4:1.5 D4:0.5 D4:1 C4:1 F4:3',
      chords: '-:1 F:4 C:4 F:4 Bb:4 F:4 C:4 Bb:2 C:2 F:3',
      learn: ['In <b>F major</b> — one flat (B♭) in the key signature.', 'Uses only the <b>F major pentatonic</b> (F G A C D): no B♭ in the melody at all.', 'Dotted rhythm (1½ + ½) all the way through.', 'The IV chord (B♭) is the high point of the song.'],
      tip: 'On guitar the B♭ chord is a barre; try the easier shape x1333x first.'
    },
    {
      id: 'greensleeves', title: 'Greensleeves', origin: 'English folk song (16th century)', level: 3, key: 'A', minor: true, time: [3, 4], tempo: 100, pickup: 1,
      melody: 'A4:1 C5:2 D5:1 E5:1.5 F5:0.5 E5:1 D5:2 B4:1 G4:1.5 A4:0.5 B4:1 C5:2 A4:1 A4:1.5 G#4:0.5 A4:1 B4:2 G#4:1 E4:2 A4:1 C5:2 D5:1 E5:1.5 F5:0.5 E5:1 D5:2 B4:1 G4:1.5 A4:0.5 B4:1 C5:1.5 B4:0.5 A4:1 G#4:1.5 F#4:0.5 G#4:1 A4:3',
      chords: '-:1 Am:3 C:3 G:3 Em:3 Am:3 Am:3 E:3 Am:3 Am:3 C:3 G:3 Em:3 Am:3 E:3 Am:3',
      learn: ['<b>A minor</b>, with <b>G♯</b> borrowed from the harmonic minor scale to make the E major chord (V).', 'The F♯ near the end comes from the <b>melodic minor</b>.', 'Starts with a <b>minor 3rd</b> (A → C).', 'Chords i–III–VII–v… in A minor: Am, C, G, Em, then E (major V) pulls back home.'],
      tip: 'Hear how the E major chord (with G♯) makes the ending pull to Am much more strongly than Em would.'
    },
    {
      id: 'sailor', title: 'Drunken Sailor', origin: 'Sea shanty (19th century)', level: 3, key: 'D', minor: true, mode: 'dorian', time: [4, 4], tempo: 120,
      melody: 'A4:1 A4:0.5 A4:0.5 A4:1 A4:0.5 A4:0.5 A4:1 D4:1 F4:1 A4:1 G4:1 G4:0.5 G4:0.5 G4:1 G4:0.5 G4:0.5 G4:1 C4:1 E4:1 G4:1 A4:1 A4:0.5 A4:0.5 A4:1 A4:0.5 A4:0.5 A4:1 B4:1 C5:1 D5:1 C5:1 A4:1 G4:1 E4:1 D4:2 D4:2',
      chords: 'Dm:4 Dm:4 C:4 C:4 Dm:4 Dm:4 C:4 Dm:4',
      learn: ['<b>D Dorian</b>: D minor with a B natural instead of B♭ — listen for it in bar 6.', 'Just two chords a whole step apart: i (Dm) and ♭VII (C).', 'Bars 3–4 repeat bars 1–2 a whole step lower — a <b>sequence</b>.', 'Bars 2 and 4 outline the chords as arpeggios (D–F–A, C–E–G).'],
      tip: 'Stamp your foot on beats 1 and 3 — it’s a work song.'
    },
    {
      id: 'elise', title: 'Für Elise (opening)', origin: 'Ludwig van Beethoven (1810)', level: 3, key: 'A', minor: true, time: [3, 8], tempo: 132, pickup: 1,
      melody: 'E5:0.5 D#5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5 A4:1 r:0.5 C4:0.5 E4:0.5 A4:0.5 B4:1 r:0.5 E4:0.5 G#4:0.5 B4:0.5 C5:1 r:0.5 E4:0.5 E5:0.5 D#5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5 A4:1 r:0.5 C4:0.5 E4:0.5 A4:0.5 B4:1 r:0.5 E4:0.5 C5:0.5 B4:0.5 A4:3',
      chords: '-:1 -:3 Am:3 E:3 Am:3 -:3 Am:3 E:3 Am:3',
      learn: ['<b>A minor</b>: the D♯ is a <b>chromatic neighbour note</b> — a half step below E, wiggling around it.', 'G♯ in bar 3 comes from the E major chord (V) — harmonic minor again.', 'Bars 2–3 outline chords as broken arpeggios: A–C–E (Am), E–G♯–B (E).', '3/8 time, counted in eighth notes.'],
      tip: 'Pianists: the arpeggio notes are usually played by the left hand. Here they’re all in one line so every instrument can play it.'
    },
    {
      id: 'rising', title: 'House of the Rising Sun (chords)', origin: 'Traditional American folk song', level: 3, key: 'A', minor: true, time: [6, 8], tempo: 160, study: 'arp',
      chords: 'Am:6 C:6 D:6 F:6 Am:6 C:6 E:6 E:6 Am:6 C:6 D:6 F:6 Am:6 E:6 Am:6 E:6',
      learn: ['A chord study in <b>6/8</b>: each chord is played as a broken arpeggio, string by string.', 'A minor with chords from the parallel major: D major (with F♯) and E major (V) — a striking colour.', 'i–III–IV–VI–i–III–V: the E chord (V) builds tension to start the next verse.'],
      tip: 'Guitarists: pick the root string first, then the higher strings one at a time.'
    },
    {
      id: 'canon', title: 'Canon in D (chords)', origin: 'Johann Pachelbel (around 1690)', level: 2, key: 'D', time: [4, 4], tempo: 70, study: 'arp',
      chords: 'D:2 A:2 Bm:2 F#m:2 G:2 D:2 G:2 A:2 D:2 A:2 Bm:2 F#m:2 G:2 D:2 G:2 A:2',
      learn: ['The eight chords I–V–vi–iii–IV–I–IV–V repeat over and over while melodies are layered on top.', 'The bass walks down step by step: D–C♯–B–A–G–F♯–G–A.', 'This progression is the ancestor of countless pop songs and wedding entrances.'],
      tip: 'Try improvising with the D major scale while it loops.'
    },
    {
      id: 'blues', title: '12-bar blues in A (shuffle)', origin: 'The blues form (early 20th century)', level: 2, key: 'A', time: [4, 4], tempo: 96, study: 'shuffle',
      chords: 'A7:4 A7:4 A7:4 A7:4 D7:4 D7:4 A7:4 A7:4 E7:4 D7:4 A7:4 E7:4',
      learn: ['The <b>12-bar blues</b>: I for four bars, IV for two, I for two, then V–IV–I–V.', 'Every chord is a <b>dominant 7th</b> (A7, D7, E7).', 'The last bar (E7, the <b>turnaround</b>) leads back to the start.', 'Improvise over all 12 bars with the <b>A blues scale</b>.'],
      tip: 'Rock ’n’ roll, early rock, boogie-woogie and funk all grew out of this form.'
    }
  ];

  /* ---------- famous progressions ---------- */
  // numerals for a major (or minor) key; known: a few songs that famously use it (titles only).
  const PROGRESSIONS = [
    { id: 'pop', name: 'I–V–vi–IV', nick: 'The pop progression', key: 'C', chords: ['I', 'V', 'vi', 'IV'], scale: 'majpent', known: ['Let It Be', 'No Woman, No Cry', 'With or Without You', 'Someone Like You', 'Don’t Stop Believin’'], about: 'Probably the most used progression in modern pop. Start it on vi instead and you get the sadder vi–IV–I–V.' },
    { id: 'sad', name: 'vi–IV–I–V', nick: 'The emotional pop loop', key: 'G', chords: ['vi', 'IV', 'I', 'V'], scale: 'minpent', scaleRoot: 'vi', known: ['Zombie', 'Despacito', 'Africa (chorus)'], about: 'The same four chords as I–V–vi–IV, starting on the minor chord, so it feels darker and more dramatic.' },
    { id: 'three', name: 'I–IV–V–I', nick: 'Three-chord song', key: 'G', chords: ['I', 'IV', 'V', 'I'], scale: 'majpent', known: ['La Bamba', 'Twist and Shout', 'Wild Thing', 'Happy Birthday'], about: 'The foundation of folk, rock ’n’ roll, country and children’s songs. Three chords and the truth.' },
    { id: 'fifties', name: 'I–vi–IV–V', nick: '50s doo-wop', key: 'C', chords: ['I', 'vi', 'IV', 'V'], scale: 'majpent', known: ['Stand by Me', 'Earth Angel', 'Every Breath You Take'], about: 'The sound of 1950s ballads, still everywhere in pop and film.' },
    { id: 'jazz', name: 'ii–V–I', nick: 'The jazz cadence', key: 'C', chords: ['ii7', 'V7', 'Imaj7', 'Imaj7'], scale: 'major', known: ['Autumn Leaves', 'Fly Me to the Moon', 'Almost every jazz standard'], about: 'Jazz is full of ii–V–I moves, often hopping through several keys in a row.' },
    { id: 'blues', name: '12-bar blues', nick: 'I–IV–V in 12 bars', key: 'A', chords: ['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'], scale: 'blues', shuffle: true, known: ['Johnny B. Goode', 'Hound Dog', 'Rock Around the Clock'], about: 'The form behind blues and early rock ’n’ roll. Improvise with the blues scale over all 12 bars.' },
    { id: 'andalusian', name: 'i–♭VII–♭VI–V', nick: 'Andalusian cadence', key: 'A', minor: true, chords: ['i', '♭VII', '♭VI', 'V'], scale: 'harmonic', known: ['Hit the Road Jack', 'Runaway', 'Flamenco music'], about: 'A minor-key walk down from i to V, with a Spanish feel thanks to the major V chord.' },
    { id: 'mixo', name: 'I–♭VII–IV–I', nick: 'Mixolydian rock', key: 'D', chords: ['I', '♭VII', 'IV', 'I'], scale: 'mixolydian', known: ['Sweet Child O’ Mine (verse)', 'Sympathy for the Devil', 'Hey Jude (coda)'], about: 'The ♭VII chord comes from the Mixolydian mode and gives a big, open rock sound.' },
    { id: 'canon', name: 'I–V–vi–iii–IV–I–IV–V', nick: 'Pachelbel’s Canon', key: 'D', chords: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'], scale: 'major', known: ['Canon in D', 'Basket Case (similar)', 'Wedding entrances'], about: 'Eight chords with a bass that walks down step by step — the ancestor of many pop progressions.' },
    { id: 'minor4', name: 'i–VI–III–VII', nick: 'Epic minor loop', key: 'A', minor: true, chords: ['i', '♭VI', '♭III', '♭VII'], scale: 'minor', known: ['Many film, game and rock anthems'], about: 'The same chords as I–V–vi–IV started on the minor chord — sounds big and heroic.' }
  ];

  /* ---------- intervals: reference songs (starting notes, ascending unless marked) ---------- */
  const IV_SONGS = {
    1: ['Jaws theme', 'Für Elise (wiggle, down)'], 2: ['Happy Birthday', 'Frère Jacques'], 3: ['Greensleeves', 'Smoke on the Water'], 4: ['When the Saints Go Marching In', 'Kumbaya'],
    5: ['Here Comes the Bride', 'Amazing Grace'], 6: ['The Simpsons theme', 'Maria (West Side Story)'], 7: ['Twinkle, Twinkle, Little Star', 'Star Wars main theme'],
    8: ['The Entertainer', 'Love Story theme'], 9: ['My Bonnie Lies over the Ocean', 'NBC chimes'], 10: ['Somewhere (West Side Story)', 'Star Trek original theme'],
    11: ['Take On Me (chorus)', 'Superman theme (later notes)'], 12: ['Somewhere Over the Rainbow', 'Singin’ in the Rain']
  };

  root.TheoryData = { LEVELS, LESSONS, SONGS, PROGRESSIONS, IV_SONGS };
})(typeof self !== 'undefined' ? self : this);

// DOM Elements
const display = document.getElementById('display');
const drumPads = document.querySelectorAll('.drum-pad');
const powerBtn = document.getElementById('power-btn');
const bank1Btn = document.getElementById('bank1-btn');
const bank2Btn = document.getElementById('bank2-btn');
const bankIndicator = document.getElementById('bank-indicator');
const tempoIndicator = document.getElementById('tempo-indicator');
const recIndicator = document.getElementById('rec-indicator');

const volumeSlider = document.getElementById('volume-slider');
const volumeVal = document.getElementById('volume-val');
const muteBtn = document.getElementById('mute-btn');

const bpmSlider = document.getElementById('bpm-slider');
const bpmVal = document.getElementById('bpm-val');

const recBtn = document.getElementById('rec-btn');
const playBtn = document.getElementById('play-btn');
const loopBtn = document.getElementById('loop-btn');
const clearBtn = document.getElementById('clear-btn');
const presetBtns = document.querySelectorAll('.preset-btn');
const chassis = document.querySelector('.drum-machine-chassis');

const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');

// State Variables
let powerOn = true;
let currentBank = 'kit1'; // 'kit1' or 'kit2'
let volume = 0.8;
let isMuted = false;
let bpm = 120;

// Recording & Playback state
let isRecording = false;
let recordStartTime = 0;
let recordedNotes = [];
let isPlaying = false;
let isLooping = false;
let playbackTimeouts = [];

// Visualizer State
let barHeights = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5];

// Initialize Audio Visualizer
function drawVisualizer() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const barWidth = (canvas.width / barHeights.length) - 2;

  barHeights.forEach((height, i) => {
    // Decay height
    if (height > 4) barHeights[i] -= 1.5;

    const x = i * (barWidth + 2);
    const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
    gradient.addColorStop(0, '#0088cc');
    gradient.addColorStop(1, '#00f3ff');

    ctx.fillStyle = powerOn ? gradient : '#1a2228';
    ctx.fillRect(x, canvas.height - barHeights[i], barWidth, barHeights[i]);
  });

  requestAnimationFrame(drawVisualizer);
}
drawVisualizer();

function triggerVisualizerEffect() {
  if (!powerOn) return;
  for (let i = 0; i < barHeights.length; i++) {
    barHeights[i] = Math.min(canvas.height - 2, Math.random() * 25 + 15);
  }
}

// Function to play sound and update interface
function playSound(pad, fromPlayback = false) {
  if (!powerOn) return;

  const audio = pad.querySelector('audio');
  const padName = pad.getAttribute(`data-${currentBank}-name`);

  audio.currentTime = 0;
  audio.volume = isMuted ? 0 : volume;

  // Play audio
  audio.play().catch(e => console.log('Audio play error:', e));

  // Update display readout
  display.innerText = padName.toUpperCase();

  // Active pad animation
  pad.classList.add('active');
  setTimeout(() => pad.classList.remove('active'), 150);

  // Trigger frequency animation
  triggerVisualizerEffect();

  // Record note if recording
  if (isRecording && !fromPlayback) {
    const time = Date.now() - recordStartTime;
    const key = pad.getAttribute('data-key');
    recordedNotes.push({ key, time });
  }
}

// Switch Sound Kits
function setSoundBank(bank) {
  currentBank = bank;

  if (bank === 'kit1') {
    bank1Btn.classList.add('active');
    bank2Btn.classList.remove('active');
    bankIndicator.innerText = 'KIT 1: HEATER';
  } else {
    bank2Btn.classList.add('active');
    bank1Btn.classList.remove('active');
    bankIndicator.innerText = 'KIT 2: SYNTH & PERC';
  }

  // Update pads
  drumPads.forEach(pad => {
    const name = pad.getAttribute(`data-${bank}-name`);
    const src = pad.getAttribute(`data-${bank}-src`);
    const audio = pad.querySelector('audio');
    const titleSpan = pad.querySelector('.pad-title');

    titleSpan.innerText = name;
    audio.src = src;
  });

  if (powerOn) {
    display.innerText = bank === 'kit1' ? 'HEATER KIT LOADED' : 'SYNTH KIT LOADED';
  }
}

// Power Switch Handler
powerBtn.addEventListener('click', () => {
  powerOn = !powerOn;
  if (powerOn) {
    powerBtn.classList.add('active');
    powerBtn.querySelector('.power-text').innerText = 'ON';
    chassis.classList.remove('off');
    display.innerText = 'READY';
  } else {
    powerBtn.classList.remove('active');
    powerBtn.querySelector('.power-text').innerText = 'OFF';
    chassis.classList.add('off');
    display.innerText = 'POWER OFF';
    stopPlayback();
    if (isRecording) toggleRecording();
  }
});

// Sound Bank Switch Handlers
bank1Btn.addEventListener('click', () => setSoundBank('kit1'));
bank2Btn.addEventListener('click', () => setSoundBank('kit2'));

// Volume Control Handlers
volumeSlider.addEventListener('input', (e) => {
  volume = e.target.value / 100;
  volumeVal.innerText = `${e.target.value}%`;
  isMuted = false;
  muteBtn.innerText = volume === 0 ? '🔇' : '🔊';
});

muteBtn.addEventListener('click', () => {
  isMuted = !isMuted;
  muteBtn.innerText = isMuted ? '🔇' : '🔊';
  if (powerOn) {
    display.innerText = isMuted ? 'MUTED' : `VOL: ${Math.round(volume * 100)}%`;
  }
});

// BPM Tempo Handler
bpmSlider.addEventListener('input', (e) => {
  bpm = parseInt(e.target.value);
  bpmVal.innerText = `${bpm} BPM`;
  tempoIndicator.innerText = `${bpm} BPM`;
});

// Click event for drum pads
drumPads.forEach(pad => {
  pad.addEventListener('click', () => playSound(pad));
});

// Keyboard event listener
document.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const key = e.key.toUpperCase();

  // Shortcut key triggers
  if (key === ' ') {
    e.preventDefault();
    togglePlayback();
    return;
  }
  if (key === 'R') {
    toggleRecording();
    return;
  }

  const pad = Array.from(drumPads).find(p => p.getAttribute('data-key') === key);
  if (pad) {
    playSound(pad);
  }
});

// Recording Functions
function toggleRecording() {
  if (!powerOn) return;
  isRecording = !isRecording;

  if (isRecording) {
    stopPlayback();
    recordedNotes = [];
    recordStartTime = Date.now();
    recBtn.classList.add('recording');
    recIndicator.classList.add('active');
    display.innerText = 'RECORDING...';
  } else {
    recBtn.classList.remove('recording');
    recIndicator.classList.remove('active');
    display.innerText = `RECORDED ${recordedNotes.length} NOTES`;
  }
}

// Playback Functions
function togglePlayback() {
  if (!powerOn) return;
  if (isPlaying) {
    stopPlayback();
  } else {
    startPlayback();
  }
}

function startPlayback() {
  if (recordedNotes.length === 0) {
    display.innerText = 'NO RECORDING';
    return;
  }

  isPlaying = true;
  playBtn.classList.add('playing');
  playBtn.innerText = '⏹ STOP';
  display.innerText = 'PLAYING...';

  // Calculate loop length
  const lastNoteTime = recordedNotes[recordedNotes.length - 1].time;
  const totalDuration = lastNoteTime + 400;

  recordedNotes.forEach(note => {
    const pad = Array.from(drumPads).find(p => p.getAttribute('data-key') === note.key);
    if (pad) {
      const timeout = setTimeout(() => {
        playSound(pad, true);
      }, note.time);
      playbackTimeouts.push(timeout);
    }
  });

  // Handle loop or finish
  const loopTimeout = setTimeout(() => {
    if (isLooping && isPlaying) {
      stopPlaybackTimeouts();
      startPlayback();
    } else {
      stopPlayback();
      display.innerText = 'FINISHED';
    }
  }, totalDuration);

  playbackTimeouts.push(loopTimeout);
}

function stopPlaybackTimeouts() {
  playbackTimeouts.forEach(t => clearTimeout(t));
  playbackTimeouts = [];
}

function stopPlayback() {
  isPlaying = false;
  playBtn.classList.remove('playing');
  playBtn.innerText = '▶ PLAY';
  stopPlaybackTimeouts();
}

// Loop Button Toggle
loopBtn.addEventListener('click', () => {
  isLooping = !isLooping;
  if (isLooping) {
    loopBtn.classList.add('active');
    loopBtn.innerText = '🔁 LOOP: ON';
  } else {
    loopBtn.classList.remove('active');
    loopBtn.innerText = '🔁 LOOP: OFF';
  }
});

recBtn.addEventListener('click', toggleRecording);
playBtn.addEventListener('click', togglePlayback);

clearBtn.addEventListener('click', () => {
  stopPlayback();
  recordedNotes = [];
  display.innerText = 'CLEARED';
});

// Preset Beats Loader
const PRESETS = {
  hiphop: [
    { key: 'Z', time: 0 },
    { key: 'C', time: 250 },
    { key: 'S', time: 500 },
    { key: 'C', time: 750 },
    { key: 'Z', time: 1000 },
    { key: 'Z', time: 1250 },
    { key: 'S', time: 1500 },
    { key: 'C', time: 1750 }
  ],
  house: [
    { key: 'X', time: 0 },
    { key: 'D', time: 250 },
    { key: 'X', time: 500 },
    { key: 'D', time: 750 },
    { key: 'X', time: 1000 },
    { key: 'D', time: 1250 },
    { key: 'X', time: 1500 },
    { key: 'D', time: 1750 }
  ],
  rock: [
    { key: 'X', time: 0 },
    { key: 'Q', time: 250 },
    { key: 'S', time: 500 },
    { key: 'Q', time: 750 },
    { key: 'X', time: 1000 },
    { key: 'Q', time: 1250 },
    { key: 'S', time: 1500 },
    { key: 'Q', time: 1750 }
  ]
};

presetBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (!powerOn) return;
    const presetName = btn.getAttribute('data-preset');
    if (PRESETS[presetName]) {
      recordedNotes = [...PRESETS[presetName]];
      display.innerText = `${presetName.toUpperCase()} BEAT LOADED`;
      stopPlayback();
      startPlayback();
    }
  });
});
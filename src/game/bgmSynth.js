import { midiFrequency } from './bgmScore.js';

const noiseBuffers = new WeakMap();

function noiseBuffer(context) {
  let buffer = noiseBuffers.get(context);
  if (buffer) return buffer;
  buffer = context.createBuffer(1, Math.ceil(context.sampleRate * .24), context.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 0x51a9c3;
  for (let i = 0; i < data.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    data[i] = (seed / 0x80000000 - 1) * (1 - i / data.length * .35);
  }
  noiseBuffers.set(context, buffer);
  return buffer;
}

function envelope(context, destination, when, seconds, peak, release = .055) {
  const gain = context.createGain();
  const amp = gain.gain;
  const end = when + Math.max(.07, seconds);
  amp.setValueAtTime(.0001, when);
  amp.exponentialRampToValueAtTime(Math.max(.0002, peak), when + Math.min(.035, seconds * .22));
  amp.setTargetAtTime(Math.max(.00015, peak * .67), when + Math.min(.08, seconds * .35), .05);
  amp.setValueAtTime(Math.max(.00015, peak * .42), Math.max(when + .04, end - release));
  amp.exponentialRampToValueAtTime(.0001, end);
  gain.connect(destination);
  return gain;
}

function pitched(context, destination, event, when, seconds) {
  const frequency = midiFrequency(event.midi);
  const bell = event.instrument === 'bell';
  const chaos = event.instrument === 'chaos';
  const strings = event.instrument === 'strings';
  const output = envelope(context, destination, when, seconds,
    event.velocity * (bell ? .15 : strings ? .075 : .13), bell ? .19 : .055);
  let target = output;
  if (strings || chaos) {
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(strings ? 1500 : 1950, when);
    filter.Q.value = strings ? .6 : 1.7;
    filter.connect(output);
    target = filter;
  }
  const oscillator = context.createOscillator();
  oscillator.type = strings || chaos ? 'sawtooth'
    : event.instrument === 'bass' ? 'triangle' : bell ? 'sine' : 'triangle';
  oscillator.frequency.setValueAtTime(frequency, when);
  if (chaos) oscillator.detune.setValueAtTime(-11, when);
  oscillator.connect(target);
  oscillator.start(when);
  oscillator.stop(when + Math.max(.07, seconds) + .025);
  if (bell || chaos || event.instrument === 'woodwind') {
    const overtone = context.createOscillator();
    const overtoneGain = context.createGain();
    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(frequency * (bell ? 2.01 : chaos ? 1.515 : 2), when);
    overtoneGain.gain.setValueAtTime(bell ? .36 : chaos ? .12 : .1, when);
    overtone.connect(overtoneGain);
    overtoneGain.connect(target);
    overtone.start(when);
    overtone.stop(when + Math.max(.07, seconds) + .025);
  }
}

function percussion(context, destination, event, when) {
  const kick = event.instrument === 'kick';
  if (kick) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(135, when);
    oscillator.frequency.exponentialRampToValueAtTime(48, when + .16);
    gain.gain.setValueAtTime(.0001, when);
    gain.gain.exponentialRampToValueAtTime(event.velocity * .28, when + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, when + .19);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(when);
    oscillator.stop(when + .2);
    return;
  }
  const hat = event.instrument === 'hat';
  const source = context.createBufferSource();
  source.buffer = noiseBuffer(context);
  const filter = context.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(hat ? 6200 : 1650, when);
  const gain = context.createGain();
  const duration = hat ? .065 : .16;
  gain.gain.setValueAtTime(.0001, when);
  gain.gain.exponentialRampToValueAtTime(event.velocity * (hat ? .24 : .32), when + .004);
  gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start(when);
  source.stop(when + duration + .005);
}

/** Schedule one note against AudioContext.currentTime; duration is in beats. */
export function scheduleBgmEvent(context, destination, event, when, secondsPerBeat) {
  if (!Number.isFinite(when) || !Number.isFinite(secondsPerBeat) || secondsPerBeat <= 0) {
    throw new TypeError('Invalid BGM schedule time');
  }
  const start = Math.max(context.currentTime + .003, when);
  if (event.midi === null) percussion(context, destination, event, start);
  else pitched(context, destination, event, start, event.duration * secondsPerBeat);
}

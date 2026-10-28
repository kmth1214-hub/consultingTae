/** Original, deterministic 32-bar themes. Beats are quarter notes in 4/4. */
const MAJOR = [0, 4, 7], MINOR = [0, 3, 7], DIM = [0, 3, 6];

export const BGM_THEMES = Object.freeze({
  forest: {
    bpm: 112, chords: [50, 46, 53, 48, 50, 43, 46, 45],
    chordIntervals: [MINOR, MAJOR, MAJOR, MAJOR, MINOR, MINOR, MAJOR, MAJOR],
    motif: [0, 3, 7, 5, 3, 0, -2, 0, 7, 10, 7, 5, 3, 5, 7, 3],
    leadInstrument: 'woodwind', leadOffsets: [0, .5, 1.5, 2.5, 3.25],
    arpOffsets: [0, .5, 1, 1.5, 2, 2.5, 3, 3.5], drumAccent: [0, 2.5],
  },
  snow: {
    bpm: 104, chords: [55, 50, 52, 48, 55, 47, 48, 50],
    chordIntervals: [MAJOR, MAJOR, MINOR, MAJOR, MAJOR, MINOR, MAJOR, MAJOR],
    motif: [0, 2, 4, 7, 9, 7, 4, 2, 0, 4, 7, 11, 9, 7, 4, 2],
    leadInstrument: 'bell', leadOffsets: [0, 1, 2, 3],
    arpOffsets: [0, 1, 2, 3], drumAccent: [0],
  },
  city: {
    bpm: 120, chords: [53, 48, 50, 46, 53, 43, 48, 53],
    chordIntervals: [MAJOR, MAJOR, MINOR, MAJOR, MAJOR, MINOR, MAJOR, MAJOR],
    motif: [0, 4, 7, 12, 11, 7, 4, 7, 9, 7, 4, 2, 4, 7, 12, 7],
    leadInstrument: 'woodwind', leadOffsets: [0, .75, 1.5, 2, 3],
    arpOffsets: [0, .5, 1, 1.5, 2, 2.5, 3, 3.5], drumAccent: [0, 2],
  },
  chaos: {
    bpm: 116, chords: [52, 48, 54, 47, 52, 43, 54, 47],
    chordIntervals: [MINOR, MAJOR, DIM, MAJOR, MINOR, MINOR, DIM, MAJOR],
    motif: [0, 1, 6, 7, 3, 2, 8, 6, 0, -1, 5, 6, 11, 8, 2, 1],
    leadInstrument: 'chaos', leadOffsets: [0, .75, 1.25, 2.75, 3.5],
    arpOffsets: [0, .5, 1.25, 2, 2.5, 3.25], drumAccent: [0, 1.75, 3],
  },
});

export function midiFrequency(midi) {
  if (!Number.isInteger(midi)) throw new TypeError('MIDI pitch must be an integer');
  if (midi < 0 || midi > 127) throw new RangeError('MIDI pitch out of range');
  return 440 * 2 ** ((midi - 69) / 12);
}

export function buildBgmScore(area, boss = false) {
  if (typeof area !== 'string' || !Object.hasOwn(BGM_THEMES, area) || typeof boss !== 'boolean') {
    throw new TypeError('Invalid battle music theme');
  }
  const theme = BGM_THEMES[area];
  const events = [];
  const put = (beat, duration, midi, instrument, velocity) => {
    if (beat >= 0 && beat < 128 && duration > 0) events.push({
      beat, duration: Math.min(duration, 128 - beat), midi, instrument, velocity,
    });
  };
  for (let bar = 0; bar < 32; bar++) {
    const start = bar * 4, section = Math.floor(bar / 8);
    const root = theme.chords[bar % 8], triad = theme.chordIntervals[bar % 8];
    const lastBar = bar % 8 === 7;

    // Soft sustained harmony, octave bass and moving string figures establish place.
    triad.forEach((interval, index) => put(start, 3.82, root + 12 + interval,
      'strings', .18 + (index === 0 ? .045 : 0)));
    put(start, 1.7, root - 12, 'bass', .36);
    put(start + 2, 1.55, root - 5, 'bass', .26);
    if (boss) put(start + 2.5, 1.1, root - 12, 'bass', .23);
    theme.arpOffsets.forEach((offset, i) => {
      const interval = triad[(i + section) % 3];
      put(start + offset, Math.min(.42, 4 - offset), root + interval + 12,
        'strings', area === 'snow' ? .11 : .16);
    });

    theme.leadOffsets.forEach((offset, i) => {
      // Phrase endings resolve to the root, while a middle section lifts the tune.
      const motif = lastBar && i === theme.leadOffsets.length - 1 ? 0
        : theme.motif[(bar * theme.leadOffsets.length + i) % theme.motif.length];
      const pitch = root + 12 + motif + (section === 2 && i === 0 ? 12 : 0);
      put(start + offset, Math.min(i === 0 && area === 'snow' ? .9 : .52, 4 - offset),
        pitch, theme.leadInstrument, .31 + (i === 0 ? .08 : 0));
    });
    if (area === 'snow') {
      put(start + 2.5, .88, root + 24 + triad[2], 'woodwind', .18);
    } else if (area === 'city' && bar % 4 === 3) {
      put(start + 3.5, .4, root + 24, 'bell', .17);
    } else if (area === 'chaos' && bar % 2 === 1) {
      put(start + 3.25, .46, root + 13, 'chaos', .17);
    }

    theme.drumAccent.forEach(offset => put(start + offset, .16, null, 'kick',
      area === 'snow' ? .24 : .38));
    if (area !== 'snow' || bar % 2 === 0) {
      put(start + (area === 'chaos' ? 1.5 : 1), .15, null, 'snare', .25);
      put(start + 3, .15, null, 'snare', .22);
    }
    for (let i = 0; i < 8; i++) {
      if (area === 'snow' && i % 2) continue;
      put(start + i * .5, .08, null, 'hat', area === 'snow' ? .09 : .12);
    }
    if (boss) {
      for (let i = 0; i < 16; i++) put(start + i * .25, .055, null, 'hat', .095);
      put(start + 2, .18, null, 'kick', .33);
      put(start + 3.5, .14, null, 'snare', .2);
    }
  }
  events.sort((a, b) => a.beat - b.beat || a.instrument.localeCompare(b.instrument));
  return { area, boss, bpm: theme.bpm, beatsPerBar: 4, bars: 32,
    durationSeconds: 128 * 60 / theme.bpm, events };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { BGM_THEMES, buildBgmScore, midiFrequency } from '../src/game/bgmScore.js';

test('four original battle scores have valid, distinct 60–75 second loops', () => {
  const scores = Object.keys(BGM_THEMES).map(area => buildBgmScore(area));
  assert.equal(scores.length, 4);
  assert.equal(new Set(scores.map(score => score.bpm)).size, 4);
  assert.equal(new Set(scores.map(score => JSON.stringify(score.events
    .filter(event => event.instrument === BGM_THEMES[score.area].leadInstrument)
    .slice(0, 15).map(event => event.midi)))).size, 4);
  for (const score of scores) {
    assert.equal(score.bars, 32);
    assert.equal(score.beatsPerBar, 4);
    assert.ok(score.durationSeconds >= 60 && score.durationSeconds <= 75);
    assert.ok(score.events.length > 500);
    assert.ok(score.events.every((event, index) => event.beat >= 0 && event.beat < 128
      && event.duration > 0 && event.beat + event.duration <= 128
      && event.velocity > 0 && event.velocity <= 1
      && (event.midi === null || Number.isInteger(event.midi))
      && (index === 0 || score.events[index - 1].beat <= event.beat)));
  }
});

test('boss variations retain the melody and harmony while adding percussion', () => {
  for (const area of Object.keys(BGM_THEMES)) {
    const regular = buildBgmScore(area), boss = buildBgmScore(area, true);
    const melodic = score => score.events.filter(event =>
      !['kick', 'snare', 'hat', 'bass'].includes(event.instrument));
    assert.deepEqual(melodic(boss), melodic(regular));
    assert.equal(boss.durationSeconds, regular.durationSeconds);
    assert.ok(boss.events.filter(event => event.instrument === 'hat').length >
      regular.events.filter(event => event.instrument === 'hat').length);
  }
});

test('MIDI conversion and score configuration reject invalid inputs', () => {
  assert.equal(midiFrequency(69), 440);
  assert.throws(() => midiFrequency(128), RangeError);
  assert.throws(() => midiFrequency(69.5), TypeError);
  assert.throws(() => buildBgmScore('unknown'), TypeError);
  assert.throws(() => buildBgmScore('forest', 1), TypeError);
});

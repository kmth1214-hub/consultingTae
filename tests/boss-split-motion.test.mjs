import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleBossSplit } from '../src/game/bossSplitMotion.js';
test('three split arcs share a source, rise above the ground and settle exactly on destinations', () => {
  const source={x:2400,y:900};
  for(let index=0;index<3;index++) {
    const target={x:1000+index*930,y:900};
    assert.deepEqual(sampleBossSplit({source,target,index,progress:0}),source);
    assert.deepEqual(sampleBossSplit({source,target,index,progress:1}),target);
    assert.ok(sampleBossSplit({source,target,index,progress:.5}).y<700);
  }
  assert.throws(()=>sampleBossSplit({source,target:source,index:3,progress:0}),TypeError);
});

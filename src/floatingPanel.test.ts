import test from 'node:test';
import assert from 'node:assert/strict';
import { floatingPanelPosition } from './floatingPanel.ts';
const viewport={left:0,top:0,width:1000,height:700};
test('floating keywords open below their anchor when there is room',()=>{
  assert.deepEqual(floatingPanelPosition({left:200,right:260,top:100,bottom:130},viewport,390,200),{left:200,top:136});
});
test('floating keywords flip above and clamp away from the right and top edges',()=>{
  assert.deepEqual(floatingPanelPosition({left:950,right:990,top:620,bottom:650},viewport,390,200),{left:598,top:414});
  assert.deepEqual(floatingPanelPosition({left:0,right:80,top:20,bottom:50},{...viewport,height:250},390,220),{left:12,top:12});
});
test('floating keywords honor the visual viewport offset',()=>{
  assert.deepEqual(floatingPanelPosition({left:0,right:80,top:20,bottom:50},{left:100,top:150,width:500,height:300},320,180),{left:112,top:162});
});

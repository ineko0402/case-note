import test from 'node:test';
import assert from 'node:assert/strict';
import { mobileEditorHeight } from './editorHeight.ts';

test('short mobile drafts use only their content height, with a one-line minimum', () => {
  assert.equal(mobileEditorHeight(30, 600, 480), 52);
  assert.equal(mobileEditorHeight(80, 600, 480), 80);
});

test('long drafts are capped to keep room for keyword candidates', () => {
  assert.equal(mobileEditorHeight(900, 600, 480), 180);
  assert.equal(mobileEditorHeight(900, 300, 190), 102);
  assert.equal(mobileEditorHeight(900, 250, 200), 90);
});

test('keyboard opening shrinks the cap and deletion shrinks the textarea again', () => {
  assert.equal(mobileEditorHeight(170, 600, 480), 170);
  assert.equal(mobileEditorHeight(170, 300, 190), 102);
  assert.equal(mobileEditorHeight(60, 300, 190), 60);
  assert.equal(mobileEditorHeight(170, 120, 20), 52);
});

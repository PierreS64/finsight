import assert from 'node:assert/strict';
import { receiptFrameCrop } from '../src/receiptCrop.ts';

assert.deepEqual(
  receiptFrameCrop({ width: 1080, height: 1920 }, { width: 360, height: 640 }, { x: 50, y: 100, width: 260, height: 400 }),
  { originX: 150, originY: 300, width: 780, height: 1200 },
);

// A 4:3 photo is wider than a portrait preview; the hidden sides must be removed first.
assert.deepEqual(
  receiptFrameCrop({ width: 4000, height: 3000 }, { width: 360, height: 640 }, { x: 30, y: 100, width: 300, height: 400 }),
  { originX: 1296, originY: 468, width: 1408, height: 1876 },
);

assert.throws(
  () => receiptFrameCrop({ width: 1080, height: 1920 }, { width: 360, height: 640 }, { x: 30, y: 100, width: 400, height: 400 }),
  /khung chụp/,
);

console.log('Receipt frame crop geometry: 3 cases passed');

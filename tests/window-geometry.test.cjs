const test = require('node:test');
const assert = require('node:assert/strict');
const { fitWindowToWorkArea } = require('../dist/window-geometry.js');

const cases = [
  ['large display', { x: 100, y: 50, width: 2560, height: 1440 }, { x: 542, y: 208, width: 1676, height: 1124, minWidth: 800, minHeight: 620 }],
  ['smaller display', { x: 0, y: 25, width: 1366, height: 743 }, { x: 0, y: 25, width: 1366, height: 743, minWidth: 800, minHeight: 620 }],
  ['only height needs fitting', { x: 20, y: 40, width: 2000, height: 900 }, { x: 182, y: 40, width: 1676, height: 900, minWidth: 800, minHeight: 620 }],
  ['only width needs fitting', { x: 50, y: -20, width: 1200, height: 1300 }, { x: 50, y: 68, width: 1200, height: 1124, minWidth: 800, minHeight: 620 }],
  ['tiny valid work area', { x: 0, y: 0, width: 640, height: 480 }, { x: 0, y: 0, width: 640, height: 480, minWidth: 640, minHeight: 480 }],
  ['exact target fit', { x: 40, y: 30, width: 1676, height: 1124 }, { x: 40, y: 30, width: 1676, height: 1124, minWidth: 800, minHeight: 620 }],
  ['negative display origin', { x: -1920, y: -100, width: 1920, height: 1080 }, { x: -1798, y: -100, width: 1676, height: 1080, minWidth: 800, minHeight: 620 }],
  ['high DPI display work area expressed in DIP', { x: 0, y: 30, width: 1512, height: 952 }, { x: 0, y: 30, width: 1512, height: 952, minWidth: 800, minHeight: 620 }],
];

for (const [name, workArea, expected] of cases) {
  test(name, () => {
    const geometry = fitWindowToWorkArea(workArea);
    assert.deepEqual(geometry, expected);
    assert.ok(Object.values(geometry).every(Number.isSafeInteger));
    assert.ok(geometry.width >= geometry.minWidth && geometry.height >= geometry.minHeight);
    assert.ok(geometry.x >= workArea.x && geometry.y >= workArea.y);
    assert.ok(geometry.x + geometry.width <= workArea.x + workArea.width);
    assert.ok(geometry.y + geometry.height <= workArea.y + workArea.height);
  });
}

test('invalid work areas are rejected', () => {
  assert.throws(() => fitWindowToWorkArea({ x: 0, y: 0, width: Infinity, height: 900 }), RangeError);
  assert.throws(() => fitWindowToWorkArea({ x: 0, y: 0, width: 0, height: 900 }), RangeError);
});

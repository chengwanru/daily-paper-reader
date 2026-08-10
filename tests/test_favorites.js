const assert = require('node:assert/strict');
const path = require('node:path');

const store = new Map();
const localStorageMock = {
  getItem(key) {
    return store.has(key) ? store.get(key) : null;
  },
  setItem(key, value) {
    store.set(String(key), String(value));
  },
  removeItem(key) {
    store.delete(String(key));
  },
  clear() {
    store.clear();
  },
};

globalThis.localStorage = localStorageMock;
globalThis.document = {
  dispatchEvent() {},
  createElement() {
    return {
      classList: { add() {}, remove() {}, toggle() {} },
      style: {},
      appendChild() {},
    };
  },
  body: { appendChild() {} },
  getElementById() {
    return null;
  },
  querySelector() {
    return null;
  },
};

const favoritesPath = path.resolve(__dirname, '../app/favorites.js');
Object.keys(require.cache || {}).forEach((key) => {
  if (String(key).includes(`${path.sep}favorites.js`)) {
    delete require.cache[key];
  }
});
const favorites = require(favoritesPath);

function reset() {
  store.clear();
}

function testNormalizeAndAdd() {
  reset();
  const added = favorites.addFavorite('#/20260301/demo-paper', {
    title: 'Demo Paper',
    titleZh: '示例论文',
  });
  assert.equal(added.ok, true);
  assert.equal(added.existed, false);
  assert.equal(favorites.isFavorite('20260301/demo-paper'), true);
  const list = favorites.listFavorites();
  assert.equal(list.length, 1);
  assert.equal(list[0].id, '20260301/demo-paper');
  assert.equal(list[0].title, 'Demo Paper');
  assert.equal(list[0].titleZh, '示例论文');
}

function testIdempotentAddKeepsOriginalTimestamp() {
  reset();
  favorites.addFavorite('a/b', { title: 'First' });
  const first = favorites.listFavorites()[0].addedAt;
  const again = favorites.addFavorite('a/b', { title: 'Second' });
  assert.equal(again.existed, true);
  assert.equal(favorites.listFavorites()[0].addedAt, first);
  assert.equal(favorites.listFavorites()[0].title, 'Second');
}

function testRemoveAndToggle() {
  reset();
  favorites.addFavorite('x/y', { title: 'X' });
  assert.equal(favorites.removeFavorite('x/y'), true);
  assert.equal(favorites.isFavorite('x/y'), false);
  const toggledOn = favorites.toggleFavorite('x/y', { title: 'X' });
  assert.equal(toggledOn.favorited, true);
  const toggledOff = favorites.toggleFavorite('x/y');
  assert.equal(toggledOff.favorited, false);
}

function testTripleSpaceDetector() {
  const detector = favorites.createTripleSpaceDetector({ windowMs: 1000 });
  assert.equal(detector.onSpace(), 'single');
  assert.equal(detector.onSpace(), 'single');
  assert.equal(detector.onSpace(), 'triple');
  assert.equal(detector.onSpace(), 'single');
}

function testTripleSpaceDetectorResetsAfterGap() {
  let now = 1000;
  const detector = favorites.createTripleSpaceDetector({
    windowMs: 100,
    now: () => now,
  });
  assert.equal(detector.onSpace(), 'single');
  now += 20;
  assert.equal(detector.onSpace(), 'single');
  now += 150;
  assert.equal(detector.onSpace(), 'single');
}

reset();
testNormalizeAndAdd();
testIdempotentAddKeepsOriginalTimestamp();
testRemoveAndToggle();
testTripleSpaceDetector();
testTripleSpaceDetectorResetsAfterGap();
console.log('favorites tests passed');

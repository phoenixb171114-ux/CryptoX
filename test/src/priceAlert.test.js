"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluateAlerts } = require("./priceAlert");

test("fires an 'above' alert only when strictly greater than threshold", () => {
  const alerts = [{ id: "a1", symbol: "BTC", direction: "above", threshold: 30000 }];
  assert.deepEqual(evaluateAlerts(alerts, { BTC: 30001 }), ["a1"]);
  // Exactly at threshold must NOT fire.
  assert.deepEqual(evaluateAlerts(alerts, { BTC: 30000 }), []);
});

test("fires a 'below' alert only when strictly less than threshold", () => {
  const alerts = [{ id: "b1", symbol: "ETH", direction: "below", threshold: 2000 }];
  assert.deepEqual(evaluateAlerts(alerts, { ETH: 1999 }), ["b1"]);
  assert.deepEqual(evaluateAlerts(alerts, { ETH: 2000 }), []);
});

test("ignores alerts for symbols with no known price", () => {
  const alerts = [{ id: "x1", symbol: "DOGE", direction: "above", threshold: 1 }];
  assert.deepEqual(evaluateAlerts(alerts, {}), []);
});

test("does not mutate the caller's alerts array order", () => {
  const alerts = [
    { id: "hi", symbol: "BTC", direction: "above", threshold: 90000 },
    { id: "lo", symbol: "BTC", direction: "above", threshold: 10 },
  ];
  const snapshot = alerts.map((a) => a.id);
  evaluateAlerts(alerts, { BTC: 50000 });
  assert.deepEqual(
    alerts.map((a) => a.id),
    snapshot,
    "input array order should be preserved"
  );
});

test("returns firing ids in the original input order", () => {
  const alerts = [
    { id: "first", symbol: "BTC", direction: "above", threshold: 10 },
    { id: "second", symbol: "ETH", direction: "below", threshold: 5000 },
  ];
  assert.deepEqual(evaluateAlerts(alerts, { BTC: 20, ETH: 100 }), ["first", "second"]);
});

"use strict";

/**
 * Decide which price alerts should fire.
 *
 * @param {Array<{id: string, symbol: string, direction: "above"|"below", threshold: number}>} alerts
 * @param {Record<string, number>} prices  Map of symbol -> latest price.
 * @returns {string[]} ids of alerts that should fire, in input order.
 *
 * An alert fires when:
 *   - direction "above": the latest price is strictly greater than threshold
 *   - direction "below": the latest price is strictly less than threshold
 * Alerts for symbols with no known price never fire.
 */
function evaluateAlerts(alerts, prices) {
  const firing = [];

  // BUG 1: this mutates the caller's array (should not reorder their input).
  alerts.sort((a, b) => a.threshold - b.threshold);

  for (let i = 0; i <= alerts.length; i++) {
    const alert = alerts[i];
    const price = prices[alert.symbol];

    // BUG 2: a missing price is `undefined`; comparisons below would be wrong.
    // (No guard here.)

    if (alert.direction === "above") {
      // BUG 3: should be strictly greater-than, not >=.
      if (price >= alert.threshold) {
        firing.push(alert.id);
      }
    } else if (alert.direction === "below") {
      if (price < alert.threshold) {
        firing.push(alert.id);
      }
    }
    // NOTE (task 2): no handling for an unknown `direction`.
  }

  return firing;
}

module.exports = { evaluateAlerts };

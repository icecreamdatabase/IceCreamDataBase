"use strict"
const sqlPool = require('../Sql').pool

module.exports = class SqlCounters {
  constructor () {
  }

  /**
   * Get the value of a counter
   * @param counterID
   * @returns {Promise<number>}
   */
  static async getCounter (counterID) {
    let results = await sqlPool.query(`
        SELECT count
        FROM counters
        WHERE counterID = ?
        ;`, [counterID])

    return results.length > 0 ? results[0].count : 0
  }

  /**
   * Set the value of a counter
   * @param counterID
   * @param amount
   */
  static increaseCounter (counterID, amount = 1) {
    sqlPool.query(`
        INSERT INTO counters (counterID, count)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE count = count + VALUES(count);
        ;`, [counterID, amount])
  }
}

"use strict"
const sqlPool = require('../Sql').pool
const util = require('util')
const DiscordLog = require('../../../classes/modules/DiscordLog')

module.exports = class SqlCounters {
  constructor () {
  }

  static async getCounter (counterID) {
    let results = await sqlPool.query(`
        SELECT count
        FROM counters
        WHERE counterID = ?
      ;`, [counterID])

    return results.length > 0 ? results[0].count : 0
  }

  static increaseCounter (counterID, amount = 1) {
    sqlPool.query(`
      INSERT INTO counters (counterID, count)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE
          count = count + VALUES(count);
      ;`, [counterID, amount])
  }
}

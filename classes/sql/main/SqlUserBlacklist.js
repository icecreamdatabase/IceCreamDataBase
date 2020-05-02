"use strict"
const sqlPool = require('../Sql').pool

module.exports = class SqlUserBlacklist {
  constructor () {
  }

  /**
   * Get a list of blacklisted userIDs
   * @returns {Promise<[number]>}
   */
  static async getUserIds () {
    let results = await sqlPool.query(`
        SELECT userId
        FROM userBlacklist
        ;`)

    return results.map(x=> x["userId"])
  }

  /**
   * Add userID to blacklist.
   * @param userId
   */
  static addUserId (userId) {
    sqlPool.query(`
        INSERT INTO  userBlacklist (userId)
        VALUES (?)
        ON DUPLICATE KEY UPDATE addDate = DEFAULT;
        ;`, [userId])
  }
}

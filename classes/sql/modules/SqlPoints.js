"use strict"
const sqlPool = require('../Sql').pool
const util = require('util')
const DiscordLog = require('../../../classes/modules/DiscordLog')

module.exports = class SqlPoints {
  constructor () {
  }

  static async getTopPoints (channelID, amount) {
    let results = await sqlPool.query(`
        SELECT userID, balance
        FROM pointsWallet
        WHERE channelID = ?
        ORDER BY balance desc
        LIMIT ?;
      ;`, [channelID, amount])

    return results
  }

  static setPoints (userID, channelID, points) {
    sqlPool.query(`
      INSERT INTO pointsWallet (userID, channelID, balance)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
          balance = VALUES(balance);
      ;`, [userID, channelID, points, points])
  }

  //https://stackoverflow.com/questions/8899802/how-do-i-do-a-bulk-insert-in-mysql-using-node-js
  static addPointsBulk (queryParams) {
    sqlPool.query(`
      INSERT INTO pointsWallet (userID, channelID, balance)
      VALUES ?
      ON DUPLICATE KEY UPDATE
          balance = balance + VALUES(balance)
      ;`, [queryParams])
  }

  static addPoints (userID, channelID, points) {
    sqlPool.query(`
      INSERT INTO pointsWallet (userID, channelID, balance)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
          balance = balance + VALUES(balance);
      ;`, [userID, channelID, points])
  }

  static async getPoints (userID, channelID) {
    let results = await sqlPool.query(`
        SELECT balance
        FROM pointsWallet
        WHERE userID = ?
        AND channelID = ?
        ;`, [userID, channelID])

    return results[0].balance || 0
  }

  //https://dba.stackexchange.com/questions/13703/get-the-rank-of-a-user-in-a-score-table
  static async getUserInfo (userID, channelID) {
    let results = await sqlPool.query(`

        SELECT
            balance,
            1+(SELECT count(*) from pointsWallet a WHERE a.balance > b.balance) as 'rank',
            (SELECT count(*) FROM pointsWallet b where b.channelID = ?) AS 'total'
        FROM pointsWallet b
        WHERE b.channelID = ?
          AND b.userID = ?
        UNION ALL
        SELECT DISTINCT 0 AS balance,
                        (SELECT count(*) FROM pointsWallet) AS 'rank',
                        (SELECT count(*) FROM pointsWallet) AS 'total'
        FROM pointsWallet
        WHERE NOT EXISTS ( SELECT 1
                           FROM pointsWallet e
                           WHERE e.userID = ?
            )
        ORDER BY rank;
        ;`, [channelID, channelID, userID, userID])

    return {balance: results[0].balance || 0, rank: results[0].rank || -1, total: results[0].total || -1}
  }

  static async getPointsSettings () {
    let results = await sqlPool.query(`
        SELECT channelID,
               intervalTime,
               intervalPoints,
               activityReqMsgPerInterval,
               activityMaxPoints,
               usernoticeSubPoints,
               usernoticeGiftPoints
        FROM pointsSettings
        WHERE enabled = b'1'
        ;`)
    let returnObj = {}
    results.forEach(x => {
      returnObj[x.channelID] = x
    })
    return returnObj
  }
}

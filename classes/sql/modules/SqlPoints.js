"use strict"
const sqlPool = require('../Sql').pool
const util = require('util')
const DiscordLog = require('../../../classes/modules/DiscordLog')

module.exports = class SqlPoints {
  constructor () {
  }

  static setPoints (userID, channelID, points) {
    sqlPool.query(`
      INSERT INTO pointsWallet (userID, channelID, balance)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
          balance = balance + VALUES(balance);
      ;`, userID, channelID, points, points)
  }

  //TODO check this
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
          balance = VALUES(balance);
      ;`, [userID, channelID, points])
  }

  static async getPoints (userID, channelID) {
    let results = await sqlPool.query(`
        SELECT balance
        FROM pointsWallet
        WHERE userID = ?
        AND channelID = ?
        ;`, [userID, channelID])

    return results[0].balance|| 0
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

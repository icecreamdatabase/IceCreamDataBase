"use strict"
const sqlPool = require('../Sql').pool
const util = require('util')

module.exports = class SqlPoints {
  constructor () {
  }

  static setPoints (userID, channelID, points) {
    sqlPool.query(`
      INSERT INTO pointsWallet (userID, channelID, balance)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
          balance = balance + ?;
      ;`, userID, channelID, points, points)
  }

  static addPoints (userID, channelID, points) {
    sqlPool.query(`
      INSERT INTO pointsWallet (userID, channelID, balance)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
          balance = ?;
      ;`, userID, channelID, points, points)
  }

  static async getPoints (userID, channelID) {
    let results = await sqlPool.query(`
        SELECT balance
        FROM pointsWallet
        WHERE userID = ?
        AND channelID = ?
        ;`, userID, channelID)

    return results.balance || 0
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

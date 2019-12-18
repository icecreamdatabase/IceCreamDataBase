"use strict"
const sqlPool = require('../Sql').pool

module.exports = class SqlChannelPoints {
  constructor () {

  }

  static async getChannelPointsSettings (botId) {
    let results = await sqlPool.query(`SELECT channelID, ttsBrianCustomRewardId, ttsJustinCustomRewardId, ttsCooldown
    FROM channelPointsSettings
    WHERE enabled = B'1'
    AND botID = ?
    ;`, botId)

    let returnObj = {}
    results.forEach(x => {
      returnObj[x.channelID] = x
    })
    return returnObj
  }
}

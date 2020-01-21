"use strict"
const sqlPool = require('../Sql').pool

module.exports = class SqlChannelPoints {
  constructor () {

  }

  static async addChannel (botID, channelID, ttsConversation = false, ttsCustomRewardId) {
    await sqlPool.query(`INSERT INTO channelPointsSettings(botID, channelID, enabled, ttsConversation, ttsCustomRewardId) 
    VALUES (?,?,b'1',?,?) 
    ON DUPLICATE KEY UPDATE 
    enabled = enabled,
    ttsConversation = ttsConversation,
    ttsCustomRewardId = ttsCustomRewardId`,
      [botID, channelID, ttsConversation, ttsCustomRewardId])
  }

  static async getChannelPointsSettings (botId) {
    let results = await sqlPool.query(`SELECT channelID, ttsConversation, ttsCustomRewardId, ttsDefaultVoiceName, ttsCooldown, ttsUserLevel, ttsTimeoutCheckTime, ttsAcceptMessage, ttsRejectCooldownMessage, ttsRejectUserLevelMessage, ttsRejectTimeoutMessage
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

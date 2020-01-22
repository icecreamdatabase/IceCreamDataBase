"use strict"
const sqlPool = require('../Sql').pool

module.exports = class SqlChannelPoints {
  constructor () {

  }

  static async setSettingConversation (botID, channelID, conversation = false) {
    await sqlPool.query(`UPDATE IGNORE channelPointsSettings
    SET ttsConversation = ?
    WHERE botID = ?
    AND channelID = ?
    ;`, [conversation, botID, channelID])
  }

  static async setSettingUserLevelSubonly (botID, channelID, subonly = false) {
    await sqlPool.query(`UPDATE IGNORE channelPointsSettings 
    SET ttsUserLevel = ?
    WHERE botID = ?
    AND channelID = ?
    ;`, [subonly ? 1 : 0, botID, channelID])
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

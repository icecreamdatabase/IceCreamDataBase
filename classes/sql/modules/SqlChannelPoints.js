"use strict"
const sqlPool = require('../Sql').pool

module.exports = class SqlChannelPoints {
  constructor () {

  }

  /**
   * Update the ttsConversation setting for a volume
   * @param botID
   * @param channelID
   * @param volume
   * @returns {Promise<void>}
   */
  static async setSettingVolume (botID, channelID, volume = 100) {
    await sqlPool.query(`UPDATE IGNORE channelPointsSettings
    SET ttsVolume = ?
    WHERE botID = ?
    AND channelID = ?
    ;`, [volume, botID, channelID])
  }

  /**
   * Update the ttsQueueMessages setting for a connection
   * @param botID
   * @param channelID
   * @param queue
   * @returns {Promise<void>}
   */
  static async setSettingQueueMessages (botID, channelID, queue = false) {
    await sqlPool.query(`UPDATE IGNORE channelPointsSettings 
    SET ttsQueueMessages = ?
    WHERE botID = ?
    AND channelID = ?
    ;`, [queue, botID, channelID])
  }

  /**
   * Update the ttsConversation setting for a connection
   * @param botID
   * @param channelID
   * @param conversation
   * @returns {Promise<void>}
   */
  static async setSettingConversation (botID, channelID, conversation = false) {
    await sqlPool.query(`UPDATE IGNORE channelPointsSettings
    SET ttsConversation = ?
    WHERE botID = ?
    AND channelID = ?
    ;`, [conversation, botID, channelID])
  }

  /**
   * Update the ttsDefaultVoiceName setting for a connection
   * @param botID
   * @param channelID
   * @param voice
   * @returns {Promise<void>}
   */
  static async setSettingDefaultVoice (botID, channelID, voice = "Brian") {
    await sqlPool.query(`UPDATE IGNORE channelPointsSettings
    SET ttsDefaultVoiceName = ?
    WHERE botID = ?
    AND channelID = ?
    ;`, [conversation, botID, channelID])
  }

  /**
   * Update the ttsUserLevel setting for a connection
   * subonly === true: ttsUserLevel = 1
   * subonly === false: ttsUserLevel = 0
   * @param botID
   * @param channelID
   * @param subonly
   * @returns {Promise<void>}
   */
  static async setSettingUserLevelSubonly (botID, channelID, subonly = false) {
    await sqlPool.query(`UPDATE IGNORE channelPointsSettings 
    SET ttsUserLevel = ?
    WHERE botID = ?
    AND channelID = ?
    ;`, [subonly ? 1 : 0, botID, channelID])
  }

  /**
   * Add or update channelPointsSettings for a connection
   * @param botID
   * @param channelID
   * @param ttsCustomRewardId
   * @param ttsConversation
   * @param ttsQueueMessages
   * @returns {Promise<void>}
   */
  static async addChannel (botID, channelID, ttsCustomRewardId, ttsConversation = true, ttsQueueMessages = true) {
    await sqlPool.query(`INSERT INTO channelPointsSettings(botID, channelID, enabled, ttsConversation, ttsQueueMessages, ttsCustomRewardId) 
    VALUES (?,?,b'1',?,?,?) 
    ON DUPLICATE KEY UPDATE 
    enabled = enabled,
    ttsConversation = ttsConversation,
    ttsQueueMessages = ttsQueueMessages,
    ttsCustomRewardId = ttsCustomRewardId`,
      [botID, channelID, ttsConversation, ttsQueueMessages, ttsCustomRewardId])
  }

  /**
   * Return all channelPointsSettings for a bot
   * @param botId
   * @returns {Promise<{channelID, ttsConversation, ttsVolume, ttsCustomRewardId, ttsDefaultVoiceName, ttsCooldown, ttsUserLevel, ttsTimeoutCheckTime, ttsAcceptMessage, ttsRejectCooldownMessage, ttsRejectUserLevelMessage, ttsRejectTimeoutMessage}[]>}
   */
  static async getChannelPointsSettings (botId) {
    let results = await sqlPool.query(`SELECT channelID, ttsConversation, ttsVolume, ttsCustomRewardId, ttsDefaultVoiceName, ttsQueueMessages, ttsCooldown, ttsUserLevel, ttsTimeoutCheckTime, ttsAcceptMessage, ttsRejectCooldownMessage, ttsRejectUserLevelMessage, ttsRejectTimeoutMessage
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

  /**
   * Completely remove a bot from a channel.
   * @param botID
   * @param channelID
   * @returns {Promise<void>}
   */
  static async dropChannel (botID, channelID) {
    await sqlPool.query(`DELETE FROM channelPointsSettings
    WHERE botID = ?
    AND channelID = ?;
    ;`, [botID, channelID])
    await sqlPool.query(`DELETE FROM connections
    WHERE botId = ?
    AND channelID = ?
    ;`, [botID, channelID])
  }
}

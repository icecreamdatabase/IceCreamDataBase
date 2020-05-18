"use strict"
const sqlPool = require('../Sql').pool

module.exports = class SqlChannelPoints {
  constructor () {

  }

  /**
   * Log a TTS message
   * @returns {Promise<void>}
   * @param messageId
   * @param roomId
   * @param userId
   * @param rawMessage
   * @param userLevel
   * @param wasSent
   */
  static async ttsLog (messageId, roomId, userId, rawMessage, userLevel, wasSent) {
    await sqlPool.query(`INSERT INTO ttsLog (messageId, roomId, userId, rawMessage, userLevel, wasSent)
                         VALUES (?, ?, ?, ?, ?, ?)
    ;`, [messageId, roomId, userId, rawMessage, userLevel, wasSent])
  }

  /**
   * Update the ttsCooldown setting for a connection
   * @param botID
   * @param channelID
   * @param ttsMaxMessageTime default 0
   * @returns {Promise<void>}
   */
  static async setSettingMaxMessageTime (botID, channelID, ttsMaxMessageTime = 0) {
    await sqlPool.query(`UPDATE IGNORE channelPointsSettings
                         SET ttsMaxMessageTime = ?
                         WHERE botID = ?
                           AND channelID = ?
    ;`, [ttsMaxMessageTime, botID, channelID])
  }

  /**
   * Update the ttsCooldown setting for a connection
   * @param botID
   * @param channelID
   * @param ttsCooldown default 0
   * @returns {Promise<void>}
   */
  static async setSettingCooldown (botID, channelID, ttsCooldown = 0) {
    await sqlPool.query(`UPDATE IGNORE channelPointsSettings
                         SET ttsCooldown = ?
                         WHERE botID = ?
                           AND channelID = ?
    ;`, [ttsCooldown, botID, channelID])
  }

  /**
   * Update the ttsTimeoutCheckTime setting for a connection
   * @param botID
   * @param channelID
   * @param ttsTimeoutCheckTime default 2 seconds
   * @returns {Promise<void>}
   */
  static async setSettingTimeoutcheckTime (botID, channelID, ttsTimeoutCheckTime = 2) {
    await sqlPool.query(`UPDATE IGNORE channelPointsSettings
                         SET ttsTimeoutCheckTime = ?
                         WHERE botID = ?
                           AND channelID = ?
    ;`, [ttsTimeoutCheckTime, botID, channelID])
  }

  /**
   * Update the ttsConversation setting for a connection
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
   * Update the ttsAllowCustomPlaybackrate setting for a connection
   * @param botID
   * @param channelID
   * @param allowCustomPlaybackrate
   * @returns {Promise<void>}
   */
  static async setSettingAllowCustomPlaybackrate (botID, channelID, allowCustomPlaybackrate = false) {
    await sqlPool.query(`UPDATE IGNORE channelPointsSettings
                         SET ttsAllowCustomPlaybackrate = ?
                         WHERE botID = ?
                           AND channelID = ?
    ;`, [allowCustomPlaybackrate, botID, channelID])
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
    ;`, [voice, botID, channelID])
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
   * @returns {Promise<void>}
   */
  static async addChannel (botID, channelID, ttsCustomRewardId) {
    await sqlPool.query(`INSERT INTO channelPointsSettings(botID, channelID, enabled, ttsCustomRewardId)
                         VALUES (?, ?, b'1', ?)
                         ON DUPLICATE KEY UPDATE enabled           = enabled,
                                                 ttsCustomRewardId = ?`,
      [botID, channelID, ttsCustomRewardId, ttsCustomRewardId])
  }

  /**
   * Return all channelPointsSettings for a bot
   * @param botId
   * @returns {Promise<{channelID, ttsConversation, ttsVolume, ttsCustomRewardId, ttsDefaultVoiceName, ttsCooldown, ttsUserLevel, ttsTimeoutCheckTime, ttsAllowCustomPlaybackrate, ttsAcceptMessage, ttsRejectCooldownMessage, ttsRejectUserLevelMessage, ttsRejectTimeoutMessage}[]>}
   */
  static async getChannelPointsSettings (botId) {
    let results = await sqlPool.query(`SELECT channelID,
                                              ttsConversation,
                                              ttsVolume,
                                              ttsCustomRewardId,
                                              ttsDefaultVoiceName,
                                              ttsQueueMessages,
                                              ttsMaxMessageTime,
                                              ttsCooldown,
                                              ttsUserLevel,
                                              ttsTimeoutCheckTime,
                                              ttsAllowCustomPlaybackrate,
                                              ttsAcceptMessage,
                                              ttsRejectCooldownMessage,
                                              ttsRejectUserLevelMessage,
                                              ttsRejectTimeoutMessage
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
    await sqlPool.query(`DELETE
                         FROM channelPointsSettings
                         WHERE botID = ?
                           AND channelID = ?;
    ;`, [botID, channelID])
    await sqlPool.query(`DELETE
                         FROM connections
                         WHERE botId = ?
                           AND channelID = ?
    ;`, [botID, channelID])
  }
}

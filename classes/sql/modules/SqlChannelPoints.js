"use strict"
const sqlPool = require('../Sql').pool
const ttsStrings = require("../../../json/tts-strings")

class SqlChannelPoints {
  /**
   *
   * @typedef {Object} ttsJson
   * @property {boolean} conversation
   * @property {boolean} queueMessages
   * @property {number} volume
   * @property {string} defaultVoiceName
   * @property {number} maxMessageTime
   * @property {number} cooldown
   * @property {number} subOnly
   * @property {number} timeoutCheckTime
   * @property {boolean} allowCustomPlaybackrate
   */

  /**
   * keys are customRewardIds
   * objects are response strings
   *
   * @typedef {Object} commandJson
   * @property {boolean} allowCommandNewLines
   * @property {{string}[]} commands
   */

  /**
   *
   * @param {number} botId
   * @param {number} channelId
   * @param {ttsJson} ttsJson
   * @param {commandJson} commandJson
   * @param {string} ttsCustomRewardId
   * @param allowCommandNewLines
   * @param listenOnPubSub
   */
  constructor (botId, channelId, ttsJson, commandJson, ttsCustomRewardId, allowCommandNewLines, listenOnPubSub) {
    this._botId = botId
    this._channelId = channelId
    this._ttsJson = ttsJson
    this._commandJson = commandJson
    this._customRewardId = ttsCustomRewardId
    this._allowCommandNewLines = allowCommandNewLines
    this._listenOnPubSub = listenOnPubSub
    this._muted = false
  }

  get channelId () {
    return this._channelId
  }

  update () {
    SqlChannelPoints.updateChannelPointsTtsJson(this._botId, this._channelId, this._ttsJson).then()
  }

  get ttsCustomRewardId () {
    return this._customRewardId
  }

  set ttsCustomRewardId (value) {
    this._customRewardId = value
    //TODO: sync with DB
  }

  get allowCommandNewLines () {
    return this._allowCommandNewLines
  }

  set allowCommandNewLines (value) {
    this._allowCommandNewLines = value
    //TODO: sync with DB
  }

  get listenOnPubSub () {
    return this._listenOnPubSub
  }

  set listenOnPubSub (value) {
    this._listenOnPubSub = value
    //TODO: sync with DB
  }

  /**
   * @return {boolean}
   */
  get muted () {
    return this._muted
  }

  /**
   * @param {boolean} value
   */
  set muted (value) {
    this._muted = value
    //TODO: sync with DB
  }

  /**
   *
   * @param {string} customRewardId
   * @param {string} response
   */
  addCommand (customRewardId, response) {
    this._commandJson[customRewardId] = response
    SqlChannelPoints.updateChannelPointsCommandJson(this._botId, this._channelId, this._commandJson).then()
  }

  /**
   *
   * @param {string} customRewardId
   * @return {string|null}
   */
  getCommand (customRewardId) {
    return Object.prototype.hasOwnProperty.call(this._commandJson, customRewardId)
      ? this._commandJson[customRewardId]
      : null
  }


  get conversation () {
    return this._ttsJson.conversation !== undefined
      ? this._ttsJson.conversation
      : ttsStrings.options.handleSettings.options.handleSettingConversation.default
  }

  set conversation (value) {
    this._ttsJson.conversation = value
    this.update()
  }

  /**
   *
   * @return {boolean}
   */
  get queue () {
    return this._ttsJson.queueMessages !== undefined
      ? this._ttsJson.queueMessages
      : ttsStrings.options.handleSettings.options.handleSettingQueue.default
  }

  set queue (value) {
    this._ttsJson.queueMessages = value
    this.update()
  }

  /**
   *
   * @return {number}
   */
  get volume () {
    return this._ttsJson.volume !== undefined
      ? this._ttsJson.volume
      : ttsStrings.options.handleSettings.options.handleSettingVolume.default
  }

  set volume (value) {
    this._ttsJson.volume = value
    this.update()
  }

  /**
   *
   * @return {string}
   */
  get defaultVoiceName () {
    return this._ttsJson.defaultVoiceName !== undefined
      ? this._ttsJson.defaultVoiceName
      : ttsStrings.options.handleSettings.options.handleSettingVoice.default
  }

  set defaultVoiceName (value) {
    this._ttsJson.defaultVoiceName = value
    this.update()
  }

  /**
   *
   * @return {number}
   */
  get cooldown () {
    return this._ttsJson.cooldown !== undefined
      ? this._ttsJson.cooldown
      : ttsStrings.options.handleSettings.options.handleSettingCooldown.default
  }

  set cooldown (value) {
    this._ttsJson.cooldown = value
    this.update()
  }

  /**
   *
   * @return {boolean}
   */
  get subOnly () {
    return this._ttsJson.subOnly !== undefined
      ? this._ttsJson.subOnly
      : ttsStrings.options.handleSettings.options.handleSettingSubscriber.default
  }

  set subOnly (value) {
    this._ttsJson.subOnly = value
    this.update()
  }

  /**
   *
   * @return {number}
   */
  get timeoutCheckTime () {
    return this._ttsJson.timeoutCheckTime !== undefined
      ? this._ttsJson.timeoutCheckTime
      : ttsStrings.options.handleSettings.options.handleSettingTimeoutCheckTime.default
  }

  set timeoutCheckTime (value) {
    this._ttsJson.timeoutCheckTime = value
    this.update()
  }

  /**
   *
   * @return {number}
   */
  get maxMessageTime () {
    return this._ttsJson.maxMessageTime !== undefined
      ? this._ttsJson.maxMessageTime
      : ttsStrings.options.handleSettings.options.handleSettingMaxMessageTime.default
  }

  set maxMessageTime (value) {
    this._ttsJson.maxMessageTime = value
    this.update()
  }

  /**
   *
   * @return {boolean}
   */
  get allowCustomPlaybackrate () {
    return this._ttsJson.allowCustomPlaybackrate !== undefined
      ? this._ttsJson.allowCustomPlaybackrate
      : ttsStrings.options.handleSettings.options.handleSettingAllowCustomPlaybackrate.default
  }

  set allowCustomPlaybackrate (value) {
    this._ttsJson.allowCustomPlaybackrate = value
    this.update()
  }


  /**
   *
   * @param botId
   * @returns {Promise<SqlChannelPoints[]>}
   */
  static async getChannelPointsSettings (botId) {
    let results = await sqlPool.query(`SELECT channelID,
                                              ttsCustomRewardId,
                                              ttsJson,
                                              commandJson,
                                              allowCommandNewLines,
                                              listenOnPubSub
                                       FROM channelPointsSettings
                                       WHERE enabled = B'1'
                                         AND botID = ?
    ;`, botId)

    let returnObj = {}
    results.forEach(x => {
      returnObj[x.channelID] = new SqlChannelPoints(botId,
        x.channelID,
        JSON.parse(x.ttsJson),
        JSON.parse(x.commandJson),
        x.ttsCustomRewardId,
        x.allowCommandNewLines,
        x.listenOnPubSub)
    })
    return returnObj
  }

  static async updateChannelPointsTtsJson (botId, channelId, ttsJson) {
    await sqlPool.query(`UPDATE channelPointsSettings
                         SET ttsJson = ?
                         WHERE botID = ?
                           AND channelID = ?
    ;`, [JSON.stringify(ttsJson), botId, channelId])
  }

  static async updateChannelPointsCommandJson (botId, channelId, commandJson) {
    await sqlPool.query(`UPDATE IGNORE channelPointsSettings
                         SET commandJson = ?
                         WHERE botID = ?
                           AND channelID = ?
    ;`, [JSON.stringify(commandJson), botId, channelId])
  }


  /**
   * Log a TTS message
   * @returns {Promise<void>}
   * @param messageId
   * @param roomId
   * @param userId
   * @param rawMessage
   * @param voice
   * @param userLevel
   * @param wasSent
   */
  static async ttsLog (messageId, roomId, userId, rawMessage, voice, userLevel, wasSent) {
    await sqlPool.query(`INSERT INTO ttsLog (messageId, roomId, userId, rawMessage, voice, userLevel, wasSent)
                         VALUES (?, ?, ?, ?, ?, ?, ?)
    ;`, [messageId, roomId, userId, rawMessage, voice, userLevel, wasSent])
  }

  /**
   * TTS usage amount
   * @returns {Promise<{ttsInPastHour: number, ttsInPastMonth: number, ttsInPastDay: number, ttsInPastWeek: number, ttsInPastMinute: number, linksInPastDay: number}>}
   */
  static async ttsUsageStats () {
    let results = await sqlPool.query(`
        SELECT -- (SELECT COUNT(*) FROM ttsLog WHERE TIMESTAMP >= now() - INTERVAL 1 MINUTE) AS 'ttsInPastMinute',
               (SELECT COUNT(*) FROM ttsLog WHERE TIMESTAMP >= now() - INTERVAL 1 HOUR) AS 'ttsInPastHour',
               -- (SELECT COUNT(*) FROM ttsLog WHERE TIMESTAMP >= now() - INTERVAL 1 DAY)    AS 'ttsInPastDay',
               -- (SELECT COUNT(*) FROM ttsLog WHERE TIMESTAMP >= now() - INTERVAL 1 WEEK)   AS 'ttsInPastWeek',
               -- (SELECT COUNT(*) FROM ttsLog WHERE TIMESTAMP >= now() - INTERVAL 1 MONTH)  AS 'ttsInPastMonth',
               (
                   SELECT COUNT(tl.roomId)
                   FROM ttsLog tl
                            LEFT JOIN channels ch
                                      ON tl.roomId = ch.ID
                   WHERE tl.TIMESTAMP = (
                       SELECT MIN(tli.TIMESTAMP) as 'firstMsg'
                       FROM ttsLog tli
                       WHERE tli.roomId = tl.roomId
                   )
                     AND tl.TIMESTAMP >= now() - INTERVAL 1 DAY
               )                                                                        AS 'linksInPastDay'
        ;`)
    return results[0] || {
      ttsInPastMinute: -1,
      ttsInPastHour: -1,
      ttsInPastDay: -1,
      ttsInPastWeek: -1,
      ttsInPastMonth: -1,
      linksInPastDay: -1
    }
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

module.exports = SqlChannelPoints

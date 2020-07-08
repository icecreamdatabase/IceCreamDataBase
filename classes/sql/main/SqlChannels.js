"use strict"
const sqlPool = require('../Sql').pool

class SqlChannels {
  /**
   * @typedef {object} SqlChannelObj
   * @property {number} botID,
   * @property {number} channelID,
   * @property {string} channelName,
   * @property {boolean} enabled,
   * @property {boolean} logMessages,
   * @property {boolean} shouldModerate,
   * @property {boolean} useCommands,
   * @property {boolean} useHardcodedCommands,
   * @property {boolean} useChannelPoints,
   * @property {boolean} ttsRegisterEnabled,
   * @property {number} maxMessageLength,
   * @property {number} minCooldown,
   * @property {UserLevel|null} botStatus,
   * @property {string} lastMessage,
   * @property {number} lastMessageTimeMillis
   */
  constructor () {

  }

  /**
   * Add a channel to the database.
   * Update name if id duplicate after e.g. namechange.
   * @param channelId
   * @param channelName
   * @return {Promise<void>}
   */
  static async updateUserNameIfExists (channelId, channelName) {
    await sqlPool.query(`UPDATE IGNORE channels
                         SET channelName = ?
                         WHERE ID = ?;`, [channelName, channelId])
  }

  /**
   * Add a channel and connection to the database.
   * channels: ignore
   * connection: update
   * @param botID
   * @param channelId
   * @param channelName
   * @param logMessages
   * @param shouldModerate
   * @param useCommands
   * @param useHardcodedCommands
   * @param shouldAnnounceSubs
   * @param useChannelPoints
   * @param ttsRegisterEnabled
   * @returns {Promise<void>}
   */
  static async addChannel (botID, channelId, channelName, logMessages = false, shouldModerate = false, useCommands = false, useHardcodedCommands = true, shouldAnnounceSubs = false, useChannelPoints = false, ttsRegisterEnabled = false) {
    await sqlPool.query(`INSERT INTO channels(ID, channelName, enabled)
                         VALUES (?, ?, b'1')
                         ON DUPLICATE KEY UPDATE channelName = VALUES(channelName);`, [channelId, channelName.toLowerCase()])

    await sqlPool.query(`INSERT INTO connections(botID, channelID, logMessages, shouldModerate, useCommands,
                                                 useHardcodedCommands, shouldAnnounceSubs, useChannelPoints,
                                                 ttsRegisterEnabled)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE logMessages          = logMessages,
                                                 shouldModerate       = shouldModerate,
                                                 useCommands          = useCommands,
                                                 useHardcodedCommands = useHardcodedCommands,
                                                 shouldAnnounceSubs   = shouldAnnounceSubs,
                                                 useChannelPoints     = useChannelPoints,
                                                 ttsRegisterEnabled   = ttsRegisterEnabled`,
      [botID, channelId, logMessages, shouldModerate, useCommands, useHardcodedCommands, shouldAnnounceSubs, useChannelPoints, ttsRegisterEnabled])
  }

  /**
   * Get all channel data about a singular bot
   * @param  botID Database id of the bot in question
   * @return {Promise<Object.<number, SqlChannelObj>>} All data about the channel
   */
  static async getChannelData (botID) {
    let results = await sqlPool.query(`SELECT botID,
                                              channelID,
                                              channelName,
                                              logMessages,
                                              shouldModerate,
                                              useCommands,
                                              useHardcodedCommands,
                                              useChannelPoints,
                                              ttsRegisterEnabled,
                                              maxMessageLength,
                                              minCooldown
                                       FROM bots,
                                            channels,
                                            connections
                                       WHERE bots.ID = botID
                                         AND channels.ID = channelID
                                         AND channels.enabled = B'1'
                                         AND bots.ID = ?`, botID)

    //make sure the index is the channelID
    let channels = {}
    for (let index in results) {
      if (Object.prototype.hasOwnProperty.call(results, index)) {
        channels[results[index].channelID] = results[index]
      }
    }
    return channels
  }
}

module.exports = SqlChannels

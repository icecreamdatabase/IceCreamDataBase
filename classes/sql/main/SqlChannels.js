"use strict"
const sqlPool = require('../Sql').pool

class SqlChannels {
  constructor () {

  }

  /**
   * Add a channel to the database.
   * channels: ignore
   * connection: update
   * @param botID
   * @param channelID
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
  static async addChannel (botID, channelID, channelName, logMessages = false, shouldModerate = false, useCommands = false, useHardcodedCommands = true, shouldAnnounceSubs = false, useChannelPoints = false, ttsRegisterEnabled = false) {
    await sqlPool.query(`INSERT IGNORE INTO channels(ID, channelName, enabled)
                         VALUES (?, ?, b'1');`, [channelID, channelName])

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
      [botID, channelID, logMessages, shouldModerate, useCommands, useHardcodedCommands, shouldAnnounceSubs, useChannelPoints, ttsRegisterEnabled])
  }

  /**
   * Get all channel data about a singular bot
   * @param  botID Database id of the bot in question
   * @return {Promise<{botID, channelID, channelName, enabled, logMessages, shouldModerate, useCommands, useHardcodedCommands, useChannelPoints, maxMessageLength, minCooldown}[]>} All data about the channel
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

    results = results.map((row) => {
      let botID = row.botID || -1
      let channelID = row.channelID || -1
      //get channelname through userIdLoginCache instead of storing in db
      let channelName = row.channelName || -1
      let logMessages = row.logMessages || false
      let shouldModerate = row.shouldModerate || false
      let useCommands = row.useCommands || false
      let useHardcodedCommands = row.useHardcodedCommands || false
      let useChannelPoints = row.useChannelPoints || false
      let ttsRegisterEnabled = row.ttsRegisterEnabled || false
      let maxMessageLength = row.maxMessageLength || 500
      let minCooldown = row.minCooldown || 0

      return {
        botID,
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
      }
    })

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

"use strict"
const sqlPool = require('../Sql').pool

module.exports = class SqlChannels {
  constructor () {

  }

  /**
   * Get channel data about a singular bot
   * @param  {int} botID Database id of the bot in question
   * @return {botID, channelID, channelName, enabled, logMessages, shouldModerate, useCommands, useHardcodedCommands, useChannelPoints, maxMessageLength, minCooldown}          All data about the channel
   */
  static async getChannelData (botID) {
    let results = await sqlPool.query(`SELECT botID, channelID, channelName, logMessages ,shouldModerate, useCommands, useHardcodedCommands, useChannelPoints, maxMessageLength, minCooldown
    FROM bots, channels, connections
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
      let maxMessageLength = row.maxMessageLength || 500
      let minCooldown = row.minCooldown || 0

      return {botID, channelID, channelName, logMessages, shouldModerate, useCommands, useHardcodedCommands, useChannelPoints, maxMessageLength, minCooldown}
    })

    //make sure the index is the channelID
    let channels = {}
    for (let index in results) {
      if (results.hasOwnProperty(index)) {
        channels[results[index].channelID] = results[index]
      }
    }
    return channels
  }
}

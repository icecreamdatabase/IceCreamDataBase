"use strict"
const sqlPool = require('../Sql').pool

module.exports = class SqlChannels {
  constructor () {

  }

  /**
   * Get channel data about a singular bot
   * @param  {int} botID Database id of the bot in question
   * @return {botID, channelID, channelName, enabled, shouldModerate, useLocalCommands, useGlobalCommands, useHardcodedCommands}          All data about the channel
   */
  static async getChannelData (botID) {
    let results = await sqlPool.query(`SELECT botID, channelID, channelName, shouldModerate, useLocalCommands, useGlobalCommands, useHardcodedCommands
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
      let shouldModerate = row.shouldModerate || false
      let useLocalCommands = row.useLocalCommands || false
      let useGlobalCommands = row.useGlobalCommands || false
      let useHardcodedCommands = row.useHardcodedCommands || false

      return {botID, channelID, channelName, shouldModerate, useLocalCommands, useGlobalCommands, useHardcodedCommands}
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

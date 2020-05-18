"use strict"
const util = require('util')
//CLASSES
const Logger = require('../../../helper/Logger')
const DiscordLog = require('../../../helper/DiscordLog')

const lastTimeoutObj = {}

module.exports = class ClearChat {
  constructor (bot) {
    this.bot = bot

    this.bot.irc.TwitchIRCConnection.on('CLEARCHAT', this.onClearChat.bind(this))
  }

  /**
   * Method from bot.TwitchIRCconnection event emitter 'CLEARCHAT'.
   * @param clearChatObj raw object from TwitchIRCconnection registerEvents
   * @returns {Promise<void>}
   */
  async onClearChat (clearChatObj) {
    let channelName = clearChatObj.param.substring(1)
    let userName = clearChatObj.trailing.toLowerCase()
    if (!Object.prototype.hasOwnProperty.call(lastTimeoutObj, channelName)) {
      lastTimeoutObj[channelName] = {}
    }
    lastTimeoutObj[channelName][userName] = Date.now()

    // Detect perm ban of own bot account
    if (parseInt(clearChatObj.tags["target-user-id"]) === this.bot.userId
      && !Object.prototype.hasOwnProperty.call(clearChatObj.tags, "ban-duration")) {
      DiscordLog.info(`${this.bot.userName} got banned in #${channelName}`)
      Logger.info(`${this.bot.userName} got banned in #${channelName}`)
    }
  }

  /**
   * Check if a user was timed out before in a channel
   * @param channelName channelName to check in
   * @param userName userName to check for
   * @param secondsAgo How far ago to check
   * @returns {boolean} Was user timed out
   */
  static wasTimedOut (channelName, userName, secondsAgo = 10) {
    if (channelName.startsWith("#")) {
      channelName = channelName.substring(1)
    }
    userName = userName.toLowerCase()
    return Object.prototype.hasOwnProperty.call(lastTimeoutObj, channelName)
      && Object.prototype.hasOwnProperty.call(lastTimeoutObj[channelName], userName)
      && (secondsAgo * 1000 + (lastTimeoutObj[channelName][userName] || 0)) > Date.now()
  }
}


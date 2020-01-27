"use strict"
const util = require('util')
//CLASSES
const DiscordLog = require('./DiscordLog')
//const Sql = require('../sql/modules/SqlUserNotice.js')

const lastTimeoutObj = {}

module.exports = class ClearChat {
  constructor (bot) {
    this.bot = bot

    this.bot.TwitchIRCConnection.on('CLEARCHAT', this.onClearChat.bind(this))
  }

  /**
   * Method from bot.TwitchIRCconnection event emitter 'CLEARCHAT'.
   * @param clearChatObj raw object from TwitchIRCconnection registerEvents
   * @returns {Promise<void>}
   */
  async onClearChat (clearChatObj) {
    let channelName = clearChatObj.param.substring(1)
    let userName = clearChatObj.trailing.toLowerCase()
    if (!lastTimeoutObj.hasOwnProperty(channelName)) {
      lastTimeoutObj[channelName] = {}
    }
    lastTimeoutObj[channelName][userName] = Date.now()
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
    return lastTimeoutObj.hasOwnProperty(channelName)
        && lastTimeoutObj[channelName].hasOwnProperty(userName)
        && (secondsAgo * 1000 + (lastTimeoutObj[channelName][userName] || 0)) > Date.now()
  }
}


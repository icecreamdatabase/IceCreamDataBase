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

  async onClearChat (clearChatObj) {
    let channelName = clearChatObj.param.substring(1)
    let userName = clearChatObj.trailing.toLowerCase()
    if (!lastTimeoutObj.hasOwnProperty(channelName)) {
      lastTimeoutObj[channelName] = {}
    }
    lastTimeoutObj[channelName][userName] = Date.now()
  }

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


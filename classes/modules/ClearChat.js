"use strict"
const util = require('util')
//CLASSES
const DiscordLog = require('./DiscordLog')
//const Sql = require('../sql/modules/SqlUserNotice.js')

const lastTimeoutObj = {}

module.exports = class ClearChat {
  constructor (bot) {
    this.bot = bot

    //this.bot.TwitchIRCConnection.on('PRIVMSG', this.onChat.bind(this))
    this.bot.TwitchIRCConnection.on('CLEARCHAT', this.onClearChat.bind(this))
  }

  async onClearChat (clearChatObj) {
    //DiscordLog.info(util.inspect(clearChatObj))
    let channelName = clearChatObj.param.substring(1)
    let userName = clearChatObj.trailing.toLowerCase()
    if (!lastTimeoutObj.hasOwnProperty(channelName)) {
      lastTimeoutObj[channelName] = {}
    }
    lastTimeoutObj[channelName][userName] = Date.now()
    //console.log(lastTimeoutObj[channelName])
  }

  static wasTimedOut (channelName, userName, secondsAgo = 10) {
    if (channelName.startsWith("#")) {
      channelName = channelName.substring(1)
    }
    userName = userName.toLowerCase()
    //console.log("----------")
    //console.log(channelName + " " + userName)
    //console.log(util.inspect(lastTimeoutObj))
    //if (lastTimeoutObj.hasOwnProperty(channelName)) {
    //  if (lastTimeoutObj[channelName].hasOwnProperty(userName)) {
    //    console.log("was timed: " + (secondsAgo * 1000 + (lastTimeoutObj[channelName][userName] || 0)) > Date.now())
    //    console.log((secondsAgo * 1000 + (lastTimeoutObj[channelName][userName] || 0)) - Date.now())
    //    console.log(Date.now() - (secondsAgo * 1000 + (lastTimeoutObj[channelName][userName] || 0)))
    //  }
    //}
    return lastTimeoutObj.hasOwnProperty(channelName)
        && lastTimeoutObj[channelName].hasOwnProperty(userName)
        && (secondsAgo * 1000 + (lastTimeoutObj[channelName][userName] || 0)) > Date.now()
  }
}


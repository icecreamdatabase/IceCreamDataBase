"use strict";
const Logger = require('consola')
//CLASSES
const BasicBucket = require('../classes/BasicBucket.js')
const UserIdLoginCache = require('../classes/UserIdLoginCache.js')

module.exports = class Queue {
  constructor(bot) {
    this.bot = bot

    this.privmsgModeratorbucket = new BasicBucket();
    this.privsgUserBucket = new BasicBucket();
  }

  sayWithChannelId(channelId, message, userId) {
    //if userId paramter is missing just set it to "-1"
    userId = userId || "-1"

    //let channelName = UserIdLoginCache.idToName(channelId)
    //this.bot.chat.say(channelName, message);
    //Logger.info("<-- " + channelName + " " + this.bot.userName + ": " + message)
  }
  sayWithChannelName(channelName, message, userId) {
    //if userId paramter is missing just set it to "-1"
    userId = userId || "-1"
    this.bot.chat.say(channelName, message);
    Logger.info("<-- " + channelName + " " + this.bot.userName + ": " + message)
  }
}

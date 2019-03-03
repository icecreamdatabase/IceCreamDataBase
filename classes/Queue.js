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
    this.sayWithBoth(channelId, UserIdLoginCache.idToName(channelId), message, userId)
  }

  sayWithChannelName(channelName, message, userId) {
    this.sayWithBoth(UserIdLoginCache.nameToId(channelName), channelName, message, userId)
  }

  /**
   * channelId and channelName have to match else there might be unpredictable problems
   * @param  {[type]} channelId   [description]
   * @param  {[type]} channelName [description]
   * @param  {[type]} message     [description]
   * @param  {[type]} userId      [description]
   * @return {[type]}             [description]
   */
  sayWithBoth(channelId, channelName, message, userId) {
    //if userId paramter is missing just set it to "-1"
    userId = userId || "-1"

    let botStatus = this.bot.chat.channels[channelId].botStatus

    this.bot.chat.say(channelName, message);
    Logger.info("<-- " + channelName + " " + this.bot.userName + ": " + message)
  }
}

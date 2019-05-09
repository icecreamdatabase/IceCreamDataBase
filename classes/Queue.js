"use strict"
const Logger = require('consola')
const EventEmitter = require('eventemitter3')
//CLASSES
const BasicBucket = require('../classes/BasicBucket.js')
const UserIdLoginCache = require('../classes/UserIdLoginCache.js')
//ENUMS
const UserLevels = require('../ENUMS/UserLevels.js')

module.exports = class Queue {
  constructor (bot) {
    this.bot = bot

    this.previousMessage = ""

    this.messageQueue = []
    this.queueEmitter = new EventEmitter()

    this.privmsgModeratorbucket = new BasicBucket(this.bot.chat.rateLimitModerator)
    this.privsgUserBucket = new BasicBucket(this.bot.chat.rateLimitUser)

    this.queueEmitter.on('event', this.checkQueue.bind(this))

  }

  sayWithChannelId (channelId, message, userId) {
    this.sayWithBoth(channelId, UserIdLoginCache.idToName(channelId), message, userId)
  }

  sayWithChannelName (channelName, message, userId) {
    this.sayWithBoth(UserIdLoginCache.nameToId(channelName), channelName, message, userId)
  }

  /**
   * channelId and channelName have to match else there might be unpredictable problems
   * @param  {int} channelId   [description]
   * @param  {String} channelName [description]
   * @param  {String} message     [description]
   * @param  {int} userId      [description]
   */
  sayWithBoth (channelId, channelName, message, userId) {
    //if userId paramter is missing just set it to "-1"
    userId = userId || "-1"

    /* TODO: newLine stuff */

    this.messageQueue.push({checked: false, isBeingChecked: false, channelId, channelName, message, userId})
    this.queueEmitter.emit('event')
  }

  async checkQueue () {
    if (this.messageQueue.length > 0) {
      let msgObj = this.messageQueue[0]

      let botStatus = this.bot.chat.channels[msgObj.channelId].botStatus

      if (botStatus < UserLevels.VIP) {
        if (!this.privsgUserBucket.takeTicket()) {
          return
        }
        Logger.info("Took user ticket")
      }

      if (!this.privmsgModeratorbucket.takeTicket()) {
        return
      }
      Logger.info("Took moderator ticket")

      /*TODO:  is message safe to post --- else: this.messageQueue.shift() */
      /*TODO:  is timeout over? (sending message too fast) */

      if (msgObj.message === this.previousMessage) {
        msgObj.message += " \u{E0000}"
      }
      this.previousMessage = msgObj.message

      this.bot.chat.say(msgObj.channelName, msgObj.message)
      this.messageQueue.shift()
      Logger.info("<-- " + msgObj.channelName + " " + this.bot.userName + ": " + msgObj.message)
      this.queueEmitter.emit('event')
    }
  }
}

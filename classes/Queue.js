"use strict"
const Logger = require('consola')
const EventEmitter = require('eventemitter3')
//CLASSES
const BasicBucket = require('../classes/BasicBucket.js')
const UserIdLoginCache = require('../classes/UserIdLoginCache.js')
//ENUMS
const UserLevels = require('../ENUMS/UserLevels.js')
const TIMEOUT_OFFSET = 100 //ms


module.exports = class Queue {
  constructor (bot) {
    this.bot = bot

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

    /* TODO: if message is longer than 500 chars split it smartly */
    /* TODO: newLine stuff */

    this.messageQueue.push({checked: false, isBeingChecked: false, channelId, channelName, message, userId})
    this.queueEmitter.emit('event')
  }

  async checkQueue () {
    if (this.messageQueue.length > 0) {
      let msgObj = this.messageQueue[0]
      if (!msgObj.isBeingChecked) {
        msgObj.isBeingChecked = true

        let channel = this.bot.chat.channels[msgObj.channelId]
        let botStatus = channel.botStatus

        /**
         * there is a tiny chance that botStatus is undefined ... if so check again in 5 ms
         * same with channel.lastMessage and channel.lastMessageTimeMillis
         * The reason for that is that when they get updated there are undefined for a a millisecond or two
         */
        if (typeof botStatus === 'undefined' || botStatus === null
          || !channel.hasOwnProperty('lastMessage') || !channel.hasOwnProperty('lastMessageTimeMillis')
        ) {
          await sleep(5)
          msgObj.isBeingChecked = false
          this.queueEmitter.emit('event')
          return
        }

        /* Is timeout over? (sending message too fast) */
        let currentTimeMillis = Date.now()
        if (botStatus < UserLevels.VIP && currentTimeMillis < channel.lastMessageTimeMillis + 1000 + TIMEOUT_OFFSET) {
          await sleep( channel.lastMessageTimeMillis - currentTimeMillis + 1000 + TIMEOUT_OFFSET)
          msgObj.isBeingChecked = false
          this.queueEmitter.emit('event')
          return
        }
        channel.lastMessageTimeMillis = currentTimeMillis

        /* User ticket */
        if (botStatus < UserLevels.VIP) {
          if (!this.privsgUserBucket.takeTicket()) {
            Logger.info("Denied user ticket")
            await sleep(1500)
            msgObj.isBeingChecked = false
            this.queueEmitter.emit('event')
            return
          }
        }
        /* Moderator ticket */
        if (!this.privmsgModeratorbucket.takeTicket()) {
          Logger.info("Denied moderator ticket")
          await sleep(1500)
          msgObj.isBeingChecked = false
          this.queueEmitter.emit('event')
          return
        }

        /*TODO:  is message safe to post --- else: this.messageQueue.shift() */

        /* Duplicate message */
        if (msgObj.message === channel.lastMessage) {
          msgObj.message += " \u{E0000}"
        }
        channel.lastMessage = msgObj.message

        /* actual saying */
        this.bot.chat.say(msgObj.channelName, msgObj.message).then(() => {

          this.messageQueue.shift()
          Logger.info("<-- " + msgObj.channelName + " " + this.bot.userName + ": " + msgObj.message)
          this.queueEmitter.emit('event')
        }).catch(async () => {
          Logger.info("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^")
          Logger.info("Dropped: " + msgObj.message)
          await sleep(5000)
          msgObj.isBeingChecked = false
          this.queueEmitter.emit('event')
        })
      }
    }
  }
}

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

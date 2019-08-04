"use strict"
const util = require('util')
const Logger = require('consola')
const EventEmitter = require('eventemitter3')
//CLASSES
const DiscordLog = require('../modules/DiscordLog')
const BasicBucket = require('../classes/BasicBucket.js')
const UserIdLoginCache = require('../classes/UserIdLoginCache.js')
//ENUMS
const UserLevels = require('../ENUMS/UserLevels.js')
//other consts
const TIMEOUT_OFFSET = 100 //ms
const MAX_MESSAGE_LENGTH = 500 * 0.9
const MIN_MESSAGE_CUT_LENGTH = MAX_MESSAGE_LENGTH * 0.75
const NEWLINE_SEPERATOR = "{nl}"


module.exports = class Queue {
  constructor (bot) {
    this.bot = bot

    this.noBotStatus = 0

    this.messageQueue = []
    this.queueEmitter = new EventEmitter()

    this.privmsgModeratorbucket = new BasicBucket(this.bot.chat.rateLimitModerator)
    this.privsgUserBucket = new BasicBucket(this.bot.chat.rateLimitUser)
    this.queueEmitter.on('event', this.checkQueue.bind(this))
  }

  async sayWithChannelId (channelId, message, userId) {
    this.sayWithBoth(channelId, await UserIdLoginCache.idToName(channelId), message, userId)
  }

  async sayWithChannelName (channelName, message, userId) {
    this.sayWithBoth(await UserIdLoginCache.nameToId(channelName), channelName, message, userId)
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

    //split message if too long
    message = this.splitRecursively(message)

    //handle newline
    let messageArray = message.split(NEWLINE_SEPERATOR)

    for (let messageElement of messageArray) {
      messageElement = messageElement.trim()

      //is message not just an empty string
      if (messageElement) {
        this.messageQueue.push({
          checked: false,
          isBeingChecked: false,
          channelId,
          channelName,
          message: messageElement,
          userId
        })
        this.queueEmitter.emit('event')
      }
      this.queueEmitter.emit('event')
    }
  }

  /**
   * Recursively splits a message based on MAX_MESSAGE_LENGTH and MIN_MESSAGE_CUT_LENGTH.
   * Inserts NEWLINE_SEPERATOR into the gap
   * @param message inputmessage
   * @returns {string} split message
   */
  splitRecursively (message) {
    if (message.length > MAX_MESSAGE_LENGTH) {
      let indexOfLastSpace = message.substring(0, MAX_MESSAGE_LENGTH).lastIndexOf(' ')
      if (indexOfLastSpace < MIN_MESSAGE_CUT_LENGTH) {
        indexOfLastSpace = MAX_MESSAGE_LENGTH
      }
      return message.substring(0, indexOfLastSpace).trim()
              + NEWLINE_SEPERATOR
              + this.splitRecursively(message.substring(indexOfLastSpace).trim())
    }
    return message
  }

  async checkQueue () {
    if (this.messageQueue.length <= 0) {
      return
    }
    let msgObj = this.messageQueue[0]
    if (msgObj.isBeingChecked) {
      return
    }
    msgObj.isBeingChecked = true
    let channel = this.bot.chat.channels[msgObj.channelId]
    let botStatus = channel.botStatus
    if (typeof botStatus === 'undefined' || botStatus === null
      || !channel.hasOwnProperty('lastMessage') || !channel.hasOwnProperty('lastMessageTimeMillis')
    ) {
      Logger.info("channel.botStatus: " + (typeof channel.botStatus === 'undefined' || channel.botStatus === null))
      this.noBotStatus++
      await sleep(10)
      msgObj.isBeingChecked = false
      this.queueEmitter.emit('event')
      return
    }
    //TEMP
    if (this.noBotStatus > 0) {
      DiscordLog.debug("no botStatus for " + (this.noBotStatus * 10) + "ms")
      this.noBotStatus = 0
    }

    let currentTimeMillis = Date.now()
    if (botStatus < UserLevels.VIP && currentTimeMillis < channel.lastMessageTimeMillis + 1000 + TIMEOUT_OFFSET) {
      await sleep(channel.lastMessageTimeMillis - currentTimeMillis + 1000 + TIMEOUT_OFFSET)
      msgObj.isBeingChecked = false
      this.queueEmitter.emit('event')
      return
    }
    channel.lastMessageTimeMillis = currentTimeMillis
    if (botStatus < UserLevels.VIP) {
      if (!this.privsgUserBucket.takeTicket()) {
        DiscordLog.debug(process.uptime() + "\nQueue state:\n Denied uzser ticket")
        Logger.info("Denied user ticket")
        await sleep(1500)
        msgObj.isBeingChecked = false
        this.queueEmitter.emit('event')
        return
      }
    }
    if (!this.privmsgModeratorbucket.takeTicket()) {
      DiscordLog.debug(process.uptime() + "\nQueue state:\n Denied moderator ticket")
      Logger.info("Denied moderator ticket")
      await sleep(1500)
      msgObj.isBeingChecked = false
      this.queueEmitter.emit('event')
      return
    }
    if (msgObj.message === channel.lastMessage) {
      msgObj.message += " \u{E0000}"
    }
    channel.lastMessage = msgObj.message
    this.bot.chat.say(msgObj.channelName, msgObj.message).then(async () => {

      await sleep(20)
      this.messageQueue.shift()
      Logger.info("<-- " + msgObj.channelName + " " + this.bot.userName + ": " + msgObj.message)
      this.queueEmitter.emit('event')
    }).catch(async (msg) => {
      Logger.info("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^")
      Logger.info("Dropped: " + msgObj.message)
      //DiscordLog.debug(process.uptime() + "\nQueue state:\n Message dropped")
      DiscordLog.warn(util.inspect(msg))
      DiscordLog.warn("Dropped: " + util.inspect(msgObj))
      await sleep(5000)
      msgObj.isBeingChecked = false
      this.queueEmitter.emit('event')
    })
  }
}

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

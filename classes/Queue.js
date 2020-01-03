"use strict"
const util = require('util')
const EventEmitter = require('eventemitter3')
//CLASSES
const DiscordLog = require('./modules/DiscordLog')
const BasicBucket = require('../classes/BasicBucket.js')
//ENUMS
const UserLevels = require('../ENUMS/UserLevels.js')
//other consts
const TIMEOUT_OFFSET = 100 //ms
const MIN_MESSAGE_CUT_LENGTH_FACTOR = 0.75
const NEWLINE_SEPERATOR = "{nl}"


module.exports = class Queue {
  constructor (bot) {
    this.bot = bot

    this.noBotStatus = 0

    this.messageQueue = []
    this.queueEmitter = new EventEmitter()

    this.privmsgModeratorbucket = new BasicBucket(this.bot.rateLimitModerator)
    this.privsgUserBucket = new BasicBucket(this.bot.rateLimitUser)
    this.queueEmitter.on('event', this.checkQueue.bind(this))
  }

  async sayWithChannelId (channelId, message, userId) {
    this.sayWithBoth(channelId, await this.bot.apiFunctions.loginFromUserId(channelId), message, userId)
  }

  async sayWithChannelName (channelName, message, userId) {
    this.sayWithBoth(await this.bot.apiFunctions.userIdFromLogin(channelName), channelName, message, userId)
  }

  sayWithMsgObj (msgObj, message) {
    this.bot.TwitchIRCConnection.queue.sayWithBoth(msgObj.roomId, msgObj.channel,
      message, msgObj.userId)
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

    if (!message) {
      return
    }

    //remove newline characters
    if (message.indexOf("\n") >= 0) {
      console.info('Removed new line character')
      message = message.replace(/[\r\n]/g, '')
    }


    //TODO make this nicer
    //handle newline
    let messageArray = message.split(NEWLINE_SEPERATOR)
    //split message if too long
    messageArray = messageArray.map(x => this.splitRecursively(x, channelId))
    message = messageArray.join(NEWLINE_SEPERATOR)
    messageArray = message.split(NEWLINE_SEPERATOR)

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
   * @param channelId channelId needed for maxMessageLength
   * @returns {string} split message
   */
  splitRecursively (message, channelId) {
    let maxMessageLength = this.bot.channels[channelId].maxMessageLength
    if (message.length > maxMessageLength) {
      let indexOfLastSpace = message.substring(0, maxMessageLength).lastIndexOf(' ')
      if (indexOfLastSpace < maxMessageLength * MIN_MESSAGE_CUT_LENGTH_FACTOR) {
        indexOfLastSpace = maxMessageLength
      }
      return message.substring(0, indexOfLastSpace).trim()
              + NEWLINE_SEPERATOR
              + this.splitRecursively(message.substring(indexOfLastSpace).trim(), channelId)
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
    let channel = this.bot.channels[msgObj.channelId]
    let botStatus = channel.botStatus || UserLevels.DEFAULT
    if (typeof botStatus === 'undefined' || botStatus === null) {
      botStatus = UserLevels.DEFAULT
      DiscordLog.debug("No botStatus. Using UserLevels.DEFAULT")
    }
    /*
    if (typeof botStatus === 'undefined' || botStatus === null
    || !channel.hasOwnProperty('lastMessage') || !channel.hasOwnProperty('lastMessageTimeMillis')
    ) {
      console.info("channel.botStatus: " + (typeof channel.botStatus === 'undefined' || channel.botStatus === null))
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
    */

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
        console.info("Denied user ticket")
        await sleep(1500)
        msgObj.isBeingChecked = false
        this.queueEmitter.emit('event')
        return
      }
    }
    if (!this.privmsgModeratorbucket.takeTicket()) {
      DiscordLog.debug(process.uptime() + "\nQueue state:\n Denied moderator ticket")
      console.info("Denied moderator ticket")
      await sleep(1500)
      msgObj.isBeingChecked = false
      this.queueEmitter.emit('event')
      return
    }
    if (msgObj.message === channel.lastMessage) {
      msgObj.message += " \u{E0000}"
    }
    channel.lastMessage = msgObj.message

    this.bot.TwitchIRCConnection.say(msgObj.channelName, msgObj.message)

    this.messageQueue.shift()
    //console.info("--> " + msgObj.channelName + " " + this.bot.userName + ": " + msgObj.message)
    this.queueEmitter.emit('event')
  }
}

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

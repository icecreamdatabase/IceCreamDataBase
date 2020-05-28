"use strict"
const EventEmitter = require('eventemitter3')
//CLASSES
const Logger = require('../helper/Logger')
const DiscordLog = require('../helper/DiscordLog')
const BasicBucket = require('./BasicBucket.js')
//ENUMS
const UserLevels = require('../../ENUMS/UserLevels.js')
//other consts
const TIMEOUT_OFFSET = 100 //ms
const MIN_MESSAGE_CUT_LENGTH_FACTOR = 0.75
const NEWLINE_SEPERATOR = "{nl}" //Make sure to change it in Tts.js as well!


class Queue {
  /**
   * @param {Bot} bot
   */
  constructor (bot) {
    this._bot = bot

    this._messageQueue = []
    this._queueEmitter = new EventEmitter()

    this._privmsgModeratorbucket = new BasicBucket(this.bot.irc.rateLimitModerator)
    this._privsgUserBucket = new BasicBucket(this.bot.irc.rateLimitUser)
    this._queueEmitter.on('event', this.checkQueue.bind(this))
  }

  /**
   * @return {Bot}
   */
  get bot () {
    return this._bot
  }

  /**
   * Send a message with the channelId
   * Does an api call to get channelName! Avoid this function if possible.
   * @param channelId
   * @param message
   * @param userId
   * @returns {Promise<void>}
   */
  async sayWithChannelId (channelId, message, userId) {
    this.sayWithBoth(channelId, await this.bot.userIdLoginCache.idToName(channelId), message, userId)
  }

  /**
   * Send a message with the channelName
   * Does an api call to get channelId! Avoid this function if possible.
   * @param channelName
   * @param message
   * @param userId
   * @returns {Promise<void>}
   */
  async sayWithChannelName (channelName, message, userId) {
    this.sayWithBoth(await this.bot.userIdLoginCache.nameToId(channelName), channelName, message, userId)
  }

  /**
   * Send a message with the msgObj
   * @param msgObj
   * @param message
   */
  sayWithMsgObj (msgObj, message) {
    this.sayWithBoth(msgObj.roomId, msgObj.channel, message, msgObj.userId)
  }

  /**
   * Send a message with both the channelId and the channelName.
   * channelId and channelName have to match else there might be unpredictable problems
   * @param channelId
   * @param channelName
   * @param message
   * @param userId
   */
  sayWithBoth (channelId, channelName, message, userId) {
    //if userId paramter is missing just set it to "-1"
    userId = userId || "-1"

    if (!message) {
      return
    }

    //remove newline characters
    if (message.indexOf("\n") >= 0) {
      Logger.info('Removed new line character')
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
        this._messageQueue.push({
          checked: false,
          isBeingChecked: false,
          channelId,
          channelName,
          message: messageElement,
          userId
        })
        this._queueEmitter.emit('event')
      }
      this._queueEmitter.emit('event')
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
    let maxMessageLength = this.bot.irc.channels[channelId].maxMessageLength
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

  /**
   * Check the _messageQueue for a new message and handle said message.
   * If queue is not empty it will call this function until the queue is empty.
   * Use like this: this._queueEmitter.on('event', this.checkQueue.bind(this))
   * @returns {Promise<void>}
   */
  async checkQueue () {
    if (this._messageQueue.length <= 0) {
      return
    }
    let msgObj = this._messageQueue[0]
    if (msgObj.isBeingChecked) {
      return
    }
    msgObj.isBeingChecked = true
    let channel = this.bot.irc.channels[msgObj.channelId]
    let botStatus = channel.botStatus || UserLevels.DEFAULT
    if (typeof botStatus === 'undefined' || botStatus === null) {
      botStatus = UserLevels.DEFAULT
      DiscordLog.debug("No botStatus. Using UserLevels.DEFAULT")
    }

    let currentTimeMillis = Date.now()
    if (botStatus < UserLevels.VIP && currentTimeMillis < channel.lastMessageTimeMillis + 1000 + TIMEOUT_OFFSET) {
      await sleep(channel.lastMessageTimeMillis - currentTimeMillis + 1000 + TIMEOUT_OFFSET)
      msgObj.isBeingChecked = false
      this._queueEmitter.emit('event')
      return
    }
    channel.lastMessageTimeMillis = currentTimeMillis
    if (botStatus < UserLevels.VIP) {
      if (!this._privsgUserBucket.takeTicket()) {
        DiscordLog.debug(process.uptime() + "\nQueue state:\n Denied uzser ticket")
        Logger.info("Denied user ticket")
        await sleep(1500)
        msgObj.isBeingChecked = false
        this._queueEmitter.emit('event')
        return
      }
    }
    if (!this._privmsgModeratorbucket.takeTicket()) {
      DiscordLog.debug(process.uptime() + "\nQueue state:\n Denied moderator ticket")
      Logger.info("Denied moderator ticket")
      await sleep(1500)
      msgObj.isBeingChecked = false
      this._queueEmitter.emit('event')
      return
    }
    if (msgObj.message === channel.lastMessage) {
      msgObj.message += " \u{E0000}"
    }
    channel.lastMessage = msgObj.message

    this.bot.irc.twitchIrcConnection.say(msgObj.channelName, msgObj.message)

    this._messageQueue.shift()
    //Logger.info("--> " + msgObj.channelName + " " + this.bot.userName + ": " + msgObj.message)
    this._queueEmitter.emit('event')
  }
}

/**
 * Basic sleep function
 * @param ms
 * @returns {Promise<unknown>}
 */
function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

module.exports = Queue

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

const BATCH_MAX_FACTOR = 0.8 // limit of 100 * 0.8 = 80 messages per chunk
const BATCH_DELAY_BETWEEN_CHUNKS = 30000 //m
const BATCH_DEFAULT_LIMIT = 250

class Queue {
  /**
   * @typedef {Object} MessageQueueElement
   * @property {boolean} checked
   * @property {boolean} isBeingChecked
   * @property {number} channelId
   * @property {string} channelName
   * @property {string} message
   * @property {number} userId
   * @property {boolean} useSameSendConnectionAsPrevious
   */

  /**
   * @param {Bot} bot
   */
  constructor (bot) {
    this._bot = bot

    /**
     * @type {MessageQueueElement[]}
     * @private
     */
    this._messageQueue = []
    this._queueEmitter = new EventEmitter()
    /**
     * list of channelIds currently being processed in the queue.
     * This allows multiple channels to be fed by a single _messageQueue.
     * Simply skip all channels that are in this array.
     * @type {number[]}
     */
    this._channelProcessing = []

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
   *
   * @param {string} targetUser
   * @param {string} message
   */
  sendWhisper (targetUser, message) {
    this.sayWithBoth(this.bot.userId, this.bot.userName, `.w ${targetUser} ${message}`)
  }

  /**
   * Send a message with the channelId
   * Does an api call to get channelName! Avoid this function if possible.
   * @param channelId
   * @param message
   * @param userId
   * @param {boolean} [useSameSendConnectionAsPrevious] undefined = automatic detection based on message splitting.
   * @returns {Promise<void>}
   */
  async sayWithChannelId (channelId, message, userId, useSameSendConnectionAsPrevious) {
    this.sayWithBoth(channelId, await this.bot.userIdLoginCache.idToName(channelId), message, userId)
  }

  /**
   * Send a message with the channelName
   * Does an api call to get channelId! Avoid this function if possible.
   * @param channelName
   * @param message
   * @param userId
   * @param {boolean} [useSameSendConnectionAsPrevious] undefined = automatic detection based on message splitting.
   * @returns {Promise<void>}
   */
  async sayWithChannelName (channelName, message, userId, useSameSendConnectionAsPrevious) {
    this.sayWithBoth(await this.bot.userIdLoginCache.nameToId(channelName), channelName, message, userId)
  }

  /**
   * Send a message with the msgObj
   * @param msgObj
   * @param message
   * @param {boolean} [useSameSendConnectionAsPrevious] undefined = automatic detection based on message splitting.
   */
  sayWithMsgObj (msgObj, message, useSameSendConnectionAsPrevious) {
    this.sayWithBoth(msgObj.roomId, msgObj.channel, message, msgObj.userId, useSameSendConnectionAsPrevious)
  }

  /**
   * Send a message with both the channelId and the channelName.
   * channelId and channelName have to match else there might be unpredictable problems.
   * @param {string|number} channelId
   * @param {string} channelName
   * @param {string} message
   * @param {string|number} userId
   * @param {boolean} [useSameSendConnectionAsPrevious] undefined = automatic detection based on message splitting.
   */
  sayWithBoth (channelId, channelName, message, userId = -1, useSameSendConnectionAsPrevious = undefined) {
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

    if (useSameSendConnectionAsPrevious === undefined) {
      useSameSendConnectionAsPrevious = messageArray.length > 1
    }

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
          userId,
          useSameSendConnectionAsPrevious
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
   * Reset a MessageQueueElement and the corresponding channel.
   * This allow it to be checked again.
   * Run the _queueEmitter once to actually check.
   * @param {MessageQueueElement} msgObj
   */
  resetItemInQueue (msgObj) {
    msgObj.isBeingChecked = false
    this._channelProcessing = this._channelProcessing.filter(c => c !== msgObj.channelId)
    this._queueEmitter.emit('event')
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
    // get first msgObj from a channel currently not handled
    let msgObj = this._messageQueue.find(x => !this._channelProcessing.includes(x.channelId))
    if (!msgObj || msgObj.isBeingChecked) {
      return
    }
    msgObj.isBeingChecked = true
    // This channel is currently getting processed
    this._channelProcessing.push(msgObj.channelId)

    let channel = this.bot.irc.channels[msgObj.channelId]
    let botStatus = channel.botStatus || UserLevels.DEFAULT
    if (typeof botStatus === 'undefined' || botStatus === null) {
      botStatus = UserLevels.DEFAULT
      DiscordLog.debug("No botStatus. Using UserLevels.DEFAULT")
    }

    let currentTimeMillis = Date.now()
    // 1 second global cooldown (if not VIP or higher) checker
    if (botStatus < UserLevels.VIP && currentTimeMillis < channel.lastMessageTimeMillis + 1000 + TIMEOUT_OFFSET) {
      await sleep(channel.lastMessageTimeMillis - currentTimeMillis + 1000 + TIMEOUT_OFFSET)
      this.resetItemInQueue(msgObj)
      return
    }
    channel.lastMessageTimeMillis = currentTimeMillis
    // Only take a pleb ticket if the bot is a pleb
    if (botStatus < UserLevels.VIP) {
      if (!this._privsgUserBucket.takeTicket()) {
        Logger.info("Denied user ticket")
        await sleep(1500)
        this.resetItemInQueue(msgObj)
        return
      }
    }
    // always take a moderator ticket (even as a pleb)
    if (!this._privmsgModeratorbucket.takeTicket()) {
      Logger.info("Denied moderator ticket")
      await sleep(1500)
      this.resetItemInQueue(msgObj)
      return
    }
    // 30 seconds identical message preventer
    if (msgObj.message === channel.lastMessage) {
      msgObj.message += " \u{E0000}"
    }
    channel.lastMessage = msgObj.message

    this.bot.irc.ircConnectionPool.say(msgObj.channelName, msgObj.message, msgObj.useSameSendConnectionAsPrevious)

    this._messageQueue = this._messageQueue.filter(c => c !== msgObj)
    this.resetItemInQueue(msgObj)
  }

  /**
   * Say an array of strings.
   * @param {string|number} roomId
   * @param {string} channelName
   * @param {string[]} messages
   * @param {number} batchLimit
   * @param {boolean} useSameSendConnectionForAllMessages
   * @return {Promise<void>}
   */
  async batchSay (roomId, channelName, messages, batchLimit = BATCH_DEFAULT_LIMIT, useSameSendConnectionForAllMessages = false) {
    let channelObj = this.bot.irc.channels[roomId]
    let botStatus = channelObj.botStatus || UserLevels.DEFAULT
    let messageInChunkCount = 0
    let currentLimit = botStatus >= UserLevels.VIP
      ? this.bot.irc.rateLimitModerator
      : this.bot.irc.rateLimitUser
    currentLimit = Math.min(currentLimit * BATCH_MAX_FACTOR, batchLimit)
    let totalMessagesSent = 0

    Logger.info(`New limit: ${currentLimit}`)
    for (let message of messages) {
      if (messageInChunkCount >= currentLimit) {
        messageInChunkCount = 0

        // update limit
        channelObj = this.bot.irc.channels[roomId]
        botStatus = channelObj.botStatus || UserLevels.DEFAULT
        currentLimit = botStatus >= UserLevels.VIP
          ? this.bot.irc.rateLimitModerator
          : this.bot.irc.rateLimitUser
        currentLimit = Math.min(currentLimit * BATCH_MAX_FACTOR, batchLimit)

        Logger.info(`New limit: ${currentLimit}`)
        Logger.info(`${totalMessagesSent}/${messages.length} sent`)
        Logger.info(`Starting pause for: ${BATCH_DELAY_BETWEEN_CHUNKS / 1000}s`)
        await sleep(BATCH_DELAY_BETWEEN_CHUNKS)
        while (this._messageQueue.length > 0) {
          await sleep(100)
        }
      }

      this.sayWithBoth(roomId, channelName, message, this.bot.userId, useSameSendConnectionForAllMessages)
      messageInChunkCount++
      totalMessagesSent++
    }
    Logger.info("Done")
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

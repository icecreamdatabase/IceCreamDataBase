"use strict"
const EventEmitter = require('eventemitter3')
//CLASSES
const Logger = require('../helper/Logger')
const DiscordLog = require('../helper/DiscordLog')
//ENUMS
const UserLevels = require('../../ENUMS/UserLevels.js')
const IrcWsCmds = require('../../ENUMS/IrcWsCmds')

const AUTH_UPDATE_INTERVAL_CHECK = 15000 // 15 seconds

class IrcConnector {
  /**
   * @typedef {Object} WsDataSend
   * @property {number|string} botUserId
   * @property {number|string} channelId
   * @property {string} channelName
   * @property {string} message
   * @property {number|string} [userId]
   * @property {boolean} [useSameSendConnectionAsPrevious] undefined = automatic detection based on message splitting.
   *
   */

  /**
   * @typedef {Object} WsDataAuth
   * @property {number|string} userId
   * @property {string} userName
   * @property {string} accessToken
   * @property {number} rateLimitModerator
   * @property {number} rateLimitUser
   */

  /**
   * @typedef {Object} WsDataJoinAndPart
   * @property {number|string} botUserId
   * @property {string[]} channelNames
   */

  /**
   * @param {Bot} bot
   */
  constructor (bot) {
    this._bot = bot

    /**
     * @type {WsDataSend[]}
     * @private
     */
    this._wsSendQueue = []
    this._queueEmitter = new EventEmitter()
    this._queueEmitter.on('event', this.checkQueue.bind(this))

    /**
     * @type {WsDataAuth}
     * @private
     */
    this._lastSentAuthObj = undefined
    setInterval(this.sendAuthData.bind(this), AUTH_UPDATE_INTERVAL_CHECK)

    /**
     * @type {WebSocket}
     * @private
     */
    this._ws = undefined
    this.connect()
  }

  /**
   * @return {Bot}
   */
  get bot () {
    return this._bot
  }

  get version () {
    return "1.0.0"
  }

  /**
   * @param {string|string[]} channels
   */
  async joinChannel (channels) {
    if (!Array.isArray(channels)) {
      channels = [channels]
    }
    /** @type {WsDataJoinAndPart} */
    let data = {botUserId: this.bot.userId, channelNames: channels}
    await this.send(IrcWsCmds.JOIN, data)
  }

  /**
   * @param {string|string[]} channels
   */
  async leaveChannel (channels) {
    if (!Array.isArray(channels)) {
      channels = [channels]
    }
    /** @type {WsDataJoinAndPart} */
    let data = {botUserId: this.bot.userId, channelNames: channels}
    await this.send(IrcWsCmds.PART, data)
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
    this._wsSendQueue.push({
      botUserId: this.bot.userId,
      channelId,
      channelName,
      message,
      userId,
      useSameSendConnectionAsPrevious
    })
    this._queueEmitter.emit('event')
  }

  async checkQueue () {
    if (this._wsSendQueue.length > 0) {
      if (this._ws && this._ws.readyState === this._ws.OPEN) {
        let queueElement = this._wsSendQueue[0]
        try {
          await this.send(IrcWsCmds.SEND, queueElement)
          this._wsSendQueue.shift()
          return
        } catch (e) {
          Logger.warn(`Sending MESSAGE to TwitchIrcConnector failed even though the socket connection is open:\n${e}`)
        }
      }
      await sleep(500)
      this._queueEmitter.emit('event')
    }
  }

  /**
   * @param {string} cmd
   * @param {Object} data
   */
  async send (cmd, data) {
    return new Promise((resolve, reject) => {
      try {
        this._ws.send(JSON.stringify({cmd, data, version: this.version}), undefined, resolve)
      } catch (e) {
        reject(e)
      }
    })
  }

  connect () {
    this._ws = new WebSocket('ws://localhost:4702')
    // Connection opened
    this._ws.addEventListener('open', event => {
      console.log("Connected")
      this.sendAuthData().then()
    })

    // Listen for messages
    this._ws.addEventListener('message', async event => {
      let obj = JSON.parse(event.data)
      console.log(obj)
      if (obj.cmd) {
        if (obj.cmd === "xd") {
        }
      }
    })

    this._ws.addEventListener('close', event => {
      this._ws = null
      this.connect()
    })
    this._ws.addEventListener('error', event => {
      //this._ws = null
      //connect()
    })
  }

  async sendAuthData () {
    if (!this._ws || this._ws.readyState !== this._ws.OPEN) {
      return
    }

    /**
     * @type {WsDataAuth}
     */
    let data = {
      userId: this.bot.userId,
      userName: this.bot.userName,
      accessToken: this.bot.authentication.accessToken,
      rateLimitUser: this.bot.irc.rateLimitUser,
      rateLimitModerator: this.bot.irc.rateLimitModerator
    }
    if (data === this._lastSentAuthObj) {
      return
    }
    this._lastSentAuthObj = data
    try {
      Logger.info(`Sending auth data of ${this.bot.userId} (${this.bot.userName}) to TwitchIrcConnector.`)
      await this.send(IrcWsCmds.AUTH, data)
    } catch (e) {
      Logger.warn(`Sending AUTH to TwitchIrcConnector failed even though the socket connection is open:\n${e}`)
    }
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

module.exports = IrcConnector

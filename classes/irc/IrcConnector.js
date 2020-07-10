"use strict"
const EventEmitter = require('eventemitter3')
const WebSocket = require('ws')
const Assert = require('assert')
//CLASSES
const Logger = require('../helper/Logger')
const DiscordLog = require('../helper/DiscordLog')
//ENUMS
const UserLevels = require('../../ENUMS/UserLevels.js')
const IrcWsCmds = require('../../ENUMS/IrcWsCmds')

const config = require('../../config.json')

const AUTH_UPDATE_INTERVAL_CHECK = 15000 // 15 seconds

class IrcConnector extends EventEmitter {
  /**
   * @typedef {Object} WsDataMain
   * @property {string} cmd
   * @property {WsDataAuth|WsDataJoinPartSet|WsDataSend|WsDataReceive|WsDataRemoveBot} data
   * @property {string} version
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
   * @typedef {Object} WsDataJoinPartSet
   * @property {number|string} botUserId
   * @property {string[]} channelNames
   */

  /**
   * Send to TwitchIrcConnector to send it twitch.
   * @typedef {Object} WsDataSend
   * @property {number|string} botUserId
   * @property {string} channelName
   * @property {string} message
   * @property {number|string} [userId]
   * @property {UserLevel} botStatus
   * @property {boolean} [useSameSendConnectionAsPrevious] undefined = automatic detection based on message splitting.
   * @property {number} [maxMessageLength]
   *
   */

  /**
   * Receive from twitch to send to the clients.
   * @typedef {Object[]} WsDataReceive
   */

  /**
   * @typedef {Object} WsDataRemoveBot
   * @property {number|string} userId
   */

  /**
   * @typedef {Object} WsDataRequestIrcStates
   * @property {number|string} botUserId
   */

  /**
   * @param {Bot} bot
   */
  constructor (bot) {
    super()
    this._bot = bot

    /**
     * @type {WsDataMain[]}
     * @private
     */
    this._wsSendQueue = []
    this.on('queue', this.checkQueue.bind(this))

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
    //this.connect()
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
    /** @type {WsDataJoinPartSet} */
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
    /** @type {WsDataJoinPartSet} */
    let data = {botUserId: this.bot.userId, channelNames: channels}
    await this.send(IrcWsCmds.PART, data)
  }

  /**
   * @param {string|string[]} channels
   */
  async rejoinChannel (channels) {
    await this.leaveChannel(channels)
    await this.joinChannel(channels)
  }

  /**
   * @param {string|string[]} channels
   */
  async setChannel (channels) {
    if (!Array.isArray(channels)) {
      channels = [channels]
    }
    await this.send(IrcWsCmds.SET_CHANNELS, {botUserId: this.bot.userId, channelNames: channels})
  }

  /**
   * @param {string} targetUser
   * @param {string} message
   */
  sendWhisper (targetUser, message) {
    this.sayWithBoth(this.bot.userId, this.bot.userName, `.w ${targetUser} ${message}`)
  }

  /**
   * Send a message with the msgObj
   * @param msgObj
   * @param message
   * @param {boolean} [useSameSendConnectionAsPrevious] undefined = automatic detection based on message splitting.
   */
  sayWithMsgObj (msgObj, message, useSameSendConnectionAsPrevious) {
    this.sayWithBoth(msgObj.roomId, msgObj.channel, message, useSameSendConnectionAsPrevious)
  }

  /**
   * Send a message with both the channelId and the channelName.
   * channelId and channelName have to match else there might be unpredictable problems.
   * @param {string|number} channelId
   * @param {string} channelName
   * @param {string} message
   * @param {boolean} [useSameSendConnectionAsPrevious] undefined = automatic detection based on message splitting.
   */
  sayWithBoth (channelId, channelName, message, useSameSendConnectionAsPrevious = undefined) {
    this._wsSendQueue.push({
      cmd: IrcWsCmds.SEND,
      data: {
        botUserId: this.bot.userId,
        channelName,
        message,
        botStatus: this.bot.irc.channels[channelId].botStatus || UserLevels.DEFAULT,
        useSameSendConnectionAsPrevious,
        maxMessageLength: this.bot.irc.channels[channelId].maxMessageLength
      },
      version: this.version
    })
    Logger.debug(`${this.bot.userId} (${this.bot.userName}) --> ${message}`)
    this.emit('queue')
  }

  async checkQueue () {
    if (this._wsSendQueue.length > 0) {
      if (this._ws && this._ws.readyState === this._ws.OPEN) {
        let queueElement = this._wsSendQueue[0]
        try {
          await this.sendRaw(queueElement.cmd, queueElement.data, queueElement.version)
          this._wsSendQueue.shift()
          this.emit('queue')
          return
        } catch (e) {
          Logger.warn(`Sending MESSAGE to TwitchIrcConnector failed even though the socket connection is open:\n${e}`)
        }
      }
      await sleep(500)
      this.emit('queue')
    }
  }

  /**
   * @param {string} cmd
   * @param {Object} data
   */
  async send (cmd, data) {
    this._wsSendQueue.push({cmd, data, version: this.version})
    this.emit('queue')
  }

  /**
   * @param {string} cmd
   * @param {Object} data
   * @param {string} version
   */
  async sendRaw (cmd, data, version = this.version) {
    return new Promise((resolve, reject) => {
      try {
        this._ws.send(JSON.stringify({cmd, data, version}), undefined, resolve)
      } catch (e) {
        reject(e)
      }
    })
  }

  connect () {
    this._ws = new WebSocket(`ws://${config.wsConfig.TwitchIrcConnectorUrl}:${config.wsConfig.TwitchIrcConnectorPort}`)
    // Connection opened
    this._ws.addEventListener('open', event => {
      console.log("Connected")
      // make sure we resend auth every time we connet to the server!
      this._lastSentAuthObj = undefined
      this.sendAuthData().then(() =>
        //Resend all channels after a reconnect. The chance of the TwitchIrcConnector having restarted is very high.
        this.bot.irc.updateBotChannels().then(() =>
          this.requestIrcStates().then(() =>
            Logger.info(`### WS (re)connect sending channels done: ${this.bot.userId} (${this.bot.userName})`)
          )
        )
      )
    })

    // Listen for messages
    this._ws.addEventListener('message', async event => {
      /**
       * @type {WsDataMain}
       */
      let obj = JSON.parse(event.data)
      //console.log(obj)
      if (obj.cmd) {
        if (obj.cmd === IrcWsCmds.RECEIVE) {
          for (const dataElement of obj.data) {
            this.emit(dataElement.command.toString().toUpperCase(), dataElement)
          }
        }
      }
    })

    this._ws.addEventListener('close', event => {
      //Logger.debug(`IrcConnector close`)
      this._ws.terminate()
      this._ws.removeAllListeners()
      this._ws = undefined
      this.connect()
    })
    this._ws.addEventListener('error', event => {
      //Logger.debug(`IrcConnector error`)
      //this._ws.terminate()
      //this._ws.removeAllListeners()
      //this._ws = undefined
      //this.connect()
    })
  }

  async requestIrcStates () {
    if (!this._ws || this._ws.readyState !== this._ws.OPEN) {
      return
    }
    try {
      Logger.info(`Requesting irc states of ${this.bot.userId} (${this.bot.userName}) to TwitchIrcConnector.`)
      /**
       * @type {WsDataRequestIrcStates}
       */
      let data = {botUserId: this.bot.userId}
      await this.send(IrcWsCmds.GET_IRC_STATES, data)
    } catch (e) {
      Logger.warn(`Requesting irc states from TwitchIrcConnector failed even though the socket connection is open:\n${e}`)
    }
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
    try {
      Assert.deepStrictEqual(data, this._lastSentAuthObj)
    } catch (e) {
      //Throws exception if they are NOT equal --> send new data
      this._lastSentAuthObj = data
      try {
        Logger.info(`Sending auth data of ${this.bot.userId} (${this.bot.userName}) to TwitchIrcConnector.`)
        await this.send(IrcWsCmds.AUTH, data)
      } catch (e) {
        Logger.warn(`Sending AUTH to TwitchIrcConnector failed even though the socket connection is open:\n${e}`)
      }
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

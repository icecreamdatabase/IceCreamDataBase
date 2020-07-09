"use strict"
//CLASSES
const Logger = require('../helper/Logger')
const SqlChannels = require('../sql/main/SqlChannels.js')
const IrcConnector = require('./IrcConnector')
const PrivMsg = require('./modules/IrcTags/PrivMsg.js')
const UserNotice = require('./modules/IrcTags/UserNotice.js')
const ClearChat = require('./modules/IrcTags/ClearChat.js')
const ClearMsg = require('./modules/IrcTags/ClearMsg')
const UserState = require('./modules/IrcTags/UserState')

const ChatLimit = require("../../ENUMS/ChatLimit")

//update channels every 120 seconds (2 minutes)
const UPDATE_ALL_CHANNELS_INTERVAL = 120000 //ms

class Irc {
  /**
   * @param {Bot} bot
   */
  constructor (bot) {
    this._bot = bot

    /**
     * @type {PrivMsg}
     * @private
     */
    this._privMsg = undefined
    /**
     * @type {UserNotice}
     * @private
     */
    this._userNotice = undefined
    /**
     * @type {ClearChat}
     * @private
     */
    this._clearChat = undefined
    /**
     * @type {ClearMsg}
     * @private
     */
    this._clearMsg = undefined
    /**
     * @type {UserState}
     * @private
     */
    this._userState = undefined

    Logger.info(`Setting up bot: ${this.bot.userId} (${this.bot.userName})`)

    this.rateLimitUser = ChatLimit.NORMAL
    this.rateLimitModerator = ChatLimit.NORMAL_MOD

    /**
     * @type {IrcConnector}
     * @private
     */
    this._ircConnector = undefined
    /**
     * @type {Object.<number, SqlChannelObj>}
     */
    this.channels = {}

    this.updateBotRatelimits().then(this.setupIrc.bind(this))
  }

  /**
   * @return {Bot}
   */
  get bot () {
    return this._bot
  }

  /**
   * @return {PrivMsg}
   */
  get privMsg () {
    return this._privMsg
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * @return {UserNotice}
   */
  get userNotice () {
    return this._userNotice
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * @return {ClearChat}
   */
  get clearChat () {
    return this._clearChat
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * @return {ClearMsg}
   */
  get clearMsg () {
    return this._clearMsg
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * @return {UserState}
   */
  get userState () {
    return this._userState
  }

  /**
   * @return {IrcConnector}
   */
  get ircConnector () {
    return this._ircConnector
  }

  get channelNames () {
    let channelNames = []
    for (const channelKey in this.channels) {
      if (Object.prototype.hasOwnProperty.call(this.channels, channelKey)) {
        channelNames.push(this.channels[channelKey].channelName)
      }
    }
    return channelNames
  }

  async setupIrc () {
    Logger.info(`### Connecting: ${this.bot.userId} (${this.bot.userName})`)


    await this.bot.userIdLoginCache.prefetchFromDatabase()

    this._ircConnector = new IrcConnector(this.bot)

    //OnX modules
    this._privMsg = new PrivMsg(this.bot)
    this._userNotice = new UserNotice(this.bot)
    this._clearChat = new ClearChat(this.bot)
    this._clearMsg = new ClearMsg(this.bot)
    this._userState = new UserState(this.bot)

    this.ircConnector.connect()

    Logger.info(`### Connected: ${this.bot.userId} (${this.bot.userName})`)
    setInterval(this.updateBotChannels.bind(this), UPDATE_ALL_CHANNELS_INTERVAL)

    Logger.info(`### Fully setup: ${this.bot.userId} (${this.bot.userName})`)
  }

  /**
   * Update and sync this.channels object from database
   * @returns {Promise<void>} "All channels updated promise"
   */
  async updateBotChannels () {
    await this.bot.userIdLoginCache.checkNameChanges()

    let channelsFromDb = await SqlChannels.getChannelData(this.bot.userId)

    for (const channelId in channelsFromDb) {
      if (Object.prototype.hasOwnProperty.call(channelsFromDb, channelId)) {
        // Don't reset these 3 values. Copy them over instead.
        channelsFromDb[channelId].botStatus = this.channels[channelId]
          ? this.channels[channelId].botStatus || null
          : null
        channelsFromDb[channelId].lastMessage = this.channels[channelId]
          ? this.channels[channelId].lastMessage || ""
          : ""
        channelsFromDb[channelId].lastMessageTimeMillis = this.channels[channelId]
          ? this.channels[channelId].lastMessageTimeMillis || 0
          : 0
      }
    }
    //save changes to bot array
    this.channels = channelsFromDb

    //update irc join / part data
    await this.ircConnector.setChannel(this.channelNames)
  }

  async updateBotRatelimits () {
    let userInfo = await this.bot.api.kraken.userInfo(this.bot.userId)

    if (userInfo["is_verified_bot"]) {
      this.rateLimitUser = ChatLimit.VERIFIED
      this.rateLimitModerator = ChatLimit.VERIFIED_MOD
    } else if (userInfo["is_known_bot"]) {
      this.rateLimitUser = ChatLimit.KNOWN
      this.rateLimitModerator = ChatLimit.KNOWN_MOD
    } else {
      this.rateLimitUser = ChatLimit.NORMAL
      this.rateLimitModerator = ChatLimit.NORMAL_MOD
    }
  }
}

module.exports = Irc

"use strict"
//CLASSES
const Logger = require('../helper/Logger')
const SqlChannels = require('../sql/main/SqlChannels.js')
const TwitchIRCConnection = require('./TwitchIRCConnection.js')
const PrivMsg = require('./modules/IrcTags/PrivMsg.js')
const UserNotice = require('./modules/IrcTags/UserNotice.js')
const ClearChat = require('./modules/IrcTags/ClearChat.js')
const ClearMsg = require('./modules/IrcTags/ClearMsg')
const UserState = require('./modules/IrcTags/UserState')
const Queue = require('./Queue.js')

const ChatLimit = require("../../ENUMS/ChatLimit")

//update channels every 120 seconds (2 minutes)
const UPDATE_ALL_CHANNELS_INTERVAL = 120000 //ms

module.exports = class Irc {
  constructor (bot) {
    this.bot = bot

    Logger.info(`Setting up bot: ${this.bot.userId} (${this.bot.userName})`)

    this.rateLimitUser = ChatLimit.NORMAL
    this.rateLimitModerator = ChatLimit.NORMAL_MOD

    this.TwitchIRCConnection = new TwitchIRCConnection(this.bot)
    //create empty channel array to chat object
    this.channels = {}

    this.updateBotRatelimits().then(this.onUpdateBotRatelimits.bind(this))
  }

  onUpdateBotRatelimits () {
    //Connecting the bot to the twich servers
    Logger.info(`### Connecting: ${this.bot.userId} (${this.bot.userName})`)
    this.TwitchIRCConnection.connect().then(this.onConnected.bind(this))
  }

  /**
   * Callback for this.TwitchIRCConnection.connect()
   * Don't forget .bind(this)!
   */
  onConnected () {
    Logger.info(`### Connected: ${this.bot.userId} (${this.bot.userName})`)
    this.queue = new Queue(this.bot)

    SqlChannels.getChannelData(this.bot.userId).then(this.onChannelData.bind(this))
  }

  /**
   * Callback for Sql.getChannelData(this.bot.userId)
   * Don't forget .bind(this)!
   */
  onChannelData (data) {
    let ids = Object.values(data).map(x => x.channelID)
    this.bot.userIdLoginCache.prefetchListOfIds(ids).then(this.onDataPrefetched.bind(this))
  }

  /**
   * Callback for this.bot.userIdLoginCache.prefetchListOfIds(ids)
   * Don't forget .bind(this)!
   */
  onDataPrefetched () {
    this.updateBotChannels().then(this.onUpdatedChannels.bind(this))
  }

  /**
   * Callback for this.updateBotChannels()
   * Don't forget .bind(this)!
   */
  onUpdatedChannels () {
    //OnX modules
    this.privMsg = new PrivMsg(this.bot)
    this.userNotice = new UserNotice(this.bot)
    this.clearChat = new ClearChat(this.bot)
    this.clearMsg = new ClearMsg(this.bot)
    this.userState = new UserState(this.bot)

    setInterval(this.updateBotChannels.bind(this), UPDATE_ALL_CHANNELS_INTERVAL)

    Logger.info("### Fully setup: " + this.bot.userId + " (" + this.bot.userName + ")")
  }

  /**
   * Update and sync this.channels object from database
   * @returns {Promise<void>} "All channels updated promise"
   */
  async updateBotChannels () {
    let allChannelData = await SqlChannels.getChannelData(this.bot.userId)

    //remove unused channels
    for (let channelId in this.channels) {
      if (Object.prototype.hasOwnProperty.call(this.channels, channelId)) {
        //check
        let contains = false
        for (let currentChannelId in allChannelData) {
          if (Object.prototype.hasOwnProperty.call(allChannelData, currentChannelId)) {
            if (allChannelData[currentChannelId].channelID === this.channels[channelId].channelID) {
              contains = true
            }
          }
        }
        //part
        if (!contains) {
          let channelName = await this.bot.userIdLoginCache.idToName(channelId)
          this.TwitchIRCConnection.leave(channelName)
          Logger.info(this.bot.userName + " Parted: #" + channelName)
        }
      }
    }
    //add new channels
    for (let channelId in allChannelData) {
      if (Object.prototype.hasOwnProperty.call(allChannelData, channelId)) {
        //check
        let contains = false
        for (let currentChannelId in this.channels) {
          if (Object.prototype.hasOwnProperty.call(this.channels, currentChannelId)) {
            if (this.channels[currentChannelId].channelID === allChannelData[channelId].channelID) {
              contains = true
              // Don't reset these 3 values. Copy them over instead.
              allChannelData[channelId].botStatus = this.channels[currentChannelId].botStatus || null
              allChannelData[channelId].lastMessage = this.channels[currentChannelId].lastMessage || ""
              allChannelData[channelId].lastMessageTimeMillis = this.channels[currentChannelId].lastMessageTimeMillis || 0
            }
          }
        }
        //join
        if (!contains) {
          let channelName = await this.bot.userIdLoginCache.idToName(channelId)
          //Logger.info(this.bot.userName + " Joining: #" + channelName)
          if (channelName !== null) {
            this.TwitchIRCConnection.join(channelName)
            Logger.info(this.bot.userName + " Joined: #" + channelName)
          } else {
            Logger.warn(`${this.bot.userName} failed to join banned channel: ${channelId}`)
          }
          allChannelData[channelId].botStatus = null
          allChannelData[channelId].lastMessage = ""
          allChannelData[channelId].lastMessageTimeMillis = 0
        }
      }
    }
    //save changes to bot array
    this.channels = allChannelData
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

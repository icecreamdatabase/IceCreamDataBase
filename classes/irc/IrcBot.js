"use strict"
//CLASSES
const Logger = require('../helper/Logger')
const SqlChannels = require('../sql/main/SqlChannels.js')
const SqlBlacklist = require('../sql/main/SqlUserBlacklist')
const TwitchIRCConnection = require('./TwitchIRCConnection.js')
const ApiFunctions = require('../api/ApiFunctions.js')
const PrivMsg = require('../modules/IrcTags/PrivMsg.js')
const UserNotice = require('../modules/IrcTags/UserNotice.js')
const ClearChat = require('../modules/IrcTags/ClearChat.js')
const ClearMsg = require('../modules/IrcTags/ClearMsg')
const UserState = require('../modules/IrcTags/UserState')
const Queue = require('./Queue.js')
const UserIdLoginCache = require('../helper/UserIdLoginCache')

const ChatLimit = require("../../ENUMS/ChatLimit")

//update channels every 120 seconds (2 minutes)
const UPDATE_ALL_CHANNELS_INTERVAL = 120000 //ms

module.exports = class IrcBot {
  constructor (bot) {
    this.bot = bot

    Logger.info(`Setting up bot: ${this.bot.userId} (${this.bot.userName})`)

    this.rateLimitUser = ChatLimit.NORMAL
    this.rateLimitModerator = ChatLimit.NORMAL_MOD

    this.TwitchIRCConnection = new TwitchIRCConnection(this.bot)
    //create empty channel array to chat object
    this.channels = {}

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
    //this.apiFunctions = new ApiFunctions(this)
    this.TwitchIRCConnection.queue = new Queue(this)

    //SqlChannels.getChannelData(this.bot.userId).then(this.onChannelData.bind(this))
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
    this.privMsg = new PrivMsg(this)
    this.userNotice = new UserNotice(this)
    this.clearChat = new ClearChat(this)
    this.clearMsg = new ClearMsg(this)
    this.userState = new UserState(this)

    setInterval(this.updateBotChannels.bind(this), UPDATE_ALL_CHANNELS_INTERVAL)
    this.apiFunctions.updateBotRatelimits().then(this.onBotReady.bind(this))
  }

  /**
   * Callback for this.apiFunctions.updateBotRateLimit()
   * Don't forget .bind(this)!
   */
  onBotReady () {
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
      if (this.channels.hasOwnProperty(channelId)) {
        //check
        let contains = false
        for (let currentChannelId in allChannelData) {
          if (allChannelData.hasOwnProperty(currentChannelId)) {
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
      if (allChannelData.hasOwnProperty(channelId)) {
        //check
        let contains = false
        for (let currentChannelId in this.channels) {
          if (this.channels.hasOwnProperty(currentChannelId)) {
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
          this.TwitchIRCConnection.join(channelName)
          Logger.info(this.bot.userName + " Joined: #" + channelName)
          allChannelData[channelId].botStatus = null
          allChannelData[channelId].lastMessage = ""
          allChannelData[channelId].lastMessageTimeMillis = 0
        }
      }
    }
    //save changes to bot array
    this.channels = allChannelData
  }
}

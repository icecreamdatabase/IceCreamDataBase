"use strict"
//CLASSES
const Logger = require('./helper/Logger')
const SqlChannels = require('./sql/main/SqlChannels.js')
const SqlBlacklist = require('./sql/main/SqlUserBlacklist')
const TwitchIRCConnection = require('../classes/TwitchIRCConnection.js')
const ApiFunctions = require('./api/ApiFunctions.js')
const PrivMsg = require('./modules/IrcTags/PrivMsg.js')
const UserNotice = require('./modules/IrcTags/UserNotice.js')
const ClearChat = require('./modules/IrcTags/ClearChat.js')
const ClearMsg = require('./modules/IrcTags/ClearMsg')
const UserState = require('./modules/IrcTags/UserState')
const Queue = require('../classes/Queue.js')
const UserIdLoginCache = require('./helper/UserIdLoginCache')
const Authentication = require('./auth/Authentication')

const ChatLimit = require("../ENUMS/ChatLimit")

// noinspection JSUndefinedPropertyAssignment
global.clientIdFallback = null

//update channels every 120 seconds (2 minutes)
const UPDATE_ALL_CHANNELS_INTERVAL = 120000 //ms
const UPDATE_USERBLACKLIST_INTERVAL = 15000 //ms

module.exports = class Bot {
  constructor (botData) {
    this.botData = botData
    this.authentication = new Authentication(this, this.botData.userId)
    this.authentication.init().then(this.onAuthentication.bind(this))
  }

  onAuthentication () {
    if (this.botData.enabled) {
      Logger.info("Setting up bot: " + this.botData.userId + " (" + this.botData.username + ")")

      this.rateLimitUser = ChatLimit.NORMAL
      this.rateLimitModerator = ChatLimit.NORMAL_MOD

      this.TwitchIRCConnection = new TwitchIRCConnection(this.botData)
      //create empty channel array to chat object
      this.channels = {}
      this.userBlacklist = []

      setInterval(this.updateUserBlacklist.bind(this), UPDATE_USERBLACKLIST_INTERVAL)
      // noinspection JSIgnoredPromiseFromCall
      this.updateUserBlacklist()

      if (this.clientId && !global.clientIdFallback) {
        global.clientIdFallback = this.clientId
      }

      //Connecting the bot to the twich servers
      Logger.info("### Connecting: " + this.userId + " (" + this.userName + ")")
      this.TwitchIRCConnection.connect().then(this.onConnected.bind(this))
    }
  }

  /**
   * Callback for this.TwitchIRCConnection.connect()
   * Don't forget .bind(this)!
   */
  onConnected () {
    Logger.info("### Connected: " + this.userId + " (" + this.userName + ")")
    this.apiFunctions = new ApiFunctions(this)
    this.userIdLoginCache = new UserIdLoginCache(this)
    this.TwitchIRCConnection.queue = new Queue(this)

    SqlChannels.getChannelData(this.userId).then(this.onChannelData.bind(this))
  }

  /**
   * Callback for Sql.getChannelData(this.userId)
   * Don't forget .bind(this)!
   */
  onChannelData (data) {
    let ids = Object.values(data).map(x => x.channelID)
    this.userIdLoginCache.prefetchListOfIds(ids).then(this.onDataPrefetched.bind(this))
  }

  /**
   * Callback for this.userIdLoginCache.prefetchListOfIds(ids)
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
    Logger.info("### Fully setup: " + this.userId + " (" + this.userName + ")")
  }

  /**
   * clientId of the current bot
   * @returns {string} clientId
   */
  get clientId () {
    return this.botData.clientId
  }

  /**
   * userId of the current bot
   * @returns {number} userId
   */
  get userId () {
    return this.botData.userId
  }

  /**
   * userName of the current bot
   * @returns {string} userName
   */
  get userName () {
    return this.botData.username
  }

  /**
   * Supinic user id of the current bot
   * @returns {string} userName
   */
  get supinicApiUser () {
    return this.botData.supinicApiUser
  }

  /**
   * Supinic API key of the current bot
   * @returns {string} key
   */
  get supinicApiKey () {
    return this.botData.supinicApiKey
  }

  isUserIdInBlacklist (userId) {
    return this.userBlacklist.includes(parseInt(userId))
  }

  async addUserIdToBlacklist (userId) {
    SqlBlacklist.addUserId(userId)
    await this.updateUserBlacklist()
  }

  async updateUserBlacklist () {
    this.userBlacklist = await SqlBlacklist.getUserIds()
  }

  /**
   * Update and sync this.channels object from database
   * @returns {Promise<void>} "All channels updated promise"
   */
  async updateBotChannels () {
    let allChannelData = await SqlChannels.getChannelData(this.userId)

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
          let channelName = await this.userIdLoginCache.idToName(channelId)
          this.TwitchIRCConnection.leave(channelName)
          Logger.info(this.userName + " Parted: #" + channelName)
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
          let channelName = await this.userIdLoginCache.idToName(channelId)
          //Logger.info(this.userName + " Joining: #" + channelName)
          this.TwitchIRCConnection.join(channelName)
          Logger.info(this.userName + " Joined: #" + channelName)
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

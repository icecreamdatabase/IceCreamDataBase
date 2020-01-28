"use strict"
//CLASSES
const Sql = require('./sql/main/SqlChannels.js')
const TwitchIRCConnection = require('../classes/TwitchIRCConnection.js')
const ApiFunctions = require('./api/ApiFunctions.js')
const PrivMsg = require('./modules/PrivMsg.js')
const UserNotice = require('./modules/UserNotice.js')
const ClearChat = require('./modules/ClearChat.js')
const Queue = require('../classes/Queue.js')

const ChatLimit = require("../ENUMS/ChatLimit")

// noinspection JSUndefinedPropertyAssignment
global.clientIdFallback = null

//update channels every 90 seconds (1.5 minutes)
const UPDATE_ALL_CHANNELS_INTERVAL = 90000 //ms

module.exports = class Bot {
  constructor (botData) {
    if (botData.enabled) {
      console.info("Setting up bot: " + botData.userId + " (" + botData.username + ")")

      this.rateLimitUser = ChatLimit.NORMAL
      this.rateLimitModerator = ChatLimit.NORMAL_MOD

      this.TwitchIRCConnection = new TwitchIRCConnection(botData)
      //add botData to chat object
      this.TwitchIRCConnection.botData = botData
      //create empty channel array to chat object
      this.channels = {}

      if (this.clientId && !global.clientIdFallback) {
        global.clientIdFallback = this.clientId
      }

      //Connecting the bot to the twich servers
      console.info("### Connecting: " + this.userId + " (" + this.userName + ")")
      this.TwitchIRCConnection.connect().then(this.onConnected.bind(this))
    }
  }

  /**
   * Callback for this.TwitchIRCConnection.connect()
   * Don't forget .bind(this)!
   */
  onConnected () {
    console.info("### Connected: " + this.userId + " (" + this.userName + ")")
    this.apiFunctions = new ApiFunctions(this)
    this.updateBotChannels().then(this.onUpdatedChannels.bind(this))
  }

  /**
   * Callback for this.updateBotChannels()
   * Don't forget .bind(this)!
   */
  onUpdatedChannels () {
    setInterval(this.updateBotChannels.bind(this), UPDATE_ALL_CHANNELS_INTERVAL)
    this.apiFunctions.updateBotStatus().then(this.onUpdatedBotStatus.bind(this))
  }

  /**
   * Callback for this.apiFunctions.updateBotStatus()
   * Don't forget .bind(this)!
   */
  onUpdatedBotStatus () {
    this.TwitchIRCConnection.queue = new Queue(this)
    //OnX modules
    this.privMsg = new PrivMsg(this)
    this.userNotice = new UserNotice(this)
    this.clearChat = new ClearChat(this)
    console.info("### Fully setup: " + this.userId + " (" + this.userName + ")")
  }

  /**
   * clientId of the current bot
   * @returns {string} clientId
   */
  get clientId () {
    return this.TwitchIRCConnection.botData.clientId
  }

  /**
   * userId of the current bot
   * @returns {number} userId
   */
  get userId () {
    return this.TwitchIRCConnection.botData.userId
  }

  /**
   * userName of the current bot
   * @returns {string} userName
   */
  get userName () {
    return this.TwitchIRCConnection.botData.username
  }

  /**
   * Update and sync this.channels object from database
   * @returns {Promise<void>} "All channels updated promise"
   */
  async updateBotChannels () {
    let allChannelData = await Sql.getChannelData(this.userId)

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
          let channelName = await this.apiFunctions.loginFromUserId(channelId)
          this.TwitchIRCConnection.leave(channelName)
          console.info(this.userName + " Parted: #" + channelName)
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
          let channelName = await this.apiFunctions.loginFromUserId(channelId)
          console.info(this.userName + " Joining: #" + channelName)
          this.TwitchIRCConnection.join(channelName)
          console.info(this.userName + " Joined: #" + channelName)
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

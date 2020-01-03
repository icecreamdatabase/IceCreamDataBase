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

      if (botData.clientID && !global.clientIdFallback) {
        global.clientIdFallback = botData.clientID
      }
      this.TwitchIRCConnection = new TwitchIRCConnection(botData)
      //add botData to chat object
      this.TwitchIRCConnection.botData = botData
      //create empty channel array to chat object
      this.channels = {}

      //Connecting the bot to the twich servers
      console.info("Connecting...")
      this.TwitchIRCConnection.connect().then(() => {
        console.info(this.TwitchIRCConnection.botData.userId + " (" + this.TwitchIRCConnection.botData.username + ") Connected!")

        this.apiFunctions = new ApiFunctions(this)
        this.updateBotChannels().then(()=>{
          setInterval(this.updateBotChannels.bind(this), UPDATE_ALL_CHANNELS_INTERVAL)

          this.apiFunctions.updateBotStatus().then(() => {
            this.TwitchIRCConnection.queue = new Queue(this)

            //OnX modules
            this.privMsg = new PrivMsg(this)
            this.userNotice = new UserNotice(this)
            this.clearChat = new ClearChat(this)

            console.info(this.TwitchIRCConnection.botData.userId + " (" + this.TwitchIRCConnection.botData.username + ") is fully setup!")
          })
        })

      })
    }
  }

  get userId () {
    return this.TwitchIRCConnection.botData.userId
  }

  get userName () {
    return this.TwitchIRCConnection.botData.username
  }

  async updateBotChannels () {
    let allChannelData = await Sql.getChannelData(this.TwitchIRCConnection.botData.userId)

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
          console.info(this.TwitchIRCConnection.botData.username + " Parted: #" + channelName)
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
              allChannelData[channelId].botStatus = this.channels[currentChannelId].botStatus || null
              allChannelData[channelId].lastMessage = this.channels[currentChannelId].lastMessage || ""
              allChannelData[channelId].lastMessageTimeMillis = this.channels[currentChannelId].lastMessageTimeMillis || 0
            }
          }
        }
        //join
        if (!contains) {
          let channelName = await this.apiFunctions.loginFromUserId(channelId)
          console.info(this.TwitchIRCConnection.botData.username + " Joining: #" + channelName)
          this.TwitchIRCConnection.join(channelName)
          console.info(this.TwitchIRCConnection.botData.username + " Joined: #" + channelName)
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

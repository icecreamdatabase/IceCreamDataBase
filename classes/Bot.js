"use strict";
const Logger = require('consola')
const TwitchJs = require('twitch-js').default
//INCLUDES
const Mysql = require('../includes/Sql.js')
const ApiFunctions = require('../classes/ApiFunctions.js')
//CLASSES
const OnX = require('../classes/OnX.js')
//ENUMS
const UserLevels = require('../ENUMS/UserLevels.js')

const logSetting = {log: { level: 2 }}
const UPDATE_ALL_CHANNELS_INTERVAL = 15000 //ms

module.exports = class Bot {
  constructor(botData) {
    if (botData.enabled) {
      Logger.info("Setting up bot: " + botData.userId + " (" + botData.username + ")")
      //add log settings
      Object.assign(botData, logSetting)
      //create bot
      let {api, chat, chatConstants} = new TwitchJs(botData)
      //save api, chat and chatConstants in the Bot instance
      this.api = api
      this.chat = chat
      this.chatConstants = chatConstants
      //add botData to chat object
      this.chat.botData = botData
      //create empty channel array to chat object
      this.chat.channels = {}

      //Connecting the bot to the twich servers
      Logger.info("Connecting...")
      this.chat.connect().then(() => {
        Logger.info(this.chat.botData.userId + " (" + this.chat.botData.username + ") Connected!")

        this.updateBotChannels().then(()=>{
          setInterval(this.updateBotChannels.bind(this), UPDATE_ALL_CHANNELS_INTERVAL)

          this.apiFunctions = new ApiFunctions({api, chat, chatConstants})
          this.onX = new OnX(chat)

          Logger.info(this.chat.botData.userId + " (" + this.chat.botData.username + ") is fully setup!")
        })


      }).catch(() => {
        Logger.info("AAAAAAAAAAAAAAAAA Something went wrong during connecting!")
      })
    }
  }

  get userId(){
    return this.chat.botData.userId
  }

  async updateBotChannels() {
    let allChannelData = await Mysql.getChannelData(this.chat.botData.userId)

    //remove unused channels
    for (let channelId in this.chat.channels) {
      //check
      let contains = false
      for (let currentChannelId in allChannelData) {
        if (allChannelData[currentChannelId].channelID === this.chat.channels[channelId].channelID) {
          contains = true
        }
      }
      //part
      if (!contains) {
        this.chat.part(this.chat.channels[channelId].channelName)
        Logger.info(this.chat.botData.username + " Parted: #" + this.chat.channels[channelId].channelName)
      }
    }
    //add new channels
    for (let channelId in allChannelData) {
      //check
      let contains = false
      for (let currentChannelId in this.chat.channels) {
        if (this.chat.channels[currentChannelId].channelID === allChannelData[channelId].channelID) {
          contains = true
        }
      }
      //join
      if (!contains) {
        Logger.info(this.chat.botData.username + " Joining: #" + allChannelData[channelId].channelName)
        await this.chat.join(allChannelData[channelId].channelName).then(() => {
          Logger.info(this.chat.botData.username + " Joined: #" + allChannelData[channelId].channelName)
        }).catch((msg) => { Logger.error("JOIN: " + msg) })
      }
    }
    //save changes to bot array
    this.chat.channels = allChannelData
  }
}

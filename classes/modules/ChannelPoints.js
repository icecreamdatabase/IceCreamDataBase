"use strict"
const util = require('util')
//CLASSES
const SqlChannelPoints = require('../sql/modules/SqlChannelPoints')
const Api = require('../api/Api.js')
const DiscordLog = require('./DiscordLog')
const Helper = require('./commands/Helper')
const Tts = new (require('./Tts')) //singleton
const UserLevels = require("../../ENUMS/UserLevels")

const UPDATE_INTERVAL = 30000//ms

module.exports = class ChannelPoints {
  constructor (bot) {
    this.bot = bot

    this.channelPointsSettings = {}

    setTimeout(this.updateChannelPointSettings.bind(this), 2000)
    setInterval(this.updateChannelPointSettings.bind(this), UPDATE_INTERVAL)
  }

  async handlePrivMsg (privMsgObj) {
    if (this.channelPointsSettings.hasOwnProperty(privMsgObj.roomId)) {
      if (privMsgObj.raw.tags.hasOwnProperty("custom-reward-id")) {
        let customRewardId = privMsgObj.raw.tags["custom-reward-id"]

        //this.channelPointsSettings[privMsgObj.roomId].ttsBrianCustomRewardId === customRewardId
        //this.channelPointsSettings[privMsgObj.roomId].ttsJustinCustomRewardId === customRewardId
      }
    }
    return false
  }

  updateChannelPointSettings () {
    SqlChannelPoints.getChannelPointsSettings(this.bot.TwitchIRCConnection.botData.userId).then(data => {
      this.channelPointsSettings = data
    })
  }
}

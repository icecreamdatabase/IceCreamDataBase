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
    this.lastTts = {}

    setTimeout(this.updateChannelPointSettings.bind(this), 2000)
    setInterval(this.updateChannelPointSettings.bind(this), UPDATE_INTERVAL)
  }

  async handlePrivMsg (privMsgObj) {
    if (this.channelPointsSettings.hasOwnProperty(privMsgObj.roomId)) {
      if (privMsgObj.raw.tags.hasOwnProperty("custom-reward-id")) {
        if (this.channelPointsSettings[privMsgObj.roomId].ttsCooldown * 1000 + (this.lastTts[privMsgObj.roomId] || 0) < Date.now() || privMsgObj.userLevel === UserLevels.BOTADMIN) {
          this.lastTts[privMsgObj.roomId] = Date.now()
          let customRewardId = privMsgObj.raw.tags["custom-reward-id"]
          let voice

          if (this.channelPointsSettings[privMsgObj.roomId].ttsBrianCustomRewardId === customRewardId) {
            voice = "Brian"
          } else if (this.channelPointsSettings[privMsgObj.roomId].ttsJustinCustomRewardId === customRewardId) {
            voice = "Justin"
          }

          if (voice) {
            Tts.sendTts(privMsgObj.channel, privMsgObj.message, voice)
          }
        }
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

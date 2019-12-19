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
        let returnMessage
        let settingObj = this.channelPointsSettings[privMsgObj.roomId]
        if (settingObj.ttsUserLevel <= privMsgObj.userLevel) {
          if (settingObj.ttsCooldown * 1000 + (this.lastTts[privMsgObj.roomId] || 0) < Date.now() || privMsgObj.userLevel === UserLevels.BOTADMIN) {
            this.lastTts[privMsgObj.roomId] = Date.now()
            let customRewardId = privMsgObj.raw.tags["custom-reward-id"]
            let voice

            if (settingObj.ttsBrianCustomRewardId === customRewardId) {
              voice = "Brian"
            } else if (settingObj.ttsJustinCustomRewardId === customRewardId) {
              voice = "Justin"
            }

            if (voice) {
              let wasSent = await Tts.sendTtsWithTimeoutCheck(privMsgObj.channel, privMsgObj.username, privMsgObj.message, voice, settingObj.ttsTimeoutCheckTime)
              console.log("Was sent: " + wasSent)
              if (wasSent) {
                //Accept
                returnMessage = settingObj.ttsAcceptMessage
              } else {
                //Reject timeout
                returnMessage = settingObj.ttsRejectTimeoutMessage
              }
            }
          } else {
            //Reject cooldown
            returnMessage = settingObj.ttsRejectCooldownMessage
          }
        } else {
          //Reject userlevel
          returnMessage = settingObj.ttsRejectUserLevelMessage
        }
        if (returnMessage) {
          returnMessage = await Helper.replaceParameterMessage(privMsgObj, returnMessage)
          //send returnMesage
          this.bot.TwitchIRCConnection.queue.sayWithMsgObj(privMsgObj, returnMessage)
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

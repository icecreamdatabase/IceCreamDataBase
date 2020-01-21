"use strict"
const util = require('util')
//CLASSES
const SqlChannels = require('../sql/main/SqlChannels')
const SqlChannelPoints = require('../sql/modules/SqlChannelPoints')
const Api = require('../api/Api.js')
const DiscordLog = require('./DiscordLog')
const Helper = require('./commands/Helper')
const Tts = new (require('./Tts')) //singleton
const UserLevels = require("../../ENUMS/UserLevels")

const UPDATE_INTERVAL = 30000//ms

const ttsCommandPrefix = "!tts"
const ttsCommandRegister = "register"
const ttsResponseRegister = "Sucessfully registered. Please use \"!tts help\" command in your own channel."
const ttsCommandLink = "link"
const ttsResponseLink = "Use the following link as an OBS browser source with \"Shutdown source when not visible\" enabled: https://tts.icecreamdatabase.com/single?channel="
const ttsResponseLinkCustomReward = "Sucessfully linked reward. " + ttsResponseLink
const ttsCommandVoices = "voices"
const ttsResponseVoices = "Check available voices here: https://supinic.com/stream/tts"
const ttsCommandHelp = "help"
const ttsResponseHelp = "Use your channel points to play a TTS message."
const ttsResponseHelpConversation = "Use your channel points to play a TTS message. You can use multiple voices in your message by prefixing their text like this: \"Brian: Kappa Kappa Keepo Justin: Wow what a memer\". To check available voices: \"" + ttsCommandPrefix + " " + ttsCommandVoices + "\""
const ttsResponseHelpUnlinked = "The broadcaster has to create a custom reward with \"Require Viewer to Enter Text\" checked and use the reward with the command \"" + ttsCommandPrefix + " " + ttsCommandLink + "\" to enable TTS."

const ttsCommandCooldownMs = 5000

module.exports = class ChannelPoints {
  constructor (bot) {
    this.bot = bot

    this.channelPointsSettings = {}
    this.lastTts = {}
    this.ttsCommandLastUsage = 0

    setTimeout(this.updateChannelPointSettings.bind(this), 2000)
    setInterval(this.updateChannelPointSettings.bind(this), UPDATE_INTERVAL)
  }

  async handlePrivMsg (privMsgObj) {
    //Handle channelpoint register
    if (privMsgObj.message.toLowerCase().startsWith(ttsCommandPrefix)
        && (this.bot.channels[privMsgObj.roomId].useChannelPoints
            || this.bot.channels[privMsgObj.roomId].ttsRegisterEnabled)
        && (this.ttsCommandLastUsage + ttsCommandCooldownMs < Date.now()
            || privMsgObj.userLevel >= UserLevels.MODERATOR)
       ) {
      this.ttsCommandLastUsage = Date.now()
      let command = privMsgObj.message.substr(ttsCommandPrefix.length + 1)
      let responseMessage = ""

      if (command.toLowerCase().startsWith(ttsCommandRegister) && this.bot.channels[privMsgObj.roomId].ttsRegisterEnabled) {
        //channel and connection creating
        await SqlChannels.addChannel(this.bot.TwitchIRCConnection.botData.userId, privMsgObj.userId, privMsgObj.username, false, false, false, true, false, true, false)
        await this.bot.updateBotChannels()
        responseMessage = ttsResponseRegister

      } else if (command.toLowerCase().startsWith(ttsCommandHelp)) {
        if (this.channelPointsSettings.hasOwnProperty(privMsgObj.roomId) && this.channelPointsSettings[privMsgObj.roomId].ttsCustomRewardId) {
          if (this.channelPointsSettings.hasOwnProperty(privMsgObj.roomId) && this.channelPointsSettings[privMsgObj.roomId].ttsConversation) {
            responseMessage = ttsResponseHelpConversation
          } else {
            responseMessage = ttsResponseHelp
          }
        } else {
          responseMessage = ttsResponseHelpUnlinked
        }

      } else if (command.toLowerCase().startsWith(ttsCommandLink) && privMsgObj.userLevel >= UserLevels.MODERATOR) {
        if (privMsgObj.raw.tags.hasOwnProperty("custom-reward-id")) {
          //channelPointSettings creating / updating
          await SqlChannelPoints.addChannel(this.bot.TwitchIRCConnection.botData.userId, privMsgObj.roomId, false, privMsgObj.raw.tags["custom-reward-id"])
          this.updateChannelPointSettings()
          responseMessage = ttsResponseLinkCustomReward
        } else {
          responseMessage = ttsResponseLink
        }
        responseMessage += privMsgObj.channel.substr(1)

      } else if (command.toLowerCase().startsWith(ttsCommandVoices) && this.channelPointsSettings.hasOwnProperty(privMsgObj.roomId) && this.channelPointsSettings[privMsgObj.roomId].ttsConversation) {
        responseMessage = ttsResponseVoices
      }
      if (responseMessage) {
        this.bot.TwitchIRCConnection.queue.sayWithMsgObj(privMsgObj, "@" + privMsgObj.username + ", " + responseMessage)
      }
    }

    /* -------------------------------------------------------------- */

    //Handle channelpoints
    if (this.channelPointsSettings.hasOwnProperty(privMsgObj.roomId)) {
      if (privMsgObj.raw.tags.hasOwnProperty("custom-reward-id")) {
        let returnMessage
        let settingObj = this.channelPointsSettings[privMsgObj.roomId]
        if (settingObj.ttsUserLevel <= privMsgObj.userLevel) {
          if (settingObj.ttsCooldown * 1000 + (this.lastTts[privMsgObj.roomId] || 0) < Date.now() || privMsgObj.userLevel === UserLevels.BOTADMIN) {
            this.lastTts[privMsgObj.roomId] = Date.now()

            if (settingObj.ttsCustomRewardId === privMsgObj.raw.tags["custom-reward-id"]) {
              let wasSent = await Tts.sendTtsWithTimeoutCheck(privMsgObj.channel, privMsgObj.username, privMsgObj.message,
                                                              settingObj.ttsConversation, settingObj.ttsDefaultVoiceName, settingObj.ttsTimeoutCheckTime)
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

"use strict"
const util = require('util')
//CLASSES
const SqlChannels = require('../../sql/main/SqlChannels')
const SqlChannelPoints = require('../../sql/modules/SqlChannelPoints')
const Api = require('../../api/Api.js')
const DiscordLog = require('../DiscordLog')
const Helper = require('../commands/Helper')
const TtsWebSocket = new (require('./TtsWebSocket')) //singleton
const UserLevels = require("../../../ENUMS/UserLevels")

const UPDATE_INTERVAL = 30000//ms

//TODO: put this as json into a file
const ttsCommandPrefix = "!tts"
const ttsCommandRegister = "register"
const ttsResponseRegister = "Successfully registered. Please use \"!tts help\" command in your own channel."
const ttsCommandUnregister = "unregister"
const ttsResponseUnregister = "Successfully unregistered. The bot is leaving the channel in 5 seconds."
const ttsCommandLink = "link"
const ttsResponseLink = "Use the following link as an OBS browser source with \"Shutdown source when not visible\" enabled: https://tts.icecreamdatabase.com/single?channel="
const ttsResponseLinkUnlinked = "Please link a reward by using this command inside the TTS textfield."
const ttsResponseLinkCustomReward = "Sucessfully linked reward. " + ttsResponseLink
const ttsCommandVoices = "voices"
const ttsResponseVoices = "Check available voices here: https://supinic.com/stream/tts"
const ttsCommandHelp = "help"
const ttsResponseHelp = "Use your channel points to play a TTS message."
const ttsResponseHelpConversation = "Use your channel points to play a TTS message. You can use multiple voices in your message by prefixing their text like this: \"Brian: Kappa Kappa Keepo Justin: Wow what a memer\". To check available voices: \"" + ttsCommandPrefix + " " + ttsCommandVoices + "\""
const ttsResponseHelpUnlinked = "The broadcaster has to create a custom reward with \"Require Viewer to Enter Text\" checked and use the reward with the command \"" + ttsCommandPrefix + " " + ttsCommandLink + "\" to enable TTS."
const ttsCommandSettings = "settings"
const ttsCommandSettingsConversation = "conversation"
const ttsCommandSettingsSubscriber = "sub"
const ttsCommandSettingsQueue = "queue"
const ttsCommandSettingsVoice = "voice"
const ttsCommandSettingsVolume = "volume"
const ttsResponseSettings = "Updating successful."
const ttsResponseSettingsHelp = "Use \"" + ttsCommandPrefix + " " + ttsCommandSettings + " [OPTION] [VALUE]\". Avaiable combinations: \"" + ttsCommandSettingsConversation + "\": true / false, \"" + ttsCommandSettingsSubscriber + "\": true / false, \"" + ttsCommandSettingsQueue + "\": true / false, \"" + ttsCommandSettingsVolume + "\": 0 - 100."
const ttsResponseSettingsFail = "Updating failed."

const ttsCommandCooldownMs = 3000

module.exports = class Tts {
  constructor (bot) {
    this.bot = bot

    this.channelPointsSettings = {}
    this.lastTts = {}
    this.ttsCommandLastUsage = 0

    setTimeout(this.updateChannelPointSettings.bind(this), 2000)
    setInterval(this.updateChannelPointSettings.bind(this), UPDATE_INTERVAL)
  }

  /**
   * Handle the privMsgObj by checking for all TTS related triggers.
   * @param privMsgObj created in PrivMsg.js
   * @returns {Promise<boolean>}
   */
  async handlePrivMsg (privMsgObj) {

    await this.handleTtsRegiser(privMsgObj)

    if (this.channelPointsSettings.hasOwnProperty(privMsgObj.roomId)) {
      await this.handleTtsRedeem(privMsgObj)
    }
  }

  /**
   * Handle the privMsgObj by checking for all TTS register related triggers.
   * Stuff like: !tts register, !tts help, ...
   * @param privMsgObj created in PrivMsg.js
   * @returns {Promise<boolean>}
   */
  async handleTtsRegiser (privMsgObj) {
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
        /* ---------- !tts register ---------- */
        //channel and connection creating
        let userId = privMsgObj.userId
        let username = privMsgObj.username
        //botadmins can register for other users
        if (privMsgObj.userLevel === UserLevels.BOTADMIN) {
          let p1User = command.substr(ttsCommandRegister.length + 1).toLowerCase().trim()
          if (p1User) {
            let p1Id = await this.bot.apiFunctions.userIdFromLogin(p1User)
            if (p1Id !== '-1') {
              userId = p1Id
              username = p1User
            }
          }
        }
        await SqlChannels.addChannel(this.bot.userId, userId, username, false, false, false, true, false, true, false)
        DiscordLog.trace("ChannelPoints_TTS added to channel: " + username)
        await this.bot.updateBotChannels()
        responseMessage = ttsResponseRegister

      } else if (command.toLowerCase().startsWith(ttsCommandUnregister) && privMsgObj.userLevel >= UserLevels.BROADCASTER) {
        /* ---------- !tts unregister ---------- */
        //channel and connection creating
        let userId = privMsgObj.userId
        let username = privMsgObj.username
        //botadmins can register for other users
        if (privMsgObj.userLevel === UserLevels.BOTADMIN) {
          let p1User = command.substr(ttsCommandUnregister.length + 1).toLowerCase().trim()
          if (p1User) {
            let p1Id = await this.bot.apiFunctions.userIdFromLogin(p1User)
            if (p1Id !== '-1') {
              userId = p1Id
              username = p1User
            }
          }
        }
        await SqlChannelPoints.dropChannel(this.bot.userId, parseInt(userId))
        DiscordLog.trace("ChannelPoints_TTS removed from channel: " + username)
        setTimeout(this.bot.updateBotChannels.bind(this.bot), 3000)
        //await this.bot.updateBotChannels()
        responseMessage = ttsResponseUnregister

      } else if (command.toLowerCase().startsWith(ttsCommandHelp)) {
        /* ---------- !tts help ---------- */
        if (this.channelPointsSettings.hasOwnProperty(privMsgObj.roomId) && this.channelPointsSettings[privMsgObj.roomId].ttsCustomRewardId) {
          if (this.channelPointsSettings.hasOwnProperty(privMsgObj.roomId) && this.channelPointsSettings[privMsgObj.roomId].ttsConversation) {
            responseMessage = ttsResponseHelpConversation
          } else {
            responseMessage = ttsResponseHelp
          }
        } else {
          responseMessage = ttsResponseHelpUnlinked
        }

      } else if (command.toLowerCase().startsWith(ttsCommandSettings) && privMsgObj.userLevel >= UserLevels.MODERATOR) {
        /* ---------- !tts settings ---------- */
        let setting = command.substr(ttsCommandSettings.length + 1)
        if (setting.toLowerCase().startsWith(ttsCommandSettingsSubscriber)) {
          /* ---------- sub ---------- */
          try {
            await SqlChannelPoints.setSettingUserLevelSubonly(this.bot.userId, privMsgObj.roomId, JSON.parse(setting.substr(ttsCommandSettingsSubscriber.length + 1).toLowerCase()))
            this.updateChannelPointSettings()
            responseMessage = ttsResponseSettings
          } catch (e) {
            responseMessage = ttsResponseSettingsFail
          }
        } else if (setting.toLowerCase().startsWith(ttsCommandSettingsConversation)) {
          /* ---------- conversation ---------- */
          try {
            await SqlChannelPoints.setSettingConversation(this.bot.userId, privMsgObj.roomId, JSON.parse(setting.substr(ttsCommandSettingsConversation.length + 1).toLowerCase()))
            this.updateChannelPointSettings()
            responseMessage = ttsResponseSettings
          } catch (e) {
            responseMessage = ttsResponseSettingsFail
          }
        } else if (setting.toLowerCase().startsWith(ttsCommandSettingsVoice)) {
          /* ---------- voice ---------- */
          try {
            let voice
            if ((voice = TtsWebSocket.getVoiceID(setting.substr(ttsCommandSettingsVoice.length + 1), false))) {
              await SqlChannelPoints.setSettingDefaultVoice(this.bot.userId, privMsgObj.roomId, voice)
              this.updateChannelPointSettings()
              responseMessage = ttsResponseSettings
            } else {
              responseMessage = ttsResponseSettingsFail
            }
          } catch (e) {
            responseMessage = ttsResponseSettingsFail
          }


        } else if (setting.toLowerCase().startsWith(ttsCommandSettingsQueue)) {
          /* ---------- queue ---------- */
          try {
            await SqlChannelPoints.setSettingQueueMessages(this.bot.userId, privMsgObj.roomId, JSON.parse(setting.substr(ttsCommandSettingsQueue.length + 1).toLowerCase()))
            this.updateChannelPointSettings()
            responseMessage = ttsResponseSettings
          } catch (e) {
            responseMessage = ttsResponseSettingsFail
          }
        } else if (setting.toLowerCase().startsWith(ttsCommandSettingsVolume)) {
          /* ---------- volume ---------- */
          try {
            let volume = parseInt(setting.substr(ttsCommandSettingsVolume.length + 1))
            if (0 <= volume && volume <= 100) {
              await SqlChannelPoints.setSettingVolume(this.bot.userId, privMsgObj.roomId, volume)
              this.updateChannelPointSettings()
              responseMessage = ttsResponseSettings
            } else {
              responseMessage = ttsResponseSettingsFail
            }
          } catch (e) {
            responseMessage = ttsResponseSettingsFail
          }
        } else {
          /* ---------- fail ---------- */
          if (setting.trim()) {
            responseMessage = ttsResponseSettingsFail
          } else {
            responseMessage = ttsResponseSettingsHelp
          }
        }

      } else if (command.toLowerCase().startsWith(ttsCommandLink) && privMsgObj.userLevel >= UserLevels.MODERATOR) {
        /* ---------- !tts link ---------- */
        if (privMsgObj.raw.tags.hasOwnProperty("custom-reward-id")) {
          //channelPointSettings creating / updating
          await SqlChannelPoints.addChannel(this.bot.userId, privMsgObj.roomId, privMsgObj.raw.tags["custom-reward-id"], true, true)
          this.updateChannelPointSettings()
          DiscordLog.trace("ChannelPoints_TTS linked in channel: " + privMsgObj.channel)
          responseMessage = ttsResponseLinkCustomReward + privMsgObj.channel.substr(1)
        } else {
          if (this.channelPointsSettings.hasOwnProperty(privMsgObj.roomId) && this.channelPointsSettings[privMsgObj.roomId]["ttsCustomRewardId"]) {
            responseMessage = ttsResponseLink + privMsgObj.channel.substr(1)
          } else {
            responseMessage = ttsResponseLinkUnlinked
          }
        }

      } else if (command.toLowerCase().startsWith(ttsCommandVoices) && this.channelPointsSettings.hasOwnProperty(privMsgObj.roomId) && this.channelPointsSettings[privMsgObj.roomId].ttsConversation) {
        /* ---------- !tts voices ---------- */
        responseMessage = ttsResponseVoices
      }
      if (responseMessage) {
        this.bot.TwitchIRCConnection.queue.sayWithMsgObj(privMsgObj, "@" + privMsgObj.username + ", " + responseMessage)
      }
      return true
    }
    return false
  }

  /**
   * Handle the privMsgObj by checking for all TTS redemption related triggers.
   * @param privMsgObj created in PrivMsg.js
   * @returns {Promise<boolean>}
   */
  async handleTtsRedeem (privMsgObj) {
    let hasTakenAction = false
    if (privMsgObj.raw.tags.hasOwnProperty("custom-reward-id")) {
      let returnMessage
      let settingObj = this.channelPointsSettings[privMsgObj.roomId]
      if (settingObj.ttsUserLevel <= privMsgObj.userLevel) {
        if (settingObj.ttsCooldown * 1000 + (this.lastTts[privMsgObj.roomId] || 0) < Date.now() || privMsgObj.userLevel === UserLevels.BOTADMIN) {
          this.lastTts[privMsgObj.roomId] = Date.now()

          if (settingObj.ttsCustomRewardId === privMsgObj.raw.tags["custom-reward-id"]) {
            let wasSent = await TtsWebSocket.sendTtsWithTimeoutCheck(privMsgObj, settingObj.ttsConversation, settingObj.ttsQueueMessages, settingObj.ttsVolume, settingObj.ttsDefaultVoiceName, settingObj.ttsTimeoutCheckTime)
            //console.log("Was sent: " + wasSent)
            if (wasSent) {
              //Accept
              returnMessage = settingObj.ttsAcceptMessage
            } else {
              //Reject timeout
              returnMessage = settingObj.ttsRejectTimeoutMessage
            }
            hasTakenAction = true
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
        hasTakenAction = true
      }
    }
    return hasTakenAction
  }

  /**
   * Update Tts.channelPointsSettings from the Database
   * @returns {Promise<void>}
   */
  updateChannelPointSettings () {
    SqlChannelPoints.getChannelPointsSettings(this.bot.userId).then(data => {
      this.channelPointsSettings = data
    })
  }
}

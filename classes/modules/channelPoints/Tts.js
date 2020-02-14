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
const ttsStrings = require("../../../json/tts-strings")

const UPDATE_INTERVAL = 30000//ms
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
    if (privMsgObj.message.toLowerCase().startsWith(ttsStrings.prefix)
      && (this.bot.channels[privMsgObj.roomId].useChannelPoints
        || this.bot.channels[privMsgObj.roomId].ttsRegisterEnabled)
      && (this.ttsCommandLastUsage + ttsCommandCooldownMs < Date.now()
        || privMsgObj.userLevel >= UserLevels.MODERATOR)
    ) {
      this.ttsCommandLastUsage = Date.now()
      let command = privMsgObj.message.substr(ttsStrings.prefix.length + 1)
      let responseMessage = ""

      if (command.toLowerCase().startsWith(ttsStrings.register.command) && this.bot.channels[privMsgObj.roomId].ttsRegisterEnabled) {
        /* ---------- !tts register ---------- */
        //channel and connection creating
        let userId = privMsgObj.userId
        let username = privMsgObj.username
        //botadmins can register for other users
        if (privMsgObj.userLevel === UserLevels.BOTADMIN) {
          let p1User = command.substr(ttsStrings.register.command.length + 1).toLowerCase().trim()
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
        responseMessage = ttsStrings.register.response

      } else if (command.toLowerCase().startsWith(ttsStrings.unregister.command) && privMsgObj.userLevel >= UserLevels.BROADCASTER) {
        /* ---------- !tts unregister ---------- */
        //channel and connection creating
        let userId = privMsgObj.userId
        let username = privMsgObj.username
        //botadmins can register for other users
        if (privMsgObj.userLevel === UserLevels.BOTADMIN) {
          let p1User = command.substr(ttsStrings.unregister.command.length + 1).toLowerCase().trim()
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
        responseMessage = ttsStrings.unregister.response

      } else if (command.toLowerCase().startsWith(ttsStrings.help.command)) {
        /* ---------- !tts help ---------- */
        if (this.channelPointsSettings.hasOwnProperty(privMsgObj.roomId) && this.channelPointsSettings[privMsgObj.roomId].ttsCustomRewardId) {
          if (this.channelPointsSettings.hasOwnProperty(privMsgObj.roomId) && this.channelPointsSettings[privMsgObj.roomId].ttsConversation) {
            responseMessage = ttsStrings.help.response.conversation
          } else {
            responseMessage = ttsStrings.help.response.general
          }
        } else {
          responseMessage = ttsStrings.help.response.unlinked
        }

      } else if (command.toLowerCase().startsWith(ttsStrings.settings.command) && privMsgObj.userLevel >= UserLevels.MODERATOR) {
        /* ---------- !tts settings ---------- */
        let setting = command.substr(ttsStrings.settings.command.length + 1)
        if (setting.toLowerCase().startsWith(ttsStrings.settings.options.subscriber)) {
          /* ---------- sub ---------- */
          try {
            await SqlChannelPoints.setSettingUserLevelSubonly(this.bot.userId, privMsgObj.roomId, JSON.parse(setting.substr(ttsStrings.settings.options.subscriber.length + 1).toLowerCase()))
            this.updateChannelPointSettings()
            responseMessage = ttsStrings.settings.response.successful
          } catch (e) {
            responseMessage = ttsStrings.settings.response.fail
          }
        } else if (setting.toLowerCase().startsWith(ttsStrings.settings.options.conversation)) {
          /* ---------- conversation ---------- */
          try {
            await SqlChannelPoints.setSettingConversation(this.bot.userId, privMsgObj.roomId, JSON.parse(setting.substr(ttsStrings.settings.options.conversation.length + 1).toLowerCase()))
            this.updateChannelPointSettings()
            responseMessage = ttsStrings.settings.response.successful
          } catch (e) {
            responseMessage = ttsStrings.settings.response.fail
          }
        } else if (setting.toLowerCase().startsWith(ttsStrings.settings.options.voice)) {
          /* ---------- voice ---------- */
          try {
            let voice
            if ((voice = TtsWebSocket.getVoiceID(setting.substr(ttsStrings.settings.options.voice.length + 1), false))) {
              await SqlChannelPoints.setSettingDefaultVoice(this.bot.userId, privMsgObj.roomId, voice)
              this.updateChannelPointSettings()
              responseMessage = ttsStrings.settings.response.successful
            } else {
              responseMessage = ttsStrings.settings.response.fail
            }
          } catch (e) {
            responseMessage = ttsStrings.settings.response.fail
          }
        } else if (setting.toLowerCase().startsWith(ttsStrings.settings.options.queue)) {
          /* ---------- queue ---------- */
          try {
            await SqlChannelPoints.setSettingQueueMessages(this.bot.userId, privMsgObj.roomId, JSON.parse(setting.substr(ttsStrings.settings.options.queue.length + 1).toLowerCase()))
            this.updateChannelPointSettings()
            responseMessage = ttsStrings.settings.response.successful
          } catch (e) {
            responseMessage = ttsStrings.settings.response.fail
          }
        } else if (setting.toLowerCase().startsWith(ttsStrings.settings.options.volume)) {
          /* ---------- volume ---------- */
          try {
            let volume = parseInt(setting.substr(ttsStrings.settings.options.volume.length + 1))
            if (0 <= volume && volume <= 100) {
              await SqlChannelPoints.setSettingVolume(this.bot.userId, privMsgObj.roomId, volume)
              this.updateChannelPointSettings()
              responseMessage = ttsStrings.settings.response.successful
            } else {
              responseMessage = ttsStrings.settings.response.fail
            }
          } catch (e) {
            responseMessage = ttsStrings.settings.response.fail
          }
        } else if (setting.toLowerCase().startsWith(ttsStrings.settings.options.cooldown)) {
          /* ---------- cooldown ---------- */
          try {
            let cooldown = parseInt(setting.substr(ttsStrings.settings.options.cooldown.length + 1))
            if (0 <= cooldown && cooldown <= 300) {
              await SqlChannelPoints.setSettingCooldown(this.bot.userId, privMsgObj.roomId, cooldown)
              this.updateChannelPointSettings()
              responseMessage = ttsStrings.settings.response.successful
            } else {
              responseMessage = ttsStrings.settings.response.fail
            }
          } catch (e) {
            responseMessage = ttsStrings.settings.response.fail
          }
        } else if (setting.toLowerCase().startsWith(ttsStrings.settings.options.timeoutCheckTime)) {
          /* ---------- timeoutcheck ---------- */
          try {
            let timeoutCheckTime = parseInt(setting.substr(ttsStrings.settings.options.timeoutCheckTime.length + 1))
            if (0 <= timeoutCheckTime && timeoutCheckTime <= 30) {
              await SqlChannelPoints.setSettingTimeoutcheckTime(this.bot.userId, privMsgObj.roomId, timeoutCheckTime)
              this.updateChannelPointSettings()
              responseMessage = ttsStrings.settings.response.successful
            } else {
              responseMessage = ttsStrings.settings.response.fail
            }
          } catch (e) {
            responseMessage = ttsStrings.settings.response.fail
          }

        } else {
          /* ---------- fail ---------- */
          if (setting.trim()) {
            responseMessage = ttsStrings.settings.response.fail
          } else {
            responseMessage = ttsStrings.settings.response.help
          }
        }

      } else if (command.toLowerCase().startsWith(ttsStrings.link.command) && privMsgObj.userLevel >= UserLevels.MODERATOR) {
        /* ---------- !tts link ---------- */
        if (privMsgObj.raw.tags.hasOwnProperty("custom-reward-id")) {
          //channelPointSettings creating / updating
          await SqlChannelPoints.addChannel(this.bot.userId, privMsgObj.roomId, privMsgObj.raw.tags["custom-reward-id"], true, true)
          this.updateChannelPointSettings()
          DiscordLog.trace("ChannelPoints_TTS linked in channel: " + privMsgObj.channel)
          responseMessage = ttsStrings.link.response.justLinked + privMsgObj.channel.substr(1)
        } else {
          if (this.channelPointsSettings.hasOwnProperty(privMsgObj.roomId) && this.channelPointsSettings[privMsgObj.roomId]["ttsCustomRewardId"]) {
            responseMessage = ttsStrings.link.response.alreadyLinked + privMsgObj.channel.substr(1)
          } else {
            responseMessage = ttsStrings.link.response.notLinked
          }
        }

      } else if (command.toLowerCase().startsWith(ttsStrings.voices.command) && this.channelPointsSettings.hasOwnProperty(privMsgObj.roomId) && this.channelPointsSettings[privMsgObj.roomId].ttsConversation) {
        /* ---------- !tts voices ---------- */
        responseMessage = ttsStrings.voices.response
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

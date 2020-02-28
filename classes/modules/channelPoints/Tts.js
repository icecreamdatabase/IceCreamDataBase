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

    await this.handleTtsRegister(privMsgObj)

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
  async handleTtsRegister (privMsgObj) {
    if (privMsgObj.message.toLowerCase().startsWith(ttsStrings.prefix)
      && (this.bot.channels[privMsgObj.roomId].useChannelPoints
        || this.bot.channels[privMsgObj.roomId].ttsRegisterEnabled)
      && (this.ttsCommandLastUsage + ttsCommandCooldownMs < Date.now()
        || privMsgObj.userLevel >= UserLevels.MODERATOR)
    ) {
      this.ttsCommandLastUsage = Date.now()
      let command = privMsgObj.message.substr(ttsStrings.prefix.length + 1).trim()
      let responseMessage = ""

      if (command.toLowerCase().startsWith(ttsStrings.register.command) && this.bot.channels[privMsgObj.roomId].ttsRegisterEnabled) {
        /* ---------- !tts register ---------- */
        responseMessage = await this.ttsHandleRegister(privMsgObj, command)
      } else if (command.toLowerCase().startsWith(ttsStrings.unregister.command) && privMsgObj.userLevel >= UserLevels.BROADCASTER) {
        /* ---------- !tts unregister ---------- */
        responseMessage = await this.ttsHandleUnregister(privMsgObj, command)
      } else if (command.toLowerCase().startsWith(ttsStrings.help.command)) {
        /* ---------- !tts help ---------- */
        responseMessage = this.ttsHandleHelp(privMsgObj)
      } else if (command.toLowerCase().startsWith(ttsStrings.settings.command) && privMsgObj.userLevel >= UserLevels.MODERATOR) {
        /* ---------- !tts settings ---------- */
        responseMessage = await this.ttsHandleSettings(command, privMsgObj)
      } else if (command.toLowerCase().startsWith(ttsStrings.link.command) && privMsgObj.userLevel >= UserLevels.MODERATOR) {
        /* ---------- !tts link ---------- */
        responseMessage = await this.ttsHandleLink(privMsgObj)
      } else if (command.toLowerCase().startsWith(ttsStrings.reload.command) && privMsgObj.userLevel >= UserLevels.BOTADMIN) {
        /* ---------- !tts reload ---------- */
        responseMessage = await this.ttsHandleReload()
      } else if (command.toLowerCase().startsWith(ttsStrings.skip.command) && privMsgObj.userLevel >= UserLevels.MODERATOR) {
        /* ---------- !tts skip ---------- */
        responseMessage = await this.ttsHandleSkip(privMsgObj)
      } else if (command.toLowerCase().startsWith(ttsStrings.voices.command)) {
        /* ---------- !tts voices ---------- */
        responseMessage = this.ttsHandleVoices(privMsgObj)
      } else if (!command.toLowerCase()) {
        /* ---------- !tts (with nothing behind it) ---------- */
        responseMessage = ttsStrings.response
      }
      if (responseMessage) {
        this.bot.TwitchIRCConnection.queue.sayWithMsgObj(privMsgObj, "@" + privMsgObj.username + ", " + responseMessage)
      }
      return true
    }
    return false
  }

  /**
   * Handle the !tts register command
   * @param privMsgObj
   * @param command
   * @returns {Promise<string>}
   */
  async ttsHandleRegister (privMsgObj, command) {
    //channel and connection creating
    let userId = privMsgObj.userId
    let username = privMsgObj.username
    //botadmins can register for other users
    if (privMsgObj.userLevel >= UserLevels.BOTADMIN) {
      let p1User = command.substr(ttsStrings.register.command.length + 1).toLowerCase().trim()
      if (p1User) {
        let p1Id = await this.bot.apiFunctions.userIdFromLogin(p1User)
        if (p1Id !== '-1') {
          userId = p1Id
          username = p1User
        }
      }
    }
    let channelInfo = await this.bot.apiFunctions.channelInfo(userId)
    if (["partner", "affiliate"].includes(channelInfo["broadcaster_type"])) {
      await SqlChannels.addChannel(this.bot.userId, userId, username, false, false, false, true, false, true, false)
      DiscordLog.custom("tts-status-log", "Join:", username + "\n(" + channelInfo["broadcaster_type"] + ")", DiscordLog.getDecimalFromHexString("#00FF00"))
      await this.bot.updateBotChannels()
      return ttsStrings.register.response.success
    } else {
      return ttsStrings.register.response.fail
    }
  }

  /**
   * Handle the !tts unregister command
   * @param privMsgObj
   * @param command
   * @returns {Promise<string>}
   */
  async ttsHandleUnregister (privMsgObj, command) {
    //channel and connection creating
    let userId = privMsgObj.userId
    let username = privMsgObj.username
    //botadmins can register for other users
    if (privMsgObj.userLevel >= UserLevels.BOTADMIN) {
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
    DiscordLog.custom("tts-status-log", "Part:", username, DiscordLog.getDecimalFromHexString("#FF0000"))
    setTimeout(this.bot.updateBotChannels.bind(this.bot), 3000)
    //await this.bot.updateBotChannels()
    return ttsStrings.unregister.response
  }

  /**
   * Handle the !tts help command
   * @param privMsgObj
   * @returns {string}
   */
  ttsHandleHelp (privMsgObj) {
    if (this.channelPointsSettings.hasOwnProperty(privMsgObj.roomId) && this.channelPointsSettings[privMsgObj.roomId].ttsCustomRewardId) {
      if (this.channelPointsSettings.hasOwnProperty(privMsgObj.roomId) && this.channelPointsSettings[privMsgObj.roomId].ttsConversation) {
        return ttsStrings.help.response.conversation
      } else {
        return ttsStrings.help.response.general
      }
    } else {
      return ttsStrings.help.response.unlinked
    }
  }

  /**
   * Handle the !tts settings command
   * @param command
   * @param privMsgObj
   * @returns {Promise<string>}
   */
  async ttsHandleSettings (command, privMsgObj) {
    let responseMessage
    let setting = command.substr(ttsStrings.settings.command.length + 1)
    if (setting.toLowerCase().startsWith(ttsStrings.settings.options.subscriber)) {
      /* ---------- sub ---------- */
      responseMessage = await this.ttsHandleSettingsSubscriber(privMsgObj, setting)
    } else if (setting.toLowerCase().startsWith(ttsStrings.settings.options.conversation)) {
      /* ---------- conversation ---------- */
      responseMessage = await this.ttsHandleSettingsConversation(privMsgObj, setting)
    } else if (setting.toLowerCase().startsWith(ttsStrings.settings.options.voice)) {
      /* ---------- voice ---------- */
      responseMessage = await this.ttsHandleSettingsVoice(setting, privMsgObj)
    } else if (setting.toLowerCase().startsWith(ttsStrings.settings.options.queue)) {
      /* ---------- queue ---------- */
      responseMessage = await this.ttsHandleSettingsQueue(privMsgObj, setting)
    } else if (setting.toLowerCase().startsWith(ttsStrings.settings.options.volume)) {
      /* ---------- volume ---------- */
      responseMessage = await this.ttsHandleSettingsVolume(setting, privMsgObj)
    } else if (setting.toLowerCase().startsWith(ttsStrings.settings.options.cooldown)) {
      /* ---------- cooldown ---------- */
      responseMessage = await this.ttsHandleSettingsCooldown(setting, privMsgObj)
    } else if (setting.toLowerCase().startsWith(ttsStrings.settings.options.timeoutCheckTime)) {
      /* ---------- timeoutcheck ---------- */
      responseMessage = await this.tssHandleSettingsTimeoutcheck(setting, privMsgObj)
    } else {
      /* ---------- fail ---------- */
      if (setting.trim()) {
        responseMessage = ttsStrings.settings.response.fail
      } else {
        responseMessage = ttsStrings.settings.response.help
      }
    }
    return responseMessage
  }

  /**
   * Handle the !tts settings sub command
   * @param privMsgObj
   * @param setting
   * @returns {Promise<string>}
   */
  async ttsHandleSettingsSubscriber (privMsgObj, setting) {
    try {
      let parameter = (setting.substr(ttsStrings.settings.options.subscriber.length + 1)).trim().toLowerCase()
      if (parameter) {
        await SqlChannelPoints.setSettingUserLevelSubonly(this.bot.userId, privMsgObj.roomId, JSON.parse(parameter))
        this.updateChannelPointSettings()
        return ttsStrings.settings.response.successful
      } else {
        return ttsStrings.settings.response.get + " \"" + !!this.channelPointsSettings[privMsgObj.roomId].ttsUserLevel + "\""
      }
    } catch (e) {
      return ttsStrings.settings.response.fail
    }
  }

  /**
   * Handle the !tts settings conversation command
   * @param privMsgObj
   * @param setting
   * @returns {Promise<string>}
   */
  async ttsHandleSettingsConversation (privMsgObj, setting) {
    try {
      let parameter = (setting.substr(ttsStrings.settings.options.conversation.length + 1)).trim().toLowerCase()
      if (parameter) {
        await SqlChannelPoints.setSettingConversation(this.bot.userId, privMsgObj.roomId, JSON.parse(parameter))
        this.updateChannelPointSettings()
        return ttsStrings.settings.response.successful
      } else {
        return ttsStrings.settings.response.get + " \"" + !!this.channelPointsSettings[privMsgObj.roomId].ttsConversation + "\""
      }
    } catch (e) {
      return ttsStrings.settings.response.fail
    }
  }

  /**
   * Handle the !tts settings voice command
   * @param setting
   * @param privMsgObj
   * @returns {Promise<string>}
   */
  async ttsHandleSettingsVoice (setting, privMsgObj) {
    try {
      let parameter = (setting.substr(ttsStrings.settings.options.voice.length + 1)).trim().toLowerCase()
      if (parameter) {
        let voice
        if ((voice = TtsWebSocket.getVoiceID(parameter, false))) {
          await SqlChannelPoints.setSettingDefaultVoice(this.bot.userId, privMsgObj.roomId, voice)
          this.updateChannelPointSettings()
          return ttsStrings.settings.response.successful
        } else {
          return ttsStrings.settings.response.fail
        }
      } else {
        return ttsStrings.settings.response.get + " \"" + this.channelPointsSettings[privMsgObj.roomId].ttsDefaultVoiceName + "\""
      }
    } catch (e) {
      return ttsStrings.settings.response.fail
    }
  }

  /**
   * Handle the !tts settings queue command
   * @param privMsgObj
   * @param setting
   * @returns {Promise<string>}
   */
  async ttsHandleSettingsQueue (privMsgObj, setting) {
    try {
      let parameter = (setting.substr(ttsStrings.settings.options.queue.length + 1)).trim().toLowerCase()
      if (parameter) {
        await SqlChannelPoints.setSettingQueueMessages(this.bot.userId, privMsgObj.roomId, JSON.parse(parameter))
        this.updateChannelPointSettings()
        return ttsStrings.settings.response.successful
      } else {
        return ttsStrings.settings.response.get + " \"" + !!this.channelPointsSettings[privMsgObj.roomId].ttsQueueMessages + "\""
      }
    } catch (e) {
      return ttsStrings.settings.response.fail
    }
  }

  /**
   * Handle the !tts settings volume command
   * @param setting
   * @param privMsgObj
   * @returns {Promise<string>}
   */
  async ttsHandleSettingsVolume (setting, privMsgObj) {
    try {
      let parameter = (setting.substr(ttsStrings.settings.options.volume.length + 1)).trim().toLowerCase()
      if (parameter) {
        let volume = parseInt(parameter)
        if (0 <= volume && volume <= 100) {
          await SqlChannelPoints.setSettingVolume(this.bot.userId, privMsgObj.roomId, volume)
          this.updateChannelPointSettings()
          return ttsStrings.settings.response.successful
        } else {
          return ttsStrings.settings.response.fail
        }
      } else {
        return ttsStrings.settings.response.get + " \"" + this.channelPointsSettings[privMsgObj.roomId].ttsVolume + "\""
      }
    } catch (e) {
      return ttsStrings.settings.response.fail
    }
  }

  /**
   * Handle the !tts settings cooldown command
   * @param setting
   * @param privMsgObj
   * @returns {Promise<string>}
   */
  async ttsHandleSettingsCooldown (setting, privMsgObj) {
    try {
      let parameter = (setting.substr(ttsStrings.settings.options.cooldown.length + 1)).trim().toLowerCase()
      if (parameter) {
        let cooldown = parseInt(parameter)
        if (0 <= cooldown && cooldown <= 300) {
          await SqlChannelPoints.setSettingCooldown(this.bot.userId, privMsgObj.roomId, cooldown)
          this.updateChannelPointSettings()
          return ttsStrings.settings.response.successful
        } else {
          return ttsStrings.settings.response.fail
        }
      } else {
        return ttsStrings.settings.response.get + " \"" + this.channelPointsSettings[privMsgObj.roomId].ttsCooldown + "\""
      }
    } catch (e) {
      return ttsStrings.settings.response.fail
    }
  }

  /**
   * Handle the !tts settings timeoutcheck command
   * @param setting
   * @param privMsgObj
   * @returns {Promise<string>}
   */
  async tssHandleSettingsTimeoutcheck (setting, privMsgObj) {
    try {
      let parameter = (setting.substr(ttsStrings.settings.options.timeoutCheckTime.length + 1)).trim().toLowerCase()
      if (parameter) {
        let timeoutCheckTime = parseInt(parameter)
        if (0 <= timeoutCheckTime && timeoutCheckTime <= 30) {
          await SqlChannelPoints.setSettingTimeoutcheckTime(this.bot.userId, privMsgObj.roomId, timeoutCheckTime)
          this.updateChannelPointSettings()
          return ttsStrings.settings.response.successful
        } else {
          return ttsStrings.settings.response.fail
        }
      } else {
        return ttsStrings.settings.response.get + " \"" + this.channelPointsSettings[privMsgObj.roomId].ttsTimeoutCheckTime + "\""
      }
    } catch (e) {
      return ttsStrings.settings.response.fail
    }
  }

  /**
   * Handle the !tts link command
   * @param privMsgObj
   * @returns {Promise<string>}
   */
  async ttsHandleLink (privMsgObj) {
    if (privMsgObj.raw.tags.hasOwnProperty("custom-reward-id")) {
      //channelPointSettings creating / updating
      await SqlChannelPoints.addChannel(this.bot.userId, privMsgObj.roomId, privMsgObj.raw.tags["custom-reward-id"], true, true)
      this.updateChannelPointSettings()
      DiscordLog.custom("tts-status-log", "Link:", privMsgObj.channel.substr(1), DiscordLog.getDecimalFromHexString("#0000FF"))
      return ttsStrings.link.response.justLinked + privMsgObj.channel.substr(1)
    } else {
      if (this.channelPointsSettings.hasOwnProperty(privMsgObj.roomId) && this.channelPointsSettings[privMsgObj.roomId]["ttsCustomRewardId"]) {
        return ttsStrings.link.response.alreadyLinked + privMsgObj.channel.substr(1)
      } else {
        return ttsStrings.link.response.notLinked
      }
    }
  }

  /**
   * Handle the !tts skip command
   * @param privMsgObj
   * @returns {string}
   */
  ttsHandleSkip (privMsgObj) {
    TtsWebSocket.skip(privMsgObj.channel)
    return ttsStrings.skip.response
  }

  /**
   * Handle the !tts reload command
   * @returns {string}
   */
  ttsHandleReload () {
    TtsWebSocket.reload()
    return ttsStrings.reload.response
  }

  /**
   * Handle the !tts voices command
   * @param privMsgObj
   * @returns {string}
   */
  ttsHandleVoices (privMsgObj) {
    if (this.channelPointsSettings.hasOwnProperty(privMsgObj.roomId) && this.channelPointsSettings[privMsgObj.roomId].ttsConversation) {
      return ttsStrings.voices.response.general
    } else {
      return ttsStrings.voices.response.noConversation
    }
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
        if (settingObj.ttsCooldown * 1000 + (this.lastTts[privMsgObj.roomId] || 0) < Date.now() || privMsgObj.userLevel >= UserLevels.BOTADMIN) {
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

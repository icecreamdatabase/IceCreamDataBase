"use strict"
const util = require('util')
//CLASSES
const Logger = require('../../helper/Logger')
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

    await this.handleTtsCommands(privMsgObj)

    if (Object.prototype.hasOwnProperty.call(this.channelPointsSettings, privMsgObj.roomId)) {
      await this.handleTtsRedeem(privMsgObj)
    }
  }

  /**
   * Handle the privMsgObj by checking for all TTS register related triggers.
   * Stuff like: !tts register, !tts help, ...
   * @param privMsgObj created in PrivMsg.js
   * @returns {Promise<boolean>}
   */
  async handleTtsCommands (privMsgObj) {
    if (privMsgObj.message.toLowerCase().startsWith(ttsStrings.prefix)
      && (this.bot.channels[privMsgObj.roomId].useChannelPoints
        || this.bot.channels[privMsgObj.roomId].ttsRegisterEnabled)
      && (this.ttsCommandLastUsage + ttsCommandCooldownMs < Date.now()
        || privMsgObj.userLevel >= UserLevels.MODERATOR)
    ) {
      this.ttsCommandLastUsage = Date.now()
      let command = privMsgObj.message.substr(ttsStrings.prefix.length + 1).trim()
      let responseMessage = ""

      if (command) {
        let handled = false
        for (let optionId in ttsStrings.options) {
          if (Object.prototype.hasOwnProperty.call(ttsStrings.options, optionId)
            && command.startsWith(ttsStrings.options[optionId].command)
            && optionId in this && typeof this[optionId] === "function") {
            let commandParameter = (command.substr(ttsStrings.options[optionId].command.length + 1)).trim().toLowerCase()
            try {
              responseMessage = await this[optionId](privMsgObj, ttsStrings.options[optionId], commandParameter)
            } catch (e) {
              // ignored
            }
            handled = true
          }
        }
        if (!handled) {
          responseMessage = ttsStrings.response
        }
      } else {
        responseMessage = ttsStrings.response
      }
      if (responseMessage) {
        this.bot.TwitchIRCConnection.queue.sayWithMsgObj(privMsgObj, "@" + privMsgObj.username + ", " + responseMessage)
      }
      return true
    }
    return false
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Handle the !tts register command
   * @param privMsgObj
   * @param optionObj
   * @param parameter
   * @returns {Promise<string>}
   */
  async handleRegister (privMsgObj, optionObj, parameter) {
    if (this.bot.channels[privMsgObj.roomId].ttsRegisterEnabled) {
      //channel and connection creating
      let userId = privMsgObj.userId
      let username = privMsgObj.username
      //botadmins can register for other users
      if (privMsgObj.userLevel >= UserLevels.BOTADMIN) {
        if (parameter) {
          let p1Id = await this.bot.userIdLoginCache.nameToId(parameter)
          if (p1Id !== '-1') {
            userId = p1Id
            username = parameter
          }
        }
      }
      let channelInfo = await this.bot.apiFunctions.channelInfo(userId)
      if (["partner", "affiliate"].includes(channelInfo["broadcaster_type"])) {
        await SqlChannels.addChannel(this.bot.userId, userId, username, false, false, false, true, false, true, false)
        DiscordLog.custom("tts-status-log", "Join:", username + "\n(" + channelInfo["broadcaster_type"] + ")", DiscordLog.getDecimalFromHexString("#00FF00"))
        await this.bot.updateBotChannels()
        return optionObj.response.success
      } else {
        return optionObj.response.fail
      }
    }
    return ""
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Handle the !tts unregister command
   * @param privMsgObj
   * @param optionObj
   * @param parameter
   * @returns {Promise<string>}
   */
  async handleUnregister (privMsgObj, optionObj, parameter) {
    if (privMsgObj.userLevel >= UserLevels.BROADCASTER) {
      //channel and connection creating
      let userId = privMsgObj.userId
      let username = privMsgObj.username
      //botadmins can register for other users
      if (privMsgObj.userLevel >= UserLevels.BOTADMIN) {
        if (parameter) {
          let p1Id = await this.bot.userIdLoginCache.nameToId(parameter)
          if (p1Id !== '-1') {
            userId = p1Id
            username = parameter
          }
        }
      }
      await SqlChannelPoints.dropChannel(this.bot.userId, parseInt(userId))
      DiscordLog.custom("tts-status-log", "Part:", username, DiscordLog.getDecimalFromHexString("#FF0000"))
      setTimeout(this.bot.updateBotChannels.bind(this.bot), 3000)
      //await this.bot.updateBotChannels()
      return optionObj.response
    }
    return ""
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Handle the !tts help command
   * @param privMsgObj
   * @param optionObj
   * @param parameter
   * @returns {string}
   */
  async handleHelp (privMsgObj, optionObj, parameter) {
    if (Object.prototype.hasOwnProperty.call(this.channelPointsSettings, privMsgObj.roomId) && this.channelPointsSettings[privMsgObj.roomId].ttsCustomRewardId) {
      if (Object.prototype.hasOwnProperty.call(this.channelPointsSettings, privMsgObj.roomId) && this.channelPointsSettings[privMsgObj.roomId].ttsConversation) {
        return optionObj.response.conversation
      } else {
        return optionObj.response.general
      }
    } else {
      return optionObj.response.unlinked
    }
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Handle the !tts link command
   * @param privMsgObj
   * @param optionObj
   * @param parameter
   * @returns {Promise<string>}
   */
  async handleLink (privMsgObj, optionObj, parameter) {
    if (privMsgObj.userLevel >= UserLevels.MODERATOR) {
      if (Object.prototype.hasOwnProperty.call(privMsgObj.raw.tags, "custom-reward-id")) {
        //channelPointSettings creating / updating
        await SqlChannelPoints.addChannel(this.bot.userId, privMsgObj.roomId, privMsgObj.raw.tags["custom-reward-id"], true, true)
        this.updateChannelPointSettings()
        DiscordLog.custom("tts-status-log", "Link:", privMsgObj.channel.substr(1), DiscordLog.getDecimalFromHexString("#0000FF"))
        return optionObj.response.justLinked + privMsgObj.channel.substr(1)
      } else {
        if (Object.prototype.hasOwnProperty.call(this.channelPointsSettings.hasOwnProperty, privMsgObj.roomId) && this.channelPointsSettings[privMsgObj.roomId]["ttsCustomRewardId"]) {
          return optionObj.response.alreadyLinked + privMsgObj.channel.substr(1)
        } else {
          return optionObj.response.notLinked
        }
      }
    }
    return ""
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Handle the !tts skip command
   * @param privMsgObj
   * @param optionObj
   * @param parameter
   * @returns {string}
   */
  async handleSkip (privMsgObj, optionObj, parameter) {
    if (privMsgObj.userLevel >= UserLevels.MODERATOR) {
      TtsWebSocket.skip(privMsgObj.channel)
      return optionObj.response
    }
    return ""
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Handle the !tts reload command
   * @param privMsgObj
   * @param optionObj
   * @param parameter
   * @returns {string}
   */
  async handleReload (privMsgObj, optionObj, parameter) {
    if (privMsgObj.userLevel >= UserLevels.BOTADMIN) {
      TtsWebSocket.reload()
      return optionObj.response
    }
    return ""
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Handle the !tts voices command
   * @param privMsgObj
   * @param optionObj
   * @param parameter
   * @returns {string}
   */
  async handleVoices (privMsgObj, optionObj, parameter) {
    if (Object.prototype.hasOwnProperty.call(this.channelPointsSettings, privMsgObj.roomId) && this.channelPointsSettings[privMsgObj.roomId].ttsConversation) {
      return optionObj.response.general
    } else {
      return optionObj.response.noConversation
    }
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Handle the !tts settings command
   * @param privMsgObj
   * @param optionObj
   * @param parameter
   * @returns {Promise<string>}
   */
  async handleSettings (privMsgObj, optionObj, parameter) {
    if (privMsgObj.userLevel >= UserLevels.MODERATOR) {
      let responseMessage
      if (parameter) {
        let handled = false
        for (let optionId in optionObj.options) {
          if (Object.prototype.hasOwnProperty.call(optionObj.options, optionId)
            && parameter.startsWith(optionObj.options[optionId].command)
            && optionId in this && typeof this[optionId] === "function") {
            let settingParameter = (parameter.substr(optionObj.options[optionId].command.length + 1)).trim().toLowerCase()
            try {
              console.log(settingParameter)
              responseMessage = await this[optionId](privMsgObj, optionObj, optionObj[optionId], settingParameter)
            } catch (e) {
              return optionObj.response.fail
            }
            handled = true
          }
        }
        if (!handled) {
          responseMessage = optionObj.response.fail
        }
      } else {
        responseMessage = optionObj.response.help
      }
      return responseMessage
    }
    return ""
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Handle the !tts settings sub command
   * @param privMsgObj
   * @param optionObj
   * @param settingObj
   * @param parameter
   * @returns {Promise<string>}
   */
  async handleSettingSubscriber (privMsgObj, optionObj, settingObj, parameter) {
    if (parameter) {
      await SqlChannelPoints.setSettingUserLevelSubonly(this.bot.userId, privMsgObj.roomId, JSON.parse(parameter))
      this.updateChannelPointSettings()
      return optionObj.response.successful
    } else {
      return optionObj.response.get + " \"" + !!this.channelPointsSettings[privMsgObj.roomId].ttsUserLevel + "\""
    }
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Handle the !tts settings conversation command
   * @param privMsgObj
   * @param optionObj
   * @param settingObj
   * @param parameter
   * @returns {Promise<string>}
   */
  async handleSettingConversation (privMsgObj, optionObj, settingObj, parameter) {
    if (parameter) {
      await SqlChannelPoints.setSettingConversation(this.bot.userId, privMsgObj.roomId, JSON.parse(parameter))
      this.updateChannelPointSettings()
      return optionObj.response.successful
    } else {
      return optionObj.response.get + " \"" + !!this.channelPointsSettings[privMsgObj.roomId].ttsConversation + "\""
    }
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Handle the !tts settings voice command
   * @param privMsgObj
   * @param optionObj
   * @param settingObj
   * @param parameter
   * @returns {Promise<string>}
   */
  async handleSettingVoice (privMsgObj, optionObj, settingObj, parameter) {
    if (parameter) {
      let voice
      if ((voice = TtsWebSocket.getVoiceID(parameter, false))) {
        await SqlChannelPoints.setSettingDefaultVoice(this.bot.userId, privMsgObj.roomId, voice)
        this.updateChannelPointSettings()
        return optionObj.response.successful
      } else {
        return optionObj.response.fail
      }
    } else {
      return optionObj.response.get + " \"" + this.channelPointsSettings[privMsgObj.roomId].ttsDefaultVoiceName + "\""
    }
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Handle the !tts settings queue command
   * @param privMsgObj
   * @param optionObj
   * @param settingObj
   * @param parameter
   * @returns {Promise<string>}
   */
  async handleSettingQueue (privMsgObj, optionObj, settingObj, parameter) {
    if (parameter) {
      await SqlChannelPoints.setSettingQueueMessages(this.bot.userId, privMsgObj.roomId, JSON.parse(parameter))
      this.updateChannelPointSettings()
      return optionObj.response.successful
    } else {
      return optionObj.response.get + " \"" + !!this.channelPointsSettings[privMsgObj.roomId].ttsQueueMessages + "\""
    }
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Handle the !tts settings volume command
   * @param privMsgObj
   * @param optionObj
   * @param settingObj
   * @param parameter
   * @returns {Promise<string>}
   */
  async handleSettingVolume (privMsgObj, optionObj, settingObj, parameter) {
    if (parameter) {
      let volume = parseInt(parameter)
      if (0 <= volume && volume <= 100) {
        await SqlChannelPoints.setSettingVolume(this.bot.userId, privMsgObj.roomId, volume)
        this.updateChannelPointSettings()
        return optionObj.response.successful
      } else {
        return optionObj.response.failRange
      }
    } else {
      return optionObj.response.get + " \"" + this.channelPointsSettings[privMsgObj.roomId].ttsVolume + "\""
    }
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Handle the !tts settings maxmessagetime command
   * @param privMsgObj
   * @param optionObj
   * @param settingObj
   * @param parameter
   * @returns {Promise<string>}
   */
  async handleSettingMaxMessageTime (privMsgObj, optionObj, settingObj, parameter) {
    if (parameter) {
      let maxMessageTime = parseInt(parameter)
      if (0 <= maxMessageTime && maxMessageTime <= 300) {
        await SqlChannelPoints.setSettingMaxMessageTime(this.bot.userId, privMsgObj.roomId, maxMessageTime)
        this.updateChannelPointSettings()
        return optionObj.response.successful
      } else {
        return optionObj.response.failRange
      }
    } else {
      return optionObj.response.get + " \"" + this.channelPointsSettings[privMsgObj.roomId].ttsMaxMessageTime + "\""
    }
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Handle the !tts settings cooldown command
   * @param privMsgObj
   * @param optionObj
   * @param settingObj
   * @param parameter
   * @returns {Promise<string>}
   */
  async handleSettingCooldown (privMsgObj, optionObj, settingObj, parameter) {
    if (parameter) {
      let cooldown = parseInt(parameter)
      if (0 <= cooldown && cooldown <= 300) {
        await SqlChannelPoints.setSettingCooldown(this.bot.userId, privMsgObj.roomId, cooldown)
        this.updateChannelPointSettings()
        return optionObj.response.successful
      } else {
        return optionObj.response.failRange
      }
    } else {
      return optionObj.response.get + " \"" + this.channelPointsSettings[privMsgObj.roomId].ttsCooldown + "\""
    }
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Handle the !tts settings timeoutcheck command
   * @param privMsgObj
   * @param optionObj
   * @param settingObj
   * @param parameter
   * @returns {Promise<string>}
   */
  async handleSettingTimeoutCheckTime (privMsgObj, optionObj, settingObj, parameter) {
    if (parameter) {
      let timeoutCheckTime = parseInt(parameter)
      if (0 <= timeoutCheckTime && timeoutCheckTime <= 30) {
        await SqlChannelPoints.setSettingTimeoutcheckTime(this.bot.userId, privMsgObj.roomId, timeoutCheckTime)
        this.updateChannelPointSettings()
        return optionObj.response.successful
      } else {
        return optionObj.response.failRange
      }
    } else {
      return optionObj.response.get + " \"" + this.channelPointsSettings[privMsgObj.roomId].ttsTimeoutCheckTime + "\""
    }
  }

  /**
   * Handle the privMsgObj by checking for all TTS redemption related triggers.
   * @param privMsgObj created in PrivMsg.js
   * @returns {Promise<boolean>}
   */
  async handleTtsRedeem (privMsgObj) {
    let hasTakenAction = false
    if (Object.prototype.hasOwnProperty.call(privMsgObj.raw.tags, "custom-reward-id")) {
      let returnMessage
      let settingObj = this.channelPointsSettings[privMsgObj.roomId]
      if (settingObj.ttsUserLevel <= privMsgObj.userLevel) {
        if (settingObj.ttsCooldown * 1000 + (this.lastTts[privMsgObj.roomId] || 0) < Date.now() || privMsgObj.userLevel >= UserLevels.BOTADMIN) {
          this.lastTts[privMsgObj.roomId] = Date.now()

          if (settingObj.ttsCustomRewardId === privMsgObj.raw.tags["custom-reward-id"]) {
            let wasSent = await TtsWebSocket.sendTtsWithTimeoutCheck(privMsgObj, settingObj.ttsConversation, settingObj.ttsQueueMessages, settingObj.ttsVolume, settingObj.ttsDefaultVoiceName, settingObj.ttsTimeoutCheckTime, settingObj.ttsMaxMessageTime)
            //Logger.log("Was sent: " + wasSent)
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

"use strict"
const util = require('util')
//CLASSES
const Logger = require('../../../helper/Logger')
const SqlChannels = require('../../../sql/main/SqlChannels')
const SqlChannelPoints = require('../../../sql/modules/SqlChannelPoints')
const DiscordLog = require('../../../helper/DiscordLog')
const TtsWebSocket = new (require('./TtsWebSocket')) //singleton
const UserLevels = require("../../../../ENUMS/UserLevels")
const ttsStrings = require("../../../../json/tts-strings")

const UPDATE_INTERVAL = 30000//ms
const ttsCommandCooldownMs = 3000

module.exports = class Tts {
  constructor (bot) {
    this.bot = bot

    this.channelPointsSettings = {}
    this.lastTts = {}
    this.ttsCommandLastUsage = {}

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

  isCooldownOver (channelId, userLevel) {
    let lastUsage = this.ttsCommandLastUsage[channelId] || 0
    let cooldownPassed = ttsCommandCooldownMs + lastUsage < Date.now()
    cooldownPassed = cooldownPassed || userLevel >= UserLevels.MODERATOR
    if (cooldownPassed) {
      this.ttsCommandLastUsage[channelId] = Date.now()
    }
    return cooldownPassed
  }

  /**
   * Handle the privMsgObj by checking for all TTS register related triggers.
   * Stuff like: !tts register, !tts help, ...
   * @param privMsgObj created in PrivMsg.js
   * @returns {Promise<boolean>}
   */
  async handleTtsCommands (privMsgObj) {
    if (privMsgObj.message.toLowerCase().startsWith(ttsStrings.prefix)
      && (this.bot.irc.channels[privMsgObj.roomId].useChannelPoints
        || this.bot.irc.channels[privMsgObj.roomId].ttsRegisterEnabled)
    ) {
      let command = privMsgObj.message.substr(ttsStrings.prefix.length + 1).trim().toLowerCase()
      let responseMessage = ""

      let handled = false
      if (command) {
        for (let optionId in ttsStrings.options) {
          if (Object.prototype.hasOwnProperty.call(ttsStrings.options, optionId)
            && command.startsWith(ttsStrings.options[optionId].command)
            && optionId in this && typeof this[optionId] === "function") {
            if (ttsStrings.options[optionId].ignoreCooldown || this.isCooldownOver(privMsgObj.roomId, privMsgObj.userLevel)) {
              let commandParameter = (command.substr(ttsStrings.options[optionId].command.length + 1)).trim().toLowerCase()
              try {
                responseMessage = await this[optionId](privMsgObj, ttsStrings.options[optionId], commandParameter)
              } catch (e) {
                // ignored
              }
            }
            handled = true
          }
        }
      }
      if (!handled && (ttsStrings.ignorecooldown || this.isCooldownOver(privMsgObj.roomId, privMsgObj.userLevel))) {
        responseMessage = ttsStrings.response
      }
      if (responseMessage) {
        this.bot.irc.queue.sayWithMsgObj(privMsgObj, `${ttsStrings.globalResponsePrefix} @${privMsgObj.username}, ${responseMessage}`)
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
    if (this.bot.irc.channels[privMsgObj.roomId].ttsRegisterEnabled) {
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
      let channelInfo = await this.bot.api.kraken.channelInfo(userId)
      if (["partner", "affiliate"].includes(channelInfo["broadcaster_type"])) {
        await SqlChannels.addChannel(this.bot.userId, userId, username, false, false, false, true, false, true, false)
        DiscordLog.custom("tts-status-log", "Join:", username + "\n(" + channelInfo["broadcaster_type"] + ")", DiscordLog.getDecimalFromHexString("#00FF00"))
        await this.bot.irc.updateBotChannels()
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
      setTimeout(this.bot.irc.updateBotChannels.bind(this.bot.irc), 3000)
      //await this.bot.irc.updateBotChannels()
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
        await SqlChannelPoints.addChannel(this.bot.userId, privMsgObj.roomId, privMsgObj.raw.tags["custom-reward-id"])
        this.updateChannelPointSettings()
        DiscordLog.custom("tts-status-log", "Link:", privMsgObj.channel.substr(1), DiscordLog.getDecimalFromHexString("#0000FF"))
        return optionObj.response.justLinked + privMsgObj.channel.substr(1)
      } else {
        if (Object.prototype.hasOwnProperty.call(this.channelPointsSettings, privMsgObj.roomId) && this.channelPointsSettings[privMsgObj.roomId]["ttsCustomRewardId"]) {
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
   * Handle the !tts stats command
   * @param privMsgObj
   * @param optionObj
   * @param parameter
   * @returns {string}
   */
  async handleStats (privMsgObj, optionObj, parameter) {
    let websocketClientCount = TtsWebSocket.websocketClientCount
    let linkedIds = Object.keys(this.bot.irc.privMsg.channelPoints.tts.channelPointsSettings)
    let linkedCount = linkedIds.length

    let channelInfos = await this.bot.api.kraken.channelInfosFromIds(linkedIds)
    let broadCasterTypeCount = {partner: 0, affiliate: 0, "": 0}
    channelInfos.forEach(x => broadCasterTypeCount[x.broadcaster_type]++)

    let response = optionObj.response.toString()
    response = response.replace("${linkedCount}", linkedCount.toString())
    response = response.replace("${websocketclientCount}", websocketClientCount.toString())
    response = response.replace("${partnerCount}", broadCasterTypeCount.partner.toString())
    response = response.replace("${affiliateCount}", broadCasterTypeCount.affiliate.toString())
    response = response.replace("${neitherCount}", broadCasterTypeCount[""].toString())
    return response
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
      let responseMessage = ""
      if (parameter) {
        let handled = false
        for (let optionId in optionObj.options) {
          if (Object.prototype.hasOwnProperty.call(optionObj.options, optionId)
            && parameter.startsWith(optionObj.options[optionId].command)
            && optionId in this && typeof this[optionId] === "function") {
            let settingParameter = (parameter.substr(optionObj.options[optionId].command.length + 1)).trim().toLowerCase()
            let newValue
            try {
              newValue = await this[optionId](privMsgObj.roomId, settingParameter)
              if (settingParameter) {
                responseMessage += `${optionObj.response.successful} `
              }
            } catch (e) {
              newValue = await this[optionId](privMsgObj.roomId, "")
              responseMessage += `${optionObj.response.failRange} `
            }
            responseMessage += `${optionObj.response.get} "${newValue}" `
            if (!settingParameter) {
              responseMessage += `— Options: "${optionObj.options[optionId].options}" — Description: ${optionObj.options[optionId].description}`
            }
            handled = true
          }
        }
        if (!handled) {
          responseMessage = optionObj.response.failNotAnOption
        }
      } else {
        responseMessage = optionObj.response.help
      }
      return responseMessage
    }
    return ""
  }

  /* Setting sub commands START */

  // noinspection JSUnusedGlobalSymbols
  /**
   * Handle the !tts settings sub command
   * @param roomId
   * @param parameter
   * @returns {Promise<string|number|boolean>}
   */
  async handleSettingSubscriber (roomId, parameter) {
    if (parameter) {
      await SqlChannelPoints.setSettingUserLevelSubonly(this.bot.userId, roomId, JSON.parse(parameter))
      await this.updateChannelPointSettings()
    }
    return !!this.channelPointsSettings[roomId].ttsUserLevel
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Handle the !tts settings conversation command
   * @param roomId
   * @param parameter
   * @returns {Promise<string|number|boolean>}
   */
  async handleSettingConversation (roomId, parameter) {
    if (parameter) {
      await SqlChannelPoints.setSettingConversation(this.bot.userId, roomId, JSON.parse(parameter))
      await this.updateChannelPointSettings()
    }
    return !!this.channelPointsSettings[roomId].ttsConversation
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Handle the !tts settings voice command
   * @param roomId
   * @param parameter
   * @returns {Promise<string|number|boolean>}
   */
  async handleSettingVoice (roomId, parameter) {
    if (parameter) {
      let voice
      if ((voice = TtsWebSocket.getVoiceID(parameter, false))) {
        await SqlChannelPoints.setSettingDefaultVoice(this.bot.userId, roomId, voice)
        await this.updateChannelPointSettings()
      } else {
        throw ("")
      }
    }
    return this.channelPointsSettings[roomId].ttsDefaultVoiceName
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Handle the !tts settings queue command
   * @param roomId
   * @param parameter
   * @returns {Promise<string|number|boolean>}
   */
  async handleSettingQueue (roomId, parameter) {
    if (parameter) {
      await SqlChannelPoints.setSettingQueueMessages(this.bot.userId, roomId, JSON.parse(parameter))
      await this.updateChannelPointSettings()
    }
    return !!this.channelPointsSettings[roomId].ttsQueueMessages
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Handle the !tts settings volume command
   * @param roomId
   * @param parameter
   * @returns {Promise<string|number|boolean>}
   */
  async handleSettingVolume (roomId, parameter) {
    if (parameter) {
      let volume = parseInt(parameter)
      if (0 <= volume && volume <= 100) {
        await SqlChannelPoints.setSettingVolume(this.bot.userId, roomId, volume)
        await this.updateChannelPointSettings()
      } else {
        throw ("")
      }
    }
    return this.channelPointsSettings[roomId].ttsVolume
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Handle the !tts settings maxmessagetime command
   * @param roomId
   * @param parameter
   * @returns {Promise<string|number|boolean>}
   */
  async handleSettingMaxMessageTime (roomId, parameter) {
    if (parameter) {
      let maxMessageTime = parseInt(parameter)
      if (0 <= maxMessageTime && maxMessageTime <= 300) {
        await SqlChannelPoints.setSettingMaxMessageTime(this.bot.userId, roomId, maxMessageTime)
        await this.updateChannelPointSettings()
      } else {
        throw ("")
      }
    }
    return this.channelPointsSettings[roomId].ttsMaxMessageTime
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Handle the !tts settings cooldown command
   * @param roomId
   * @param parameter
   * @returns {Promise<string|number|boolean>}
   */
  async handleSettingCooldown (roomId, parameter) {
    if (parameter) {
      let cooldown = parseInt(parameter)
      if (0 <= cooldown && cooldown <= 300) {
        await SqlChannelPoints.setSettingCooldown(this.bot.userId, roomId, cooldown)
        await this.updateChannelPointSettings()
      } else {
        throw ("")
      }
    }
    return this.channelPointsSettings[roomId].ttsCooldown
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Handle the !tts settings timeoutcheck command
   * @param roomId
   * @param parameter
   * @returns {Promise<string|number|boolean>}
   */
  async handleSettingTimeoutCheckTime (roomId, parameter) {
    if (parameter) {
      let timeoutCheckTime = parseInt(parameter)
      if (0 <= timeoutCheckTime && timeoutCheckTime <= 30) {
        await SqlChannelPoints.setSettingTimeoutcheckTime(this.bot.userId, roomId, timeoutCheckTime)
        await this.updateChannelPointSettings()
      } else {
        throw ("")
      }
    }
    return this.channelPointsSettings[roomId].ttsTimeoutCheckTime
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Handle the !tts settings customPlaybackrate command
   * @param roomId
   * @param parameter
   * @returns {Promise<string|number|boolean>}
   */
  async handleSettingAllowCustomPlaybackrate (roomId, parameter) {
    if (parameter) {
      await SqlChannelPoints.setSettingAllowCustomPlaybackrate(this.bot.userId, roomId, JSON.parse(parameter))
      await this.updateChannelPointSettings()
    }
    return !!this.channelPointsSettings[roomId].ttsAllowCustomPlaybackrate
  }

  /* Setting sub commands END */

  /**
   * Handle the privMsgObj by checking for all TTS redemption related triggers.
   * @param privMsgObj created in PrivMsg.js
   * @returns {Promise<boolean>}
   */
  async handleTtsRedeem (privMsgObj) {
    let hasTakenAction = false
    if (Object.prototype.hasOwnProperty.call(privMsgObj.raw.tags, "custom-reward-id")) {
      let responseMessage
      let settingObj = this.channelPointsSettings[privMsgObj.roomId]
      if (settingObj.ttsUserLevel <= privMsgObj.userLevel) {
        if (settingObj.ttsCooldown * 1000 + (this.lastTts[privMsgObj.roomId] || 0) < Date.now() || privMsgObj.userLevel >= UserLevels.BOTADMIN) {
          this.lastTts[privMsgObj.roomId] = Date.now()

          if (settingObj.ttsCustomRewardId === privMsgObj.raw.tags["custom-reward-id"]) {
            let wasSent = await TtsWebSocket.sendTtsWithTimeoutCheck(
              privMsgObj,
              settingObj.ttsConversation,
              settingObj.ttsQueueMessages,
              settingObj.ttsAllowCustomPlaybackrate,
              settingObj.ttsVolume,
              settingObj.ttsDefaultVoiceName,
              settingObj.ttsTimeoutCheckTime,
              settingObj.ttsMaxMessageTime
            )
            //Logger.log("Was sent: " + wasSent)
            if (wasSent) {
              //Accept
              responseMessage = settingObj.ttsAcceptMessage
            } else {
              //Reject timeout
              responseMessage = settingObj.ttsRejectTimeoutMessage
            }
            hasTakenAction = true
          }
        } else {
          //Reject cooldown
          responseMessage = settingObj.ttsRejectCooldownMessage
        }
      } else {
        //Reject userlevel
        responseMessage = settingObj.ttsRejectUserLevelMessage
      }
      if (responseMessage) {
        /* We might need to enable it it again at some point. But right now it's unused */
        //responseMessage = await Helper.replaceParameterMessage(privMsgObj, responseMessage)

        this.bot.irc.queue.sayWithMsgObj(privMsgObj, `${ttsStrings.globalResponsePrefix} @${privMsgObj.username}, ${responseMessage}`)
        hasTakenAction = true
      }
    }
    return hasTakenAction
  }

  /**
   * Update Tts.channelPointsSettings from the Database
   * @returns {Promise<void>}
   */
  async updateChannelPointSettings () {
    this.channelPointsSettings = await SqlChannelPoints.getChannelPointsSettings(this.bot.userId)
  }
}

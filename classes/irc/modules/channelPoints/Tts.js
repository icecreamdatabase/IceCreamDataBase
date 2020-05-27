"use strict"
//CLASSES
const SqlChannels = require('../../../sql/main/SqlChannels')
const SqlChannelPoints = require('../../../sql/modules/SqlChannelPoints')
const DiscordLog = require('../../../helper/DiscordLog')
const TtsWebSocket = new (require('./TtsWebSocket')) //singleton
const UserLevels = require("../../../../ENUMS/UserLevels")
const ttsStrings = require("../../../../json/tts-strings")

const ttsCommandCooldownMs = 3000

class Tts {
  /**
   * @param {Bot} bot
   */
  constructor (bot) {
    this._bot = bot

    this.lastTts = {}
    this.ttsCommandLastUsage = {}
  }

  /**
   * @return {Bot}
   */
  get bot () {
    return this._bot
  }

  get channelPointsSettings () {
    return this.bot.irc.privMsg.channelPoints.channelPointsSettings
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
      if (Object.prototype.hasOwnProperty.call(this.channelPointsSettings, privMsgObj.roomId) && this.channelPointsSettings[privMsgObj.roomId].conversation) {
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
        await this.bot.irc.privMsg.channelPoints.updateChannelPointSettings()
        DiscordLog.custom("tts-status-log", "Link:", privMsgObj.channel.substr(1), DiscordLog.getDecimalFromHexString("#0000FF"))
        return optionObj.response.justLinked + privMsgObj.channel.substr(1)
      } else {
        if (Object.prototype.hasOwnProperty.call(this.channelPointsSettings, privMsgObj.roomId) && this.channelPointsSettings[privMsgObj.roomId].ttsCustomRewardId) {
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
    let linkedIds = Object.keys(this.channelPointsSettings)
    let linkedCount = linkedIds.length

    let channelInfos = await this.bot.api.kraken.channelInfosFromIds(linkedIds)
    let broadCasterTypeCount = {partner: 0, affiliate: 0, "": 0}
    channelInfos.forEach(x => broadCasterTypeCount[x.broadcaster_type]++)

    let usageInfo = await SqlChannelPoints.ttsUsageStats()

    let response = optionObj.response.toString()
    response = response.replace("${linkedCount}", linkedCount.toString())
    response = response.replace("${websocketclientCount}", websocketClientCount.toString())
    response = response.replace("${partnerCount}", broadCasterTypeCount.partner.toString())
    response = response.replace("${affiliateCount}", broadCasterTypeCount.affiliate.toString())
    response = response.replace("${neitherCount}", broadCasterTypeCount[""].toString())

    console.log(usageInfo.hour.toString())
    response = response.replace("${messageCountPastMinute}", usageInfo.minute.toString())
    response = response.replace("${messageCountPastHour}", usageInfo.hour.toString())
    response = response.replace("${messageCountPastDay}", usageInfo.day.toString())
    response = response.replace("${messageCountPastWeek}", usageInfo.week.toString())
    response = response.replace("${messageCountPastMonth}", usageInfo.month.toString())

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
    if (Object.prototype.hasOwnProperty.call(this.channelPointsSettings, privMsgObj.roomId) && this.channelPointsSettings[privMsgObj.roomId].conversation) {
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
      this.channelPointsSettings[roomId].subOnly = JSON.parse(parameter)
    }
    return !!this.channelPointsSettings[roomId].subOnly
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
      this.channelPointsSettings[roomId].conversation = JSON.parse(parameter)
    }
    return !!this.channelPointsSettings[roomId].conversation
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
        this.channelPointsSettings[roomId].defaultVoiceName = voice
      } else {
        throw ("")
      }
    }
    return this.channelPointsSettings[roomId].defaultVoiceName
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
      this.channelPointsSettings[roomId].queue = JSON.parse(parameter)
    }
    return !!this.channelPointsSettings[roomId].queue
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
        this.channelPointsSettings[roomId].volume = volume
      } else {
        throw ("")
      }
    }
    return this.channelPointsSettings[roomId].volume
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
        this.channelPointsSettings[roomId].maxMessageTime = maxMessageTime
      } else {
        throw ("")
      }
    }
    return this.channelPointsSettings[roomId].maxMessageTime
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
        this.channelPointsSettings[roomId].cooldown = cooldown
      } else {
        throw ("")
      }
    }
    return this.channelPointsSettings[roomId].cooldown
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
        this.channelPointsSettings[roomId].timeoutCheckTime = timeoutCheckTime
      } else {
        throw ("")
      }
    }
    return this.channelPointsSettings[roomId].timeoutCheckTime
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
      this.channelPointsSettings[roomId].allowCustomPlaybackrate = JSON.parse(parameter)
    }
    return !!this.channelPointsSettings[roomId].allowCustomPlaybackrate
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
      if (settingObj.subOnly ? UserLevels.SUB : UserLevels.DEFAULT <= privMsgObj.userLevel) {
        if (settingObj.cooldown * 1000 + (this.lastTts[privMsgObj.roomId] || 0) < Date.now() || privMsgObj.userLevel >= UserLevels.BOTADMIN) {
          this.lastTts[privMsgObj.roomId] = Date.now()

          if (settingObj.ttsCustomRewardId === privMsgObj.raw.tags["custom-reward-id"]) {
            let wasSent = await TtsWebSocket.sendTtsWithTimeoutCheck(
              privMsgObj,
              settingObj.conversation,
              settingObj.queue,
              settingObj.allowCustomPlaybackrate,
              settingObj.volume,
              settingObj.defaultVoiceName,
              settingObj.timeoutCheckTime,
              settingObj.maxMessageTime
            )
            if (wasSent) {
              //Accept
              responseMessage = ttsStrings.redemeResponse.acceptMessage
            } else {
              //Reject timeout
              responseMessage = ttsStrings.redemeResponse.time
            }
            hasTakenAction = true
          }
        } else {
          //Reject cooldown
          responseMessage = ttsStrings.redemeResponse.rejectCooldownMessage
        }
      } else {
        //Reject userlevel
        responseMessage = ttsStrings.redemeResponse.rejectUserLevelMessage
      }

      if (responseMessage) {
        this.bot.irc.queue.sayWithMsgObj(privMsgObj, `${ttsStrings.globalResponsePrefix} @${privMsgObj.username}, ${responseMessage}`)
        hasTakenAction = true
      }
    }
    return hasTakenAction
  }
}

module.exports = Tts

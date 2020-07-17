"use strict"

const path = require("path")
const fs = require("fs")
//CLASSES
const SqlChannels = require('../../../sql/main/SqlChannels')
const SqlChannelPoints = require('../../../sql/modules/SqlChannelPoints')
const DiscordLog = require('../../../helper/DiscordLog')
const TtsWebSocket = require('./TtsWebSocket')
const UserLevels = require("../../../../ENUMS/UserLevels")
const ttsStrings = require("../../../../json/tts-strings")
const Logger = require("../../../helper/Logger")

/** @type {number} */
const ttsCommandCooldownMs = 3000

class Tts {
  /**
   * @param {Bot} bot
   */
  constructor (bot) {
    this._bot = bot

    this.lastTts = {}
    this.ttsCommandLastUsage = {}

    /** @type {boolean} */
    this.enableTts = true
    this.updateTtsEnabled()
    this.bot.on(this.bot.refreshEventName, this.updateTtsEnabled.bind(this))
    setInterval(this.updateTtsEnabled.bind(this), 60000)
  }

  updateTtsEnabled () {
    let file = fs.readFileSync(path.resolve(__dirname, "../../../../config.json"))
    let enabled = JSON.parse(file)["tts-enabled"]
    this.enableTts = enabled === undefined ? true : enabled
  }

  /**
   * @return {Bot}
   */
  get bot () {
    return this._bot
  }

  /**
   * @return {SqlChannelPoints[]}
   */
  get channelPointsSettings () {
    return this.bot.irc.privMsg.channelPoints.channelPointsSettings
  }

  hasChannelPointsSettingsForId (userId) {
    return this.bot.irc.privMsg.channelPoints.hasSettingsForChannelID(userId)
  }

  /**
   * Handle the privMsgObj by checking for all TTS related triggers.
   * @param {privMsgObj} privMsgObj
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
   * @param {privMsgObj} privMsgObj
   * @returns {Promise<boolean>}
   */
  async handleTtsCommands (privMsgObj) {
    let responseMessage = ""
    let commands = privMsgObj.message.trim().toLowerCase().split(' ')

    if (commands[0] === ttsStrings.prefix
      && (this.bot.irc.channels[privMsgObj.roomId].useChannelPoints
        || this.bot.irc.channels[privMsgObj.roomId].ttsRegisterEnabled)
    ) {

      let channelPointsObj = this.bot.irc.privMsg.channelPoints.getSettingObj(privMsgObj.roomId)
      if (channelPointsObj && channelPointsObj.muted && privMsgObj.userLevel < UserLevels.BROADCASTER) {
        return false
      }

      let handled = false
      if (commands.length === 1
        && (ttsStrings.ignorecooldown || this.isCooldownOver(privMsgObj.roomId, privMsgObj.userLevel))) {
        responseMessage = ttsStrings.response
      } else if (commands[0]) {
        for (let optionId in ttsStrings.options) {
          if (Object.prototype.hasOwnProperty.call(ttsStrings.options, optionId)
            && ttsStrings.options[optionId].commands.includes(commands[1])
            && optionId in this && typeof this[optionId] === "function") {
            if (ttsStrings.options[optionId].ignoreCooldown || this.isCooldownOver(privMsgObj.roomId, privMsgObj.userLevel)) {
              try {
                responseMessage = await this[optionId](privMsgObj, ttsStrings.options[optionId], commands.slice(2))
              } catch (e) {
                Logger.warn(e.stack)
              }
            }
            handled = true
          }
        }
      }
      if (responseMessage) {
        this.bot.irc.ircConnector.sayWithMsgObj(privMsgObj, `${ttsStrings.globalResponsePrefix} @${privMsgObj.username}, ${responseMessage}`)
      }
      return true
    }
    return false
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Handle the !tts register command
   * @param {privMsgObj} privMsgObj
   * @param {Object} optionObj
   * @param {string[]} parameters
   * @returns {Promise<string>}
   */
  async handleRegister (privMsgObj, optionObj, parameters) {
    if (this.bot.irc.channels[privMsgObj.roomId].ttsRegisterEnabled) {
      if (!this.enableTts) {
        return ttsStrings.ttsOfflineMessage
      }
      //channel and connection creating
      let userId = privMsgObj.userId
      let username = privMsgObj.username
      //botadmins can register for other users
      if (privMsgObj.userLevel >= UserLevels.BOTADMIN) {
        if (parameters[0]) {
          let p1Id = await this.bot.userIdLoginCache.nameToId(parameters[0])
          if (p1Id !== '-1') {
            userId = p1Id
            username = parameters[0]
          }
        }
      }
      let channelInfo = await this.bot.api.kraken.channelInfo(userId)
      if (["partner", "affiliate"].includes(channelInfo["broadcaster_type"])) {
        await SqlChannels.addChannel(this.bot.userId, userId, username, false, false, false, true, false, true, false)
        DiscordLog.custom("tts-status-log", "Join:", username + "\n(" + channelInfo["broadcaster_type"] + ")", DiscordLog.getDecimalFromHexString("#00FF00"))
        this.bot.irc.updateBotChannels().then(() => {
          this.bot.irc.ircConnector.rejoinChannel(username).then()
        })
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
   * @param {privMsgObj} privMsgObj
   * @param {Object} optionObj
   * @param {string[]} parameters
   * @returns {Promise<string>}
   */
  async handleUnregister (privMsgObj, optionObj, parameters) {
    if (privMsgObj.userLevel >= UserLevels.BROADCASTER) {
      //channel and connection creating
      let userId = privMsgObj.userId
      let username = privMsgObj.username
      //botadmins can register for other users
      if (privMsgObj.userLevel >= UserLevels.BOTADMIN) {
        if (parameters[0]) {
          let p1Id = await this.bot.userIdLoginCache.nameToId(parameters[0])
          if (p1Id !== '-1') {
            userId = p1Id
            username = parameters[0]
          }
        }
      }
      await SqlChannelPoints.dropChannel(this.bot.userId, parseInt(userId))
      DiscordLog.custom("tts-status-log", "Part:", username, DiscordLog.getDecimalFromHexString("#FF0000"))
      setTimeout(this.bot.irc.updateBotChannels.bind(this.bot.irc), 1000) // Delay could in theory even be removed because we have separate send and receive connections
      //await this.bot.irc.updateBotChannels()
      return optionObj.response
    }
    return ""
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Handle the !tts help command
   * @param {privMsgObj} privMsgObj
   * @param {Object} optionObj
   * @param {string[]} parameters
   * @returns {string}
   */
  async handleHelp (privMsgObj, optionObj, parameters) {
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
   * @param {privMsgObj} privMsgObj
   * @param {Object} optionObj
   * @param {string[]} parameters
   * @returns {Promise<string>}
   */
  async handleLink (privMsgObj, optionObj, parameters) {
    if (privMsgObj.userLevel >= UserLevels.MODERATOR) {
      if (Object.prototype.hasOwnProperty.call(privMsgObj.raw.tags, "custom-reward-id")) {
        //channelPointSettings creating / updating
        await SqlChannelPoints.addChannel(this.bot.userId, privMsgObj.roomId, privMsgObj.raw.tags["custom-reward-id"])
        await this.bot.irc.privMsg.channelPoints.updateChannelPointSettings()
        DiscordLog.custom("tts-status-log", "Link:", privMsgObj.channel.substr(1), DiscordLog.getDecimalFromHexString("#0000FF"))
        return optionObj.response.justLinked + privMsgObj.channel.substr(1) + " " // This space is important! Else we'll have issues with the \u{E0000} somehow FeelsDankMan
      } else {
        if (Object.prototype.hasOwnProperty.call(this.channelPointsSettings, privMsgObj.roomId) && this.channelPointsSettings[privMsgObj.roomId].ttsCustomRewardId) {
          return optionObj.response.alreadyLinked + privMsgObj.channel.substr(1) + " " // This space is important! Else we'll have issues with the \u{E0000} somehow FeelsDankMan
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
   * @param {privMsgObj} privMsgObj
   * @param {Object} optionObj
   * @param {string[]} parameters
   * @returns {string}
   */
  async handleStats (privMsgObj, optionObj, parameters) {
    let websocketClientCount = TtsWebSocket.websocketTtsClientCount
    let linkedIds = Object.keys(this.channelPointsSettings)
    let linkedCount = linkedIds.length

    //let channelInfos = await this.bot.api.kraken.channelInfosFromIds(linkedIds)
    //let broadCasterTypeCount = {partner: 0, affiliate: 0, "": 0}
    //channelInfos.forEach(x => broadCasterTypeCount[x.broadcaster_type]++)

    let usageInfo = await SqlChannelPoints.ttsUsageStats()

    let response = optionObj.response.toString()
    response = response.replace("${linkedCount}", linkedCount.toString())
    response = response.replace("${websocketclientCount}", websocketClientCount.toString())
    //response = response.replace("${partnerCount}", broadCasterTypeCount.partner.toString())
    //response = response.replace("${affiliateCount}", broadCasterTypeCount.affiliate.toString())
    //response = response.replace("${neitherCount}", broadCasterTypeCount[""].toString())
    // TODO add this again: (${partnerCount} partners and ${affiliateCount} affiliates)

    //response = response.replace("${messageCountPastMinute}", usageInfo.ttsInPastMinute.toString())
    response = response.replace("${messageCountPastHour}", usageInfo.ttsInPastHour.toString())
    //response = response.replace("${messageCountPastDay}", usageInfo.ttsInPastDay.toString())
    //response = response.replace("${messageCountPastWeek}", usageInfo.ttsInPastWeek.toString())
    //response = response.replace("${messageCountPastMonth}", usageInfo.ttsInPastMonth.toString())

    response = response.replace("${linksInPastDay}", usageInfo.linksInPastDay.toString())


    return response
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Handle the !tts skip command
   * @param {privMsgObj} privMsgObj
   * @param {Object} optionObj
   * @param {string[]} parameters
   * @returns {string}
   */
  async handleSkip (privMsgObj, optionObj, parameters) {
    if (privMsgObj.userLevel >= UserLevels.MODERATOR) {
      TtsWebSocket.skip(privMsgObj.channel)
      return optionObj.response
    }
    return ""
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Handle the !tts reload command
   * @param {privMsgObj} privMsgObj
   * @param {Object} optionObj
   * @param {string[]} parameters
   * @returns {string}
   */
  async handleReload (privMsgObj, optionObj, parameters) {
    let reloadedClientCount
    if (privMsgObj.userLevel >= UserLevels.BOTADMIN) {
      if (parameters[0] === "all") {
        reloadedClientCount = TtsWebSocket.reload()
      } else if (parameters[0] === "version") {
        reloadedClientCount = TtsWebSocket.reloadOldVersions()
      } else if (parameters[0] === "auto") {
        return "Auto reload: " + TtsWebSocket.reloadOldVersionsAutoToggle()
      } else {
        reloadedClientCount = TtsWebSocket.reload(privMsgObj.channel)
      }
      return optionObj.response + reloadedClientCount
    }
    return ""
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Handle the !tts voices command
   * @param {privMsgObj} privMsgObj
   * @param {Object} optionObj
   * @param {string[]} parameters
   * @returns {string}
   */
  async handleVoices (privMsgObj, optionObj, parameters) {
    if (Object.prototype.hasOwnProperty.call(this.channelPointsSettings, privMsgObj.roomId) && this.channelPointsSettings[privMsgObj.roomId].conversation) {
      return optionObj.response.general
    } else {
      return optionObj.response.noConversation
    }
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Handle the !tts settings command
   * @param {privMsgObj} privMsgObj
   * @param {Object} optionObj
   * @param {string[]} parameters
   * @returns {Promise<string>}
   */
  async handleSettings (privMsgObj, optionObj, parameters) {
    // Not a moderator
    if (privMsgObj.userLevel < UserLevels.MODERATOR) {
      return ""
    }

    // No setting selected --> default help with list of settings
    if (!parameters[0]) {
      return optionObj.response.help
    }

    // Not linked yet --> Telling the person to follow the instructions in "!tts help"
    if (!this.hasChannelPointsSettingsForId(privMsgObj.roomId)) {
      return optionObj.response.unlinked
    }

    // Handle messages
    let responseMessage = ""
    let handled = false
    for (let optionId in optionObj.options) {
      if (Object.prototype.hasOwnProperty.call(optionObj.options, optionId)
        && optionObj.options[optionId].commands.includes(parameters[0])
        && optionId in this && typeof this[optionId] === "function") {
        let settingParameter = parameters.slice(1).join(' ')
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
    return handled ? responseMessage : optionObj.response.failNotAnOption
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
   * @param {privMsgObj} privMsgObj
   * @returns {Promise<boolean>}
   */
  async handleTtsRedeem (privMsgObj) {
    let hasTakenAction = false
    if (Object.prototype.hasOwnProperty.call(privMsgObj.raw.tags, "custom-reward-id")) {
      let responseMessage
      let settingObj = this.channelPointsSettings[privMsgObj.roomId]
      // check: reward id
      if (settingObj.ttsCustomRewardId === privMsgObj.raw.tags["custom-reward-id"]) {
        // check: subonly
        if ((settingObj.subOnly ? UserLevels.SUB : UserLevels.DEFAULT) <= privMsgObj.userLevel) {
          // check: cooldown
          if (settingObj.cooldown === 0
            || settingObj.cooldown * 1000 + (this.lastTts[privMsgObj.roomId] || 0) < Date.now()
            || privMsgObj.userLevel >= UserLevels.BOTADMIN) {
            this.lastTts[privMsgObj.roomId] = Date.now()

            // check: timed out / deleted
            let wasSent
            if (this.enableTts) {
              wasSent = await TtsWebSocket.sendTtsWithTimeoutCheck(privMsgObj, settingObj)
            }
            if (wasSent) {
              //Accept
              responseMessage = ttsStrings.redemeResponse.acceptMessage
              hasTakenAction = true
            } else {
              //Reject timeout
              responseMessage = ttsStrings.redemeResponse.rejectTimeoutMessage
            }
          } else {
            //Reject cooldown
            responseMessage = ttsStrings.redemeResponse.rejectCooldownMessage
          }
        } else {
          //Reject userlevel
          responseMessage = ttsStrings.redemeResponse.rejectUserLevelMessage
        }

        if (!this.enableTts) {
          responseMessage = ttsStrings.ttsOfflineMessage
        }
      }
      if (responseMessage) {
        this.bot.irc.ircConnector.sayWithMsgObj(privMsgObj, `${ttsStrings.globalResponsePrefix} @${privMsgObj.username}, ${responseMessage}`)
        hasTakenAction = true
      }
    }
    return hasTakenAction
  }
}

module.exports = Tts

"use strict"
//CLASSES
const Logger = require('../../../helper/Logger')
const DiscordLog = require('../../../helper/DiscordLog')
const SqlChannelPoints = require('../../../sql/modules/SqlChannelPoints')

const lastTimeoutObj = {}

class ClearChat {
  /**
   * @param {Bot} bot
   */
  constructor (bot) {
    this._bot = bot

    this.bot.irc.ircConnector.on('CLEARCHAT', this.onClearChat.bind(this))
  }

  /**
   * @return {Bot}
   */
  get bot () {
    return this._bot
  }

  /**
   * Method from bot.TwitchIRCconnection event emitter 'CLEARCHAT'.
   * @param clearChatObj raw object from TwitchIRCconnection registerEvents
   * @returns {Promise<void>}
   */
  async onClearChat (clearChatObj) {
    let channelName = clearChatObj.param.substring(1)
    let userName = clearChatObj.trailing.toLowerCase()
    let roomId = clearChatObj.tags["room-id"]
    if (!Object.prototype.hasOwnProperty.call(lastTimeoutObj, channelName)) {
      lastTimeoutObj[channelName] = {}
    }
    lastTimeoutObj[channelName][userName] = Date.now()

    // Detect perm ban of own bot account
    if (parseInt(clearChatObj.tags["target-user-id"]) === this.bot.userId
      && !Object.prototype.hasOwnProperty.call(clearChatObj.tags, "ban-duration")) {
      DiscordLog.info(`${this.bot.userName} got banned in #${channelName}`)
      Logger.info(`${this.bot.userName} got banned in #${channelName}`)

      // Check if the bot is joined for being a TTS bot
      if (Object.prototype.hasOwnProperty.call(this.bot.irc.channels, roomId)
        && this.bot.irc.channels[roomId].useChannelPoints) {
        DiscordLog.custom("tts-status-log", "Ban:", channelName, DiscordLog.getDecimalFromHexString("#FFFF00"))
        await SqlChannelPoints.dropChannel(this.bot.userId, roomId)
        await this.bot.irc.updateBotChannels()
        this.bot.irc.ircConnector.sendWhisper(channelName, `This bot has left your channel because it got banned by a moderator. If you want to use the bot again you simply have to unban it, wait one minute and register again.`)
        DiscordLog.custom("tts-status-log", "Part:", channelName, DiscordLog.getDecimalFromHexString("#FF0000"))
      }
    }
  }

  /**
   * Check if a user was timed out before in a channel
   * @param channelName channelName to check in
   * @param userName userName to check for
   * @param secondsAgo How far ago to check
   * @returns {boolean} Was user timed out
   */
  static wasTimedOut (channelName, userName, secondsAgo = 10) {
    if (channelName.startsWith("#")) {
      channelName = channelName.substring(1)
    }
    userName = userName.toLowerCase()
    return Object.prototype.hasOwnProperty.call(lastTimeoutObj, channelName)
      && Object.prototype.hasOwnProperty.call(lastTimeoutObj[channelName], userName)
      && (secondsAgo * 1000 + (lastTimeoutObj[channelName][userName] || 0)) > Date.now()
  }
}

module.exports = ClearChat

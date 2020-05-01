"use strict"
const util = require('util')
//CLASSES
const Logger = require('../../../helper/Logger')
const DiscordLog = require('../../../helper/DiscordLog')
const HardCoded = require('../commands/Hardcoded')
const Commands = require('../commands/Commands')
const ChannelPoints = require('../channelPoints/ChannelPoints')
const Helper = require('../commands/Helper')
//ENUMS
const UserLevels = require('../../../../ENUMS/UserLevels.js')

const options = require('../../../../config.json')

module.exports = class PrivMsg {
  constructor (bot) {
    this.bot = bot

    this.hardcoded = new HardCoded(this.bot)
    this.commands = new Commands(this.bot)
    this.channelPoints = new ChannelPoints(this.bot)
    this.helper = new Helper(this.bot)

    this.bot.irc.TwitchIRCConnection.on('PRIVMSG', this.onChat.bind(this))
  }

  /**
   * Method from bot.TwitchIRCconnection event emitter 'PRIVMSG'.
   * @param obj raw object from TwitchIRCconnection registerEvents
   * @returns {Promise<boolean>} Was action taken
   */
  async onChat (obj) {
    let messageObj = PrivMsg.createRawMessageObj(obj)
    PrivMsg.handleACTION(messageObj)
    messageObj.message += " "
    PrivMsg.findAndSetUserLevel(messageObj)

    if (this.bot.isUserIdInBlacklist(messageObj.userId)) {
      Logger.debug(`User on blacklist: ${messageObj.username} (${messageObj.userId}) - Channel: ${messageObj.channel} (${messageObj.roomId})`)
      return true
    }

    if (messageObj.message.toLowerCase().startsWith("<gdpr optout ")) {
      await this.bot.addUserIdToBlacklist(messageObj.userId)
      Logger.info(`User added blacklist: ${messageObj.username} (${messageObj.userId}) - Channel: ${messageObj.channel} (${messageObj.roomId})`)
      this.bot.queue.sayWithMsgObj(messageObj, `@${messageObj.username}, You will now be completely ignored by the bot. Please give it up to 30 seconds to fully apply.`)
      return true
    }

    let channelObj = this.bot.channels[messageObj.roomId]

    if (!channelObj) {
      DiscordLog.error(`PRIVMSG without channelObj ${messageObj.roomId}`)
      return true
    }

    // If a user has typed in the channel, they must be present even if the chatterlist doesn't show them yet
    this.helper.addUsersToUserWasInChannelObj(messageObj.channel, [messageObj.username])

    if (channelObj.logMessages) {
      Logger.info("<-- " + messageObj.channel + " " + messageObj.username + ": " + messageObj.message)
    }

    //hardcoded always first
    if (channelObj.useHardcodedCommands) {
      if (this.hardcoded.handle(messageObj)) {
        return true
      }
    }

    if (channelObj.useChannelPoints) {
      // noinspection ES6MissingAwait
      this.channelPoints.handlePrivMsg(messageObj)
    }

    if (channelObj.useCommands) {
      if (this.commands.handle(messageObj)) {
        return true
      }
    }

    return false
  }

  /**
   * Determines and sets userlevel inside of messageObj
   * @param messageObj Object to set userLevel in
   */
  static findAndSetUserLevel (messageObj) {
    if (options.hasOwnProperty("botowners")
      && options.botowners.includes(messageObj.userId)) {
      messageObj.userLevel = UserLevels.BOTOWNER
    } else if (options.hasOwnProperty("botadmins")
      && options.botadmins.includes(messageObj.userId)) {
      messageObj.userLevel = UserLevels.BOTADMIN
    } else if (messageObj.raw.tags.hasOwnProperty("badges")) {
      let badges = messageObj.raw.tags.badges
      if (badges !== true) {
        let badgeSplit = badges.split(",")
        badgeSplit = badgeSplit.map((x) => UserLevels[x.split("/")[0].toUpperCase()]).filter(Boolean)
        badgeSplit.push(UserLevels.DEFAULT)
        messageObj.userLevel = Math.max(...badgeSplit)
      }
    }
  }

  /**
   * Creates the raw none handled messageObj from the raw irc object
   * @param obj irc input
   * @returns {{channel: *, raw: *, isACTION: boolean, message: *, userId: *, roomId: *, username: *}}
   */
  static createRawMessageObj (obj) {
    return {
      raw: obj,
      roomId: obj.tags['room-id'],
      channel: obj.param,
      userId: obj.tags['user-id'],
      username: obj.tags['display-name'],
      message: obj.trailing,
      isACTION: false,
      userLevel: UserLevels.DEFAULT
    }
  }

  /**
   * Handles ACTION /me messages
   * removes the leading and trailing indicator
   * sets isACTION inside the messageObj to true
   * @param messageObj by reference and created through createRawMessageObj(obj)
   */
  static handleACTION (messageObj) {
    if (messageObj.message.startsWith("\u0001ACTION")) {
      messageObj.message = messageObj.message.substring(8, messageObj.message.length - 1)
      messageObj.isACTION = true
    }
  }
}

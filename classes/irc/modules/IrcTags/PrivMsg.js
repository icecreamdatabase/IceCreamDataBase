"use strict"
const util = require('util')
//CLASSES
const Logger = require('../../../helper/Logger')
const DiscordLog = require('../../../helper/DiscordLog')
const Hardcoded = require('../commands/Hardcoded')
const Commands = require('../commands/Commands')
const ChannelPoints = require('../channelPoints/ChannelPoints')
const Helper = require('../commands/Helper')
//ENUMS
const UserLevels = require('../../../../ENUMS/UserLevels.js')

const options = require('../../../../config.json')

class PrivMsg {
  /**
   * @typedef {object} rawPrivMsgObjTags
   * @property {string} [badge-info]
   * @property {string} [badges]
   * @property {string} [color]
   * @property {string} [custom-reward-id]
   * @property {string} [display-name]
   * @property {boolean|string} [emotes]
   * @property {boolean|string} [flags]
   * @property {string} [flags]
   * @property {string} [id]
   * @property {string} [mod]
   * @property {string} [room-id]
   * @property {string} [subscriber]
   * @property {string} [tmi-sent-ts]
   * @property {string} [turbo]
   * @property {string} [user-id]
   * @property {boolean|string} [user-type]
   */

  /**
   * Raw object coming from TwitchIRCconnection.on('PRIVMSG', ...).
   * @typedef {object} rawPrivMsgObj
   * @property {rawPrivMsgObjTags} tags
   * @property {"PRIVMSG"} command
   * @property {string} prefix
   * @property {string} param
   * @property {string} trailing
   */

  /**
   * @typedef {object} privMsgObj
   * @property {rawPrivMsgObj} raw
   * @property {number|string} roomId
   * @property {string} channel
   * @property {number|string} userId
   * @property {string} username
   * @property {string} message
   * @property {boolean} isACTION
   * @property {UserLevel} userLevel
   */


  /**
   * @param {Bot} bot
   */
  constructor (bot) {
    this._bot = bot

    this._hardcoded = new Hardcoded(this.bot)
    this._commands = new Commands(this.bot)
    this._channelPoints = new ChannelPoints(this.bot)
    this._helper = new Helper(this.bot)

    this.bot.irc.twitchIrcConnection.on('PRIVMSG', this.onChat.bind(this))
  }

  /**
   * @return {Bot}
   */
  get bot () {
    return this._bot
  }

  /**
   * @return {Hardcoded}
   */
  get hardcoded () {
    return this._hardcoded
  }

  /**
   * @return {Commands}
   */
  get commands () {
    return this._commands
  }

  /**
   * @return {ChannelPoints}
   */
  get channelPoints () {
    return this._channelPoints
  }

  /**
   * @return {Helper}
   */
  get helper () {
    return this._helper
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
      //Logger.debug(`User on blacklist: ${messageObj.username} (${messageObj.userId}) - Channel: ${messageObj.channel} (${messageObj.roomId})`)
      return true
    }

    if (messageObj.message.toLowerCase().startsWith("<gdpr optout ")) {
      await this.bot.addUserIdToBlacklist(messageObj.userId)
      Logger.info(`User added blacklist: ${messageObj.username} (${messageObj.userId}) - Channel: ${messageObj.channel} (${messageObj.roomId})`)
      this.bot.queue.sayWithMsgObj(messageObj, `@${messageObj.username}, You will now be completely ignored by the bot. Please give it up to 30 seconds to fully apply.`)
      return true
    }

    let channelObj = this.bot.irc.channels[messageObj.roomId]

    if (!channelObj) {
      DiscordLog.error(`PRIVMSG without channelObj ${messageObj.roomId}\n\n${util.inspect(messageObj)}`)
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
   * @param {privMsgObj} messageObj
   */
  static findAndSetUserLevel (messageObj) {
    if (Object.prototype.hasOwnProperty.call(options, "botowners")
      && options.botowners.includes(messageObj.userId)) {
      messageObj.userLevel = UserLevels.BOTOWNER
    } else if (Object.prototype.hasOwnProperty.call(options, "botadmins")
      && options.botadmins.includes(messageObj.userId)) {
      messageObj.userLevel = UserLevels.BOTADMIN
    } else if (Object.prototype.hasOwnProperty.call(messageObj.raw.tags, "badges")) {
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
   * @param {rawPrivMsgObj} obj irc input
   * @returns {privMsgObj}
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
   * @param {privMsgObj} messageObj
   */
  static handleACTION (messageObj) {
    if (messageObj.message.startsWith("\u0001ACTION")) {
      messageObj.message = messageObj.message.substring(8, messageObj.message.length - 1)
      messageObj.isACTION = true
    }
  }
}

module.exports = PrivMsg

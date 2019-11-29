"use strict"
const util = require('util')
//CLASSES
const ApiFunctions = require('../api/ApiFunctions')
const DiscordLog = require('./DiscordLog')
const HardCoded = require('./commands/Hardcoded')
const Commands = require('./commands/Commands')
const Points = new (require('./Points')) //singleton
//ENUMS
const UserLevels = require('../../ENUMS/UserLevels.js')

const options = require('../../config.json')

module.exports = class PrivMsg {
  constructor (bot) {
    this.bot = bot

    this.hardcoded = new HardCoded(this.bot)
    this.commands = new Commands(this.bot)

    bot.TwitchIRCConnection.on('PRIVMSG', this.onChat.bind(this))
  }


  async onChat (obj) {
    let messageObj = PrivMsg.createRawMessageObj(obj)
    PrivMsg.handleACTION(messageObj)
    messageObj.message += " "
    PrivMsg.findAndSetUserLevel(messageObj)

    let channelObj = this.bot.channels[messageObj.roomId]

    if (channelObj.logMessages) {
      console.info("<-- " + messageObj.channel + " " + messageObj.username + ": " + messageObj.message)
    }

    //hardcoded always first
    if (channelObj.useHardcodedCommands) {
      if (this.hardcoded.handle(messageObj)) { return }
    }

    if (channelObj.usePoints) {
      // noinspection ES6MissingAwait
      Points.handlePrivMsg(messageObj, this.bot)
    }

    if (channelObj.useCommands) {
      if (this.commands.handle(messageObj)) { return }
    }

    return false
  }

  static findAndSetUserLevel (messageObj) {
    if (options.hasOwnProperty("botadmins")
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

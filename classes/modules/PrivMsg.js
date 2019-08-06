"use strict"
const util = require('util')
//CLASSES
const ApiFunctions = require('../api/ApiFunctions')
const DiscordLog = require('./DiscordLog')
const HardCoded = require('./commands/Hardcoded')


module.exports = class PrivMsg {
  constructor (bot) {
    this.bot = bot

    this.hardcoded = new HardCoded(this.bot)

    bot.TwitchIRCConnection.on('PRIVMSG', this.onChat.bind(this))
  }


  async onChat (obj) {
    let messageObj = PrivMsg.createRawMessageObj(obj)
    PrivMsg.handleACTION(messageObj)
    messageObj.message += " "

    console.info("<-- " + messageObj.channel + " " + messageObj.username + ": " + messageObj.message)

    if (this.hardcoded.handle(messageObj)) { return }
    //if (this.XXXXXX.handle(messageObj)) { return }

    return false
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
      isACTION: false
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

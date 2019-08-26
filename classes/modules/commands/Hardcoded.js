"use strict"
const util = require('util')
//CLASSES
const ApiFunctions = require('../../api/ApiFunctions.js')
const DiscordLog = require('./../DiscordLog')
const Helper = require('./Helper')
const UserLevels = require("../../../ENUMS/UserLevels")


module.exports = class Hardcoded {
  constructor (bot) {
    this.bot = bot

  }

  /**
   * Handles hardcoded commands
   * @param messageObj created in PrivMsg.createRawMessageObj
   * @returns {boolean} don't allow further commands
   */
  handle (messageObj) {
    /* Shutting down the bot */
    if (messageObj.userLevel === UserLevels.BOTADMIN
        && messageObj.message.startsWith("<s ")) {

      this.bot.TwitchIRCConnection.say(messageObj.channel, "Shutting down FeelsBadMan")
      setTimeout(function () {
        process.exit(0)
      }, 1200)
      return true
    }

    /*
    if (messageObj.message.startsWith("<uptime ")) {
      this.bot.TwitchIRCConnection.queue.sayWithMsgObj(messageObj, messageObj.username + ", Bot running for " + Helper.msToDDHHMMSS(process.uptime()))
      return true
    }
    */

    /*
    if (messageObj.message.startsWith("<bot ") && messageObj.userId === "38949074") {
      this.bot.TwitchIRCConnection.queue.sayWithBoth(messageObj.roomId, messageObj.channel, "I'm the not so shitty V2 version of the IceCreamDataBase bot. Made by icdb in nodejs. FeelsDankMan ", messageObj.userId)
      return true
    }

    if (messageObj.message.startsWith("< ") && messageObj.userId === "38949074") {
      this.bot.TwitchIRCConnection.queue.sayWithBoth(messageObj.roomId, messageObj.channel, ">", messageObj.userId)
      return true
    }
    */

    /* eval */

    if (messageObj.userLevel === UserLevels.BOTADMIN
        && messageObj.message.startsWith("<eval ")) {

      let msg
      let evalString = messageObj.message.split(" ").slice(1).join(" ")
      console.log(evalString)
      if (evalString) {
        try {
          msg = eval(evalString).toString()
        } catch (err) {
          msg = err.message
        }

        ["mysql", "identity", "oauth", "host", "password", "appid", "waAppid"].forEach(function (element) {
          if (msg.toLowerCase().includes(element)
            || evalString.toLowerCase().includes(element)) {
            msg = "***"
          }
        })
      } else {
        msg = messageObj.username + ", Nothing to eval given..."
      }
      this.bot.TwitchIRCConnection.queue.sayWithMsgObj(messageObj, msg)
    }

    return false
  }
}

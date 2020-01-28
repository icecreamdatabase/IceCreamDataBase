"use strict"
const util = require('util')
const si = require('systeminformation')
//CLASSES
const ApiFunctions = require('../../api/ApiFunctions.js')
const DiscordLog = require('./../DiscordLog')
const Helper = require('./Helper')
const UserLevels = require("../../../ENUMS/UserLevels")
const TtsWebSocket = new (require('../channelPoints/TtsWebSocket')) //singleton



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
    if (messageObj.userLevel === UserLevels.BOTADMIN
      && messageObj.message.startsWith("<t ")) {
      TtsWebSocket.sendTts(messageObj.channel, messageObj.message.substr(messageObj.message.indexOf(" ") + 1))
      return true
    }

    if (messageObj.userLevel === UserLevels.BOTADMIN
      && messageObj.message.startsWith("<y ")) {
      this.bot.apiFunctions.followTime(38949074, 57019243).then(x => {
        this.bot.TwitchIRCConnection.queue.sayWithMsgObj(messageObj, util.inspect(x))
      })
      return true
    }

    if (messageObj.userLevel >= UserLevels.BROADCASTER
      && messageObj.message.startsWith("<tags ")) {

      DiscordLog.debug(JSON.stringify(messageObj, null, 2))
      this.bot.TwitchIRCConnection.queue.sayWithMsgObj(messageObj, "@" + messageObj.username + ", Done.")
      return true
    }

    /* Shutting down the bot */
    if (messageObj.userLevel === UserLevels.BOTADMIN
      && messageObj.message.startsWith("<s ")) {

      this.bot.TwitchIRCConnection.say(messageObj.channel, "Shutting down FeelsBadMan")
      setTimeout(function () {
        process.exit(0)
      }, 1200)
      return true
    }

    /* eval */
    if (messageObj.userLevel === UserLevels.BOTADMIN
        && messageObj.message.startsWith("<eval ")) {

      let msg
      let evalString = messageObj.message.split(" ").slice(1).join(" ")
      //console.log(evalString)
      if (evalString) {
        try {
          let ss = (x) => {
            this.bot.TwitchIRCConnection.queue.sayWithMsgObj(messageObj, x.toString())
          }
          let so = (x) => {
            this.bot.TwitchIRCConnection.queue.sayWithMsgObj(messageObj, util.inspect(x))
          }
          msg = (eval(evalString) || "").toString()
        } catch (err) {
          msg = err.message
        }

        if (["mysql", "identity", "oauth", "host", "password", "appid", "waAppid"].find(
          x => msg.toLowerCase().includes(x) || evalString.toLowerCase().includes(x)
        )) {
          console.warn("Eval match: " + msg)
          msg = "***"
        }

      } else {
        msg = messageObj.username + ", Nothing to eval given..."
      }
      this.bot.TwitchIRCConnection.queue.sayWithMsgObj(messageObj, msg)
    }

    return false
  }
}

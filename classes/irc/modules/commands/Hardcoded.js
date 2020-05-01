"use strict"
const util = require('util')
const si = require('systeminformation')
//CLASSES
const Api = require('../../../api/Api')
const Logger = require('../../../helper/Logger')
const DiscordLog = require('../../../helper/DiscordLog')
const Helper = require('./Helper')
const TimeConversionHelper = require("../../../helper/TimeConversionHelper")
const UserLevels = require("../../../../ENUMS/UserLevels")
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
    if (messageObj.userLevel >= UserLevels.BOTADMIN
      && messageObj.message.startsWith("<t ")) {
      TtsWebSocket.sendTts(messageObj.channel, messageObj.message.substr(messageObj.message.indexOf(" ") + 1), true, false, true)
      return true
    }

    if (messageObj.userLevel >= UserLevels.BOTOWNER
      && messageObj.message.startsWith("<y ")) {
      Api.apiFallbackObject.kraken.userDataFromLogins([messageObj.username]).then(userInfo => {
        DiscordLog.twitchMessageCustom("tts-message-log",
          "apiFallbackObject test",
          messageObj.message,
          new Date().toISOString(),
          messageObj.raw.tags.color,
          messageObj.username,
          userInfo[0].logo
        )
      })
      return true
    }

    if (messageObj.userLevel >= UserLevels.BROADCASTER
      && messageObj.message.startsWith("<tags ")) {

      DiscordLog.debug(JSON.stringify(messageObj, null, 2))
      this.bot.irc.queue.sayWithMsgObj(messageObj, "@" + messageObj.username + ", Done.")
      return true
    }

    /* Shutting down the bot */
    if (messageObj.userLevel >= UserLevels.BOTOWNER
      && messageObj.message.startsWith("<s ")) {

      this.bot.irc.TwitchIRCConnection.say(messageObj.channel, "Shutting down FeelsBadMan")
      setTimeout(function () {
        process.abort()
      }, 1200)
      return true
    }

    /* Wolfram Alpha API */
    if (messageObj.userLevel >= UserLevels.BOTADMIN
      && (messageObj.message.startsWith("<query ")
        || messageObj.message.startsWith("<q ")
      )
    ) {
      this.bot.api.other.wolframAlphaRequest(messageObj.message.substr(messageObj.message.indexOf(" ") + 1)).then((message) => {
        this.bot.irc.queue.sayWithMsgObj(messageObj, "Query returned: " + message)
      })
      return true
    }

    /* eval */
    if (messageObj.userLevel >= UserLevels.BOTOWNER
      && messageObj.message.startsWith("<eval ")) {

      let msg
      let evalString = messageObj.message.split(" ").slice(1).join(" ")
      //Logger.log(evalString)
      if (evalString) {
        try {
          let ss = (x) => {
            this.bot.irc.queue.sayWithMsgObj(messageObj, x.toString())
          }
          let so = (x) => {
            this.bot.irc.queue.sayWithMsgObj(messageObj, util.inspect(x))
          }
          msg = (eval(evalString) || "").toString()
        } catch (err) {
          msg = err.message
        }

        if (["mysql", "identity", "oauth", "host", "password", "appid", "waAppid"].find(
          x => msg.toLowerCase().includes(x) || evalString.toLowerCase().includes(x)
        )) {
          Logger.warn("Eval match: " + msg)
          msg = "***"
        }

      } else {
        msg = messageObj.username + ", Nothing to eval given..."
      }
      this.bot.queue.sayWithMsgObj(messageObj, msg)
    }

    return false
  }
}

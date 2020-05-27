"use strict"
const util = require('util')
//CLASSES
const Logger = require('../../../helper/Logger')
const DiscordLog = require('../../../helper/DiscordLog')

const NEWLINE_SEPERATOR = "{nl}" //Make sure to change it in Queue.js as well

class CustomCommands {
  /**
   * @param {Bot} bot
   */
  constructor (bot) {
    this._bot = bot
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

  async handlePrivMsg (privMsgObj) {
    await this.handleSetup(privMsgObj)

    if (Object.prototype.hasOwnProperty.call(this.channelPointsSettings, privMsgObj.roomId)) {
      await this.handleTtsRedeem(privMsgObj)
    }
  }

  async handleSetup (privMsgObj) {

  }

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
      responseMessage = settingObj.getCommand(privMsgObj.raw.tags["custom-reward-id"])

      if (responseMessage) {
        responseMessage = responseMessage.replace(new RegExp("\\${user}", 'g'), privMsgObj.username)
        responseMessage = responseMessage.replace(new RegExp("\\${channel}", 'g'), privMsgObj.channel.substring(1))
        responseMessage = responseMessage.replace(new RegExp("\\${p}", 'g'), privMsgObj.message)
        responseMessage = responseMessage.replace(new RegExp("\\${p0}", 'g'), privMsgObj.message.split(" ")[0] || "")
        responseMessage = responseMessage.replace(new RegExp("\\${p1}", 'g'), privMsgObj.message.split(" ")[1] || "")

        if (!settingObj.allowCommandNewLines) {
          responseMessage = responseMessage.replace(new RegExp(NEWLINE_SEPERATOR, 'g'), "")
        }

        this.bot.irc.queue.sayWithMsgObj(privMsgObj, responseMessage)
        hasTakenAction = true
      }
    }
    return hasTakenAction
  }
}

module.exports = CustomCommands

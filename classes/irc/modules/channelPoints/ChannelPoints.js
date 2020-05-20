"use strict"
const util = require('util')
//CLASSES
const Logger = require('../../../helper/Logger')
const DiscordLog = require('../../../helper/DiscordLog')
const Tts = require("./Tts")


class ChannelPoints {
  constructor (bot) {
    this.bot = bot

    this.tts = new Tts(this.bot)
  }

  /**
   * Handle the privMsgObj by checking for all channelpoint related triggers.
   * @param privMsgObj created in PrivMsg.js
   * @returns {Promise<boolean>}
   */
  async handlePrivMsg (privMsgObj) {

    // noinspection ES6MissingAwait
    this.tts.handlePrivMsg(privMsgObj)

    return false
  }
}

module.exports = ChannelPoints

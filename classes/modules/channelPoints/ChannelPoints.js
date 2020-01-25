"use strict"
const util = require('util')
//CLASSES
const DiscordLog = require('../DiscordLog')
const Tts = require("./Tts")


module.exports = class ChannelPoints {
  constructor (bot) {
    this.bot = bot

    this.tts = new Tts(this.bot)
  }

  async handlePrivMsg (privMsgObj) {

    // noinspection ES6MissingAwait
    this.tts.handlePrivMsg(privMsgObj)

    return false
  }
}

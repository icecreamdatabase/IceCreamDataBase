"use strict"
const util = require('util')
//CLASSES
const SqlPoints = require('../sql/modules/SqlPoints')
const Api = require('../api/Api.js')
const DiscordLog = require('./DiscordLog')
const Helper = require('./commands/Helper')
const Tts = new (require('./Tts')) //singleton
const UserLevels = require("../../ENUMS/UserLevels")

const UPDATE_INTERVAL = 30000//ms

module.exports = class ChannelPoints {
  constructor () {

    this.channelPointsSettings = {}

    setTimeout(this.updateChannelPointSettings.bind(this), 2000)
    setInterval(this.updateChannelPointSettings.bind(this), UPDATE_INTERVAL)
  }

  async handlePrivMsg (privMsgObj, bot) {
    if (this.pointsSettings.hasOwnProperty(privMsgObj.roomId)) {
    }
    return false
  }

  updateChannelPointSettings () {
    SqlChannelPoints.getChannelPointsSettings(this.bot.TwitchIRCConnection.botData.userId).then(data => {
      this.channelPointsSettings = data
    })
  }
}

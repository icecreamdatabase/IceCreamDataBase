"use strict"
const util = require('util')
//CLASSES
const SqlChannelPoints = require('../../../sql/modules/SqlChannelPoints')
const Logger = require('../../../helper/Logger')
const DiscordLog = require('../../../helper/DiscordLog')
const Tts = require("./Tts")
const CustomCommands = require("./CustomCommands")

const UPDATE_INTERVAL = 30000//ms

class ChannelPoints {
  constructor (bot) {
    this.bot = bot

    /**
     *
     * @type {SqlChannelPoints[]}
     * @private
     */
    this._channelPointsSettings = []

    this.tts = new Tts(this.bot)
    this.customCommands = new CustomCommands(this.bot)

    setTimeout(this.updateChannelPointSettings.bind(this), 2000)
    setInterval(this.updateChannelPointSettings.bind(this), UPDATE_INTERVAL)

  }

  /**
   * Handle the privMsgObj by checking for all channelpoint related triggers.
   * @param privMsgObj created in PrivMsg.js
   * @returns {Promise<boolean>}
   */
  async handlePrivMsg (privMsgObj) {

    // noinspection ES6MissingAwait
    this.tts.handlePrivMsg(privMsgObj)

    // noinspection ES6MissingAwait
    this.customCommands.handlePrivMsg(privMsgObj)

    return false
  }

  async handlePubSub (event) {
    switch (event.message.type) {
      case 'reward-redeemed':
        console.log(`New: \n${util.inspect(event.message.data.redemption)}`)
        break
      case 'redemption-status-update':
        console.log(`Status update: \n${util.inspect(event.message.data.redemption)}`)
        break
      default:
        console.log(`Default: \n${util.inspect(event)}`)
        break
    }
  }


  /**
   * Update Tts.channelPointsSettings from the Database
   * @returns {Promise<void>}
   */
  async updateChannelPointSettings () {
    this._channelPointsSettings = await SqlChannelPoints.getChannelPointsSettings(this.bot.userId)
    for (let channelId in this._channelPointsSettings) {
      if (this._channelPointsSettings[channelId].listenOnPubSub) {
        this.bot.pubSub.subscribe(`community-points-channel-v1.${channelId}`, this.handlePubSub.bind(this))
      }
    }
  }
}

module.exports = ChannelPoints

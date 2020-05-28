"use strict"
const util = require('util')
//CLASSES
const SqlChannelPoints = require('../../../sql/modules/SqlChannelPoints')
const Tts = require("./Tts")
const CustomCommands = require("./CustomCommands")

const UPDATE_INTERVAL = 30000//ms

class ChannelPoints {
  /**
   * @param {Bot} bot
   */
  constructor (bot) {
    this._bot = bot

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
   * @return {Bot}
   */
  get bot () {
    return this._bot
  }

  get channelPointsSettings () {
    return this._channelPointsSettings
  }

  hasSettingsForChannelID (roomId) {
    return Object.prototype.hasOwnProperty.call(this.channelPointsSettings, roomId)
  }

  getSettingObj (roomId) {
    return this.channelPointsSettings[roomId]
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
      case 'custom-reward-updated':
        console.log(`Reward updated: \n${util.inspect(event.message.data.updated_reward)}`)
        break
      default:
        console.log(`Default: \n${util.inspect(event, {showHidden: false, depth: null})}`)
        break
    }
  }


  /**
   * Update Tts.channelPointsSettings from the Database
   * @returns {Promise<void>}
   */
  async updateChannelPointSettings () {
    this._channelPointsSettings = await SqlChannelPoints.getChannelPointsSettings(this.bot.userId)
    for (let channelId in this.channelPointsSettings) {
      if (this.channelPointsSettings[channelId].listenOnPubSub) {
        this.bot.pubSub.subscribe(`community-points-channel-v1.${channelId}`, this.handlePubSub.bind(this))
      }
    }
  }
}

module.exports = ChannelPoints

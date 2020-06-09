"use strict"
const util = require('util')
//CLASSES
const SqlChannelPoints = require('../../../sql/modules/SqlChannelPoints')
const Tts = require("./Tts")
const CustomCommands = require("./CustomCommands")

const UPDATE_INTERVAL = 30000//ms

class ChannelPoints {
  /**
   * @typedef {object} pubsubEvent
   * @property {string} topic
   * @property {pubsubEventMessage} message
   */
  /**
   * @typedef {object} pubsubEventMessage
   * @property {string} type
   * @property {pubsubEventMessageData} data
   */
  /**
   * @typedef {object} pubsubEventMessageData
   * @property {string} timestamp
   * @property {pubsubEventRewardRedemtion} [redemption]
   * @property {pubsubEventUpdatedReward} [updated_reward]
   */
  /**
   * @typedef {object} pubsubEventUserObj
   * @property {string} id
   * @property {string} login
   * @property {string} display_name
   */
  /**
   * @typedef {object} pubsubEventImageObj
   * @property {string} url_1x
   * @property {string} url_2x
   * @property {string} url_4x
   */
  /**
   * @typedef {object} pubsubEventMaxPerStreamObj
   * @property {boolean} is_enabled
   * @property {number} max_per_stream
   */
  /**
   * @typedef {object} pubsubEventReward
   * @property {string} id
   * @property {string} channel_id
   * @property {string} title
   * @property {string} promt
   * @property {number} cost
   * @property {boolean} is_user_input_required
   * @property {boolean} is_sub_only
   * @property {pubsubEventImageObj} image
   * @property {pubsubEventImageObj} default_image
   * @property {string} background_color
   * @property {boolean} is_enabled
   * @property {boolean} is_paused
   * @property {boolean} is_in_stock
   * @property {pubsubEventMaxPerStreamObj} max_per_stream
   * @property {boolean} should_redemptions_skip_requiest_queue
   * @property {*} template_id
   * @property {string} updated_for_indicator_at
   */
  /**
   * @typedef {object} pubsubEventRewardRedemtion
   * @property {string} id
   * @property {pubsubEventUserObj} user
   * @property {string} channel_id
   * @property {string} redeemed_at
   * @property {pubsubEventReward} reward
   * @property {string} [user_input]
   * @property {'FULFILLED','UNFULFILLED','ACTION_TAKEN'} status
   * @property {string} cursor
   */
  /**
   * @typedef {object} pubsubEventUpdatedReward
   * @property {string} id
   * @property {string} channel_id
   * @property {string} title
   * @property {string} proment
   * @property {number} cost
   * @property {boolean} is_user_input_required
   * @property {boolean} is_sub_only
   * @property {pubsubEventImageObj} image
   * @property {pubsubEventImageObj} default_image
   * @property {string} background_color
   * @property {boolean} is_enabled
   * @property {boolean} is_paused
   * @property {boolean} is_in_stock
   * @property {pubsubEventMaxPerStreamObj} max_per_stream
   * @property {boolean} should_redemptions_skip_requiest_queue
   * @property {*} template_id
   * @property {string} updated_for_indicator_at
   */


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
    return Object.prototype.hasOwnProperty.call(this.channelPointsSettings, roomId.toString())
  }

  /**
   * @param roomId
   * @return {SqlChannelPoints|undefined}
   */
  getSettingObj (roomId) {
    return this.channelPointsSettings[roomId]
  }

  /**
   * Handle the privMsgObj by checking for all channelpoint related triggers.
   * @param {privMsgObj} privMsgObj
   * @returns {Promise<boolean>}
   */
  async handlePrivMsg (privMsgObj) {

    // noinspection ES6MissingAwait
    this.tts.handlePrivMsg(privMsgObj)

    // noinspection ES6MissingAwait
    this.customCommands.handlePrivMsg(privMsgObj)

    return false
  }

  /**
   *
   * @param {pubsubEvent} event
   * @return {Promise<void>}
   */
  async handlePubSub (event) {
    switch (event.message.type) {
      case 'reward-redeemed':
        await this.handleRewardRedeemed(event.message.data.redemption)
        break
      case 'redemption-status-update':
        await this.handleRedemptionStatusUpdate(event.message.data.redemption)
        break
      case 'custom-reward-updated':
        await this.handleCustomRewardUpdated(event.message.data.updated_reward)
        break
      default:
        console.log(`Default: \n${util.inspect(event, {showHidden: false, depth: null})}`)
        break
    }
  }

  /**
   * @param {pubsubEventRewardRedemtion} redemption
   * @return {Promise<void>}
   */
  async handleRewardRedeemed (redemption) {
    console.log(`New: \n${util.inspect(redemption)}`)
    switch (redemption.status) {
      case "FULFILLED":
        // Skips queue
        break
      case "UNFULFILLED":
        // Now in queue
        break
      case "ACTION_TAKEN":
        // Moderator has pressed either Accept or Reject
        break
    }
  }

  /**
   *
   * @param {pubsubEventRewardRedemtion} redemption
   * @return {Promise<void>}
   */
  async handleRedemptionStatusUpdate (redemption) {
    console.log(`Status update: \n${util.inspect(redemption)}`)
  }

  /**
   *
   * @param {pubsubEventUpdatedReward} updatedReward
   * @return {Promise<void>}
   */
  async handleCustomRewardUpdated (updatedReward) {
    console.log(`Reward updated: \n${util.inspect(updatedReward)}`)
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

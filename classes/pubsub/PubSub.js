"use strict"
const util = require('util')
//CLASSES
const Logger = require('../helper/Logger')
const TwitchPubSubConnection = require('./TwitchPubSubConnection')

module.exports = class Irc {
  constructor (bot) {
    this.bot = bot

    Logger.info(`Setting up pubsub: ${this.bot.userId} (${this.bot.userName})`)

    this.twitchPubSubConnection = new TwitchPubSubConnection(this.bot)

    this.twitchPubSubConnection.connect().then(() => {
      this.registerWhispers()
      this.registerChannelPoints(38949074) //TODO: testing
    })
  }

  registerWhispers () {
    this.twitchPubSubConnection.subscribe([`whispers.${this.bot.userId}`])
    this.twitchPubSubConnection.on('whispers', this.onWhisper.bind(this))
  }

  onWhisper (event) {
    Logger.info(util.inspect(event))
  }

  registerChannelPoints (roomId) {
    this.twitchPubSubConnection.subscribe([`community-points-channel-v1.${roomId}`])
    this.twitchPubSubConnection.on('community-points-channel-v1', this.onReward.bind(this))
  }

  onReward (event) {
    Logger.info(util.inspect(event))
  }

}

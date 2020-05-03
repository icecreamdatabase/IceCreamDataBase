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
    })
  }

  registerWhispers () {
    this.twitchPubSubConnection.subscribe([`whispers.${this.bot.userId}`])
    this.twitchPubSubConnection.on('whispers', this.onWhisper.bind(this))
  }

  onWhisper (event) {
    Logger.info(util.inspect(event))
  }

  registerChannelPoints () {
    this.twitchPubSubConnection.subscribe([`channel-points-channel-v1.${this.bot.userId}`])
    this.twitchPubSubConnection.on('whisper', this.onWhisper.bind(this))
  }

}

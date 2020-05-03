"use strict"
//CLASSES
const Logger = require('../helper/Logger')
const TwitchPubSubConnection = require('./TwitchPubSubConnection')

const ChatLimit = require("../../ENUMS/ChatLimit")

//update channels every 120 seconds (2 minutes)
const UPDATE_ALL_CHANNELS_INTERVAL = 120000 //ms

module.exports = class Irc {
  constructor (bot) {
    this.bot = bot

    Logger.info(`Setting up pubsub: ${this.bot.userId} (${this.bot.userName})`)

    this.TwitchPubSubConnection = new TwitchPubSubConnection(this.bot)

    this.registerWhispers()
  }

  registerWhispers () {
    this.TwitchPubSubConnection.subscribe([`whispers.${this.bot.userId}`])

    this.TwitchPubSubConnection.on('whisper', this.onWhisper.bind(this))
  }

  onWhisper (event) {

  }

}

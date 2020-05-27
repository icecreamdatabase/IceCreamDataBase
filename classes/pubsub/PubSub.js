"use strict"
const util = require('util')
//CLASSES
const Logger = require('../helper/Logger')
const DiscordLog = require('../helper/DiscordLog')
const PubSubConnectionPool = require('./PubSubConnectionPool')

class PubSub {
  constructor (bot) {
    this.bot = bot

    Logger.info(`Setting up pubsub: ${this.bot.userId} (${this.bot.userName})`)

    this.pubSubConnectionPool = new PubSubConnectionPool(this.bot)

    this.registerWhispers()
    //this.registerChannelPoints(38949074) //TODO: testing
  }

  /**
   *
   * @param {string} topic
   * @param func in event emitter format: messageContent => {}
   */
  subscribe (topic, func) {
    this.pubSubConnectionPool.on(topic, func).then().catch(e => DiscordLog.warn(e))
  }

  registerWhispers () {
    this.pubSubConnectionPool.on(`whispers.${this.bot.userId}`, this.onWhisper.bind(this)).then()
  }

  async onWhisper (event) {
    //Logger.info(util.inspect(event))
    switch (event.message.type) {
      case 'whisper_sent':

        if (this.bot.authentication.enableWhisperLog) {
          let userInfo = await this.bot.api.kraken.userDataFromIds([event.message["data_object"]["from_id"]])
          DiscordLog.twitchMessageCustom("whisper-log",
            `#${event.message["data_object"].recipient["display_name"]}`,
            event.message["data_object"].body,
            new Date().toISOString(),
            event.message["data_object"].tags.color,
            event.message["data_object"].tags.login,
            userInfo[0].logo
          )
        }

        break
      case 'thread':
        break
      default:
    }
  }

  registerChannelPoints (roomId) {
    this.pubSubConnectionPool.on(`community-points-channel-v1.${roomId}`, this.onReward.bind(this))
  }

  onReward (event) {
    Logger.info(util.inspect(event))
  }

}

module.exports = PubSub

"use strict"
const util = require('util')

const Logger = require('../helper/Logger')
const DiscordLog = require('../helper/DiscordLog')
const TwitchPubSubConnection = require('./TwitchPubSubConnection')

const maxTopicsPerConnection = 50


class PubSubConnectionPool {
  constructor (bot) {
    this.bot = bot
    /**
     *
     * @type {TwitchPubSubConnection[]}
     */
    this.connections = []
  }

  /**
   *
   * @param {string} topic
   * @param func in event emitter format: messageContent => {}
   */
  async on (topic, func) {
    let connection = this.getConnectionByTopic(topic)
    if (!connection) {
      connection = await this.getFreeConnection(1)
    }
    if (connection) {
      connection.subscribe([topic])
      connection.on(topic, func)
    } else {
      throw Error(`Couldn't get free pubsub connection!`)
    }
  }

  getConnectionByTopic (topic) {
    for (let connection of this.connections) {
      if (connection.topics.includes(topic)) {
        return connection
      }
    }
    return null
  }

  /**
   *
   * @param requiredTopicSlots How many slots are required to be before a new
   * @return {Promise<TwitchPubSubConnection>}
   */
  async getFreeConnection (requiredTopicSlots) {
    for (let connection of this.connections) {
      if (connection.topics.length + requiredTopicSlots < maxTopicsPerConnection) {
        return connection
      }
    }
    return await this.addConnectionToPool()
  }

  /**
   *
   * @return {Promise<TwitchPubSubConnection>}
   */
  async addConnectionToPool () {
    let newConnection = new TwitchPubSubConnection(this.bot)
    await newConnection.connect()
    this.connections.push(newConnection)
    return newConnection
  }
}

module.exports = PubSubConnectionPool

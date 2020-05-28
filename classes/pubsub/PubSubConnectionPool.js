"use strict"
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
   * @return {boolean} new subscription added
   */
  async on (topic, func) {
    if (this.getConnectionByTopic(topic)) {
      return false //already subscribed somewhere
    }
    let connection = await this.getFreeConnection(1)
    if (connection) {
      connection.subscribe([topic])
      connection.on(topic, func)
      return true
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

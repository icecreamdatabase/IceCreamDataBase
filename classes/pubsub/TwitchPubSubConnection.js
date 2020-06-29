"use strict"
const util = require('util')
const EventEmitter = require('eventemitter3')
const WebSocket = require('ws')

const Logger = require('../helper/Logger')

const host = 'wss://pubsub-edge.twitch.tv'
const heartbeatInterval = 1000 * 30 //ms between PING's
const reconnectInterval = 1000 * 3 //ms to wait before reconnect

class TwitchPubSubConnection extends EventEmitter {
  constructor (bot) {
    super()
    this.bot = bot
    this.ws = null
    this.heartbeatHandle = null
    this.awaitingPong = false
    this.topics = []
  }

  /**
   *
   * @param {[string]} topics
   */
  subscribe (topics) {
    if (topics.length > 0) {
      let request = {
        "type": "LISTEN",
        "nonce": TwitchPubSubConnection.generateNonce(15),
        "data": {
          "topics": topics,
          "auth_token": this.bot.authentication.accessToken
        }
      }
      this.send(request)
      Array.prototype.push.apply(this.topics, topics)
      //TODO: unsub roughly like this: this.topics = this.topics.filter(c => !topicsToRemove.includes(c))
    }
  }

  /**
   *
   * @param {[string]} topics
   */
  unsubscribe (topics) {
    if (topics.length > 0) {
      let request = {
        "type": "UNLISTEN",
        "nonce": TwitchPubSubConnection.generateNonce(15),
        "data": {
          "topics": topics,
          "auth_token": this.bot.authentication.accessToken
        }
      }
      this.send(request)
      this.topics = this.topics.filter(c => !topics.includes(c))
    }
  }

  /**
   * Connect to the twitch IRC server, login and send CAP REQ
   * @returns {Promise<void>}
   */
  async connect () {
    Logger.info(`${this.bot.userId} (${this.bot.userName}) connecting to PubSub`)
    return new Promise((resolve) => {
      this.ws = new WebSocket(host, [], {})

      this.ws.addEventListener('open', event => {
        if (event.target.readyState === WebSocket.OPEN) {
          Logger.debug(`${this.bot.userId} (${this.bot.userName}) PubSub socket open.`)
          this.heartbeat()
          this.heartbeatHandle = setInterval(this.heartbeat.bind(this), heartbeatInterval)
          resolve()
        }
      })

      this.ws.addEventListener('error', error => {
        Logger.error(JSON.stringify(error))
      })

      this.ws.addEventListener('message', event => {
        let message = JSON.parse(event.data)
        if (message.type === 'PONG') {
          this.awaitingPong = false
        } else if (message.type === 'RECONNECT') {
          this.reconnect()
        } else if (message.type === 'MESSAGE') {
          //Logger.debug('RECV: ' + JSON.stringify(message))
          let topicFull = message.data.topic
          let topicBare = topicFull.split('.', 1)[0]

          message.data.message = JSON.parse(message.data.message)

          this.emit(topicFull, message.data)
          if (topicFull !== topicBare) {
            this.emit(topicBare, message.data)
          }
        }
      })

      this.ws.addEventListener('close', () => {
        //Logger.debug('INFO: Socket Closed')
        clearInterval(this.heartbeatHandle)
        this.reconnect()
      })

      // make sure that we rejoin topics after reconnecting
      this.subscribe(this.topics)
    })
  }

  reconnect () {
    Logger.info(`${this.bot.userId} (${this.bot.userName}) reconnecting to PubSub`)
    setTimeout(this.connect.bind(this), reconnectInterval)
  }

  heartbeat () {
    if (this.awaitingPong) {
      Logger.info(`${this.bot.userId} (${this.bot.userName}) PubSub WebSocket no pong received`)
      Logger.debug("Ws no pong received.")
      this.reconnect()
    } else {
      this.awaitingPong = true
      this.ws.send(JSON.stringify({type: 'PING'}))
    }
  }

  /**
   * Send a raw line to the twitch PubSub
   * @param {{type: string, nonce: string, data: {topics string[], auth_token: string}}} data
   */
  send (data) {
    if (data.type !== "PING") {
      //Logger.debug(`~~> ${util.inspect(data)}`) //TODO: don't print auth
    }
    if (this.ws) {
      this.ws.send(JSON.stringify(data))
    } else {
      Logger.trace("No PubSub websocket object")
    }
  }

  /**
   * Generate nonce.
   * Source: https://www.thepolyglotdeveloper.com/2015/03/create-a-random-nonce-string-using-javascript/
   * @param {number} length
   * @returns {string} nonce
   */
  static generateNonce (length) {
    let text = ""
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length))
    }
    return text
  }
}

module.exports = TwitchPubSubConnection

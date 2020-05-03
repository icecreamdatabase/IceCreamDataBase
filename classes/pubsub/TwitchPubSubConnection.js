const util = require('util')
const EventEmitter = require('eventemitter3')
const WebSocket = require('ws')

const Logger = require('../helper/Logger')
const DiscordLog = require('../helper/DiscordLog')

const host = 'wss://pubsub-edge.twitch.tv'
const reconnectMultiplier = 2000
const reconnectJitter = 500
const heartbeatInterval = 1000 * 60 //ms between PING's
const reconnectInterval = 1000 * 3 //ms to wait before reconnect

class TwitchPubSubConnection extends EventEmitter {
  constructor (bot) {
    super()
    this.bot = bot
    this.ws = null
    this.heartbeatHandle = null
  }

  /**
   *
   * @param {[string]} topics
   */
  subscribe (topics) {
    let request = {
      "type": "LISTEN",
      "nonce": TwitchPubSubConnection.generateNonce(15),
      "data": {
        "topics": topics,
        "auth_token": this.bot.authentication.accessToken
      }
    }
    this.send(request)
  }

  /**
   * Connect to the twitch IRC server, login and send CAP REQ
   * @returns {Promise<void>}
   */
  async connect () {
    Logger.info(`Connecting to ${host}`)
    return new Promise((resolve) => {

      this.ws = new WebSocket('wss://pubsub-edge.twitch.tv/', [], {})

      this.ws.addEventListener('open', event => {
        if (event.target.readyState === WebSocket.OPEN) {
          Logger.debug('INFO: Socket Opened')
          this.heartbeat()
          this.heartbeatHandle = setInterval(this.heartbeat.bind(this), heartbeatInterval)
          resolve()
        }
      })

      this.ws.addEventListener('error', error => {
        Logger.debug(JSON.stringify(error))
      })

      this.ws.addEventListener('message', event => {
        let message = JSON.parse(event.data)
        Logger.debug('RECV: ' + JSON.stringify(message))
        if (message.type === 'RECONNECT') {
          Logger.debug('INFO:Reconnecting...')
          setTimeout(connect, reconnectInterval)
        }
        if (message.type === 'MESSAGE') {
          let topicFull = message.data.topic
          let topicBare = topicFull.split('.', 1)[0]

          this.emit(topicFull, message.data)
          if (topicFull !== topicBare) {
            this.emit(topicBare, message.data)
          }
        }
      })

      this.ws.addEventListener('close', () => {
        Logger.debug('INFO: Socket Closed')
        clearInterval(this.heartbeatHandle)
        Logger.debug('INFO: Reconnecting...')
        setTimeout(connect, reconnectInterval)
      })
    })
  }

  heartbeat () {
    this.ws.send(JSON.stringify({type: 'PING'}))
  }

  /**
   * Send a raw line to the twitch PubSub
   * @param {{type: string, nonce: string, data: {topics string[], auth_token: string}}} data
   */
  send (data) {
    if (data.type !== "PING") {
      Logger.debug(`--> ${data}`) //TODO: don't print auth
    }
    if (this.ws) {
      this.ws.send(JSON.stringify(data))
    } else {
      Logger.warn("no ws object")
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

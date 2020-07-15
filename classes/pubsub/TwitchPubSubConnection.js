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
    /**
     * @type {WebSocket}
     * @private
     */
    this._ws = undefined
    this.heartbeatHandle = null
    this.awaitingPong = false
    this.topics = []

    this._wsSendQueue = []
    this.on('queue', this.checkQueue.bind(this))
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
      for (const topic of topics) {
        if (!this.topics.includes(topic)) {
          this.topics.push(topic)
        }
      }
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
      this._ws = new WebSocket(host, [], {})

      this._ws.addEventListener('open', event => {
        if (event.target.readyState === WebSocket.OPEN) {
          Logger.debug(`${this.bot.userId} (${this.bot.userName}) PubSub socket open.`)
          this.heartbeat()
          clearInterval(this.heartbeatHandle)
          this.heartbeatHandle = setInterval(this.heartbeat.bind(this), heartbeatInterval)

          // make sure that we rejoin topics after reconnecting but also clear out the old topics we are now no longer subscribed to.
          let topics = this.topics
          this.topics = []
          this.subscribe(topics)
          resolve()
        }
      })

      this._ws.addEventListener('message', event => {
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

      this._ws.addEventListener('close', () => {
        //Logger.debug('INFO: Socket Closed')
        this._ws.terminate()
        this._ws.removeAllListeners()
        this._ws = undefined
        this.reconnect()
      })

      this._ws.addEventListener('error', error => {
        Logger.error(JSON.stringify(error))
      })
    })
  }

  reconnect () {
    Logger.info(`${this.bot.userId} (${this.bot.userName}) reconnecting to PubSub`)
    this._ws.terminate()
    this._ws.close()
    setTimeout(this.connect.bind(this), reconnectInterval)
  }

  heartbeat () {
    if (this.awaitingPong) {
      Logger.info(`${this.bot.userId} (${this.bot.userName}) PubSub WebSocket no pong received`)
      Logger.debug("Ws no pong received.")
      this.reconnect()
    } else {
      this.awaitingPong = true
      this._ws.send(JSON.stringify({type: 'PING'}))
    }
  }

  async checkQueue () {
    if (this._wsSendQueue.length > 0) {
      if (this._ws && this._ws.readyState === this._ws.OPEN) {
        let queueElement = this._wsSendQueue.shift()
        try {
          await this.sendRaw(queueElement)
          this.emit('queue')
          return
        } catch (e) {
          this._wsSendQueue.unshift(queueElement)
          Logger.warn(`Sending MESSAGE to TwitchIrcConnector failed even though the socket connection is open:\n${e}`)
        }
      }
      await sleep(500)
      this.emit('queue')
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
    this._wsSendQueue.push(data)
    this.emit('queue')
  }

  /**
   * @param {Object} data
   */
  async sendRaw (data) {
    return new Promise((resolve, reject) => {
      try {
        this._ws.send(JSON.stringify(data), undefined, resolve)
      } catch (e) {
        reject(e)
      }
    })
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


/**
 * Basic sleep function
 * @param ms
 * @returns {Promise<unknown>}
 */
function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

module.exports = TwitchPubSubConnection

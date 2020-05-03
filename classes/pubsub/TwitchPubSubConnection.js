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
    this.interval = null
    this.connected = false
    this.registerEvents()
    this.awaitingPong = false
    this.reconnectTimeout = null
    this.commandsPer30 = 0
    this.ws = null

    this.heartbeatHandle = null

    this.interval = setInterval(() => {
      this.commandsPer30 = 0
      this._sendPing()
    }, 30 * 1000)
  }

  /**
   * Send ping to twitch servers and handle reconnect if not pong received.
   * @private
   */
  _sendPing () {
    if (this.awaitingPong) {
      this.client.destroy(new Error('No PONG received back.'))
      this.handleDisconnect()
      return
    }
    if (this.connected) {
      this.send('PING')
      this.awaitingPong = true
    }
  }

  /**
   * Register IRC events like 'PRIVMSG'
   */
  registerEvents () {
    this.client.pipe(ircMessage.createStream())
      .on('data', (parsed) => {
        if (parsed.command === 'PING') {
          return
        }
        if (parsed.command === 'PONG') {
          this.awaitingPong = false
          return
        }
        if (parsed.command === 'RECONNECT') {
          // will trigger "close" event, we don't need to do anything
          this.client.close(new Error('Twitch reconnect'))
          return
        }
        const cleanObj = {
          tags: parsed.tags,
          command: parsed.command,
          prefix: parsed.prefix,
          param: parsed.params[0] || '',
          trailing: parsed.params[1] || '',
        }
        try {
          this.emit(parsed.command, cleanObj)
        } catch (e) {
          Logger.error(e)
        }
      })
    this.ws.addEventListener('close', (err) => {
      this.connected = false
      this.handleDisconnect()
      this.emit('disconnect')
    })
    this.ws.addEventListener('error', (err) => {
      this.connected = false
      this.handleDisconnect()
      this.emit('disconnect')
    })
  }

  /**
   * Clear ping interval
   */
  close () {
    clearInterval(this.interval)
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

    this.ws = new WebSocket('wss://pubsub-edge.twitch.tv/', [], {})

    this.ws.addEventListener('open', event => {
      Logger.debug('INFO: Socket Opened')
      this.heartbeat()
      this.heartbeatHandle = setInterval(this.heartbeat.bind(this), heartbeatInterval)
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
    })

    this.ws.addEventListener('close', () => {
      Logger.debug('INFO: Socket Closed')
      clearInterval(this.heartbeatHandle)
      Logger.debug('INFO: Reconnecting...')
      setTimeout(connect, reconnectInterval)
    })
  }

  heartbeat () {
    this.ws.write(JSON.stringify({type: 'PING'}))
  }

  /**
   * Send a raw line to the twitch PubSub
   * @param {{type: string, nonce: string, data: {topics string[], auth_token: string}}} data
   */
  send (data) {
    if (data.type !== "PING") {
      Logger.debug(`--> ${data}`) //TODO: don't print auth
    }
    ++this.commandsPer30
    this.ws.write(JSON.stringify(data))
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

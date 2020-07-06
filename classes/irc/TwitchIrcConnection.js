"use strict"
const net = require('net')
const EventEmitter = require('eventemitter3')
const ircMessage = require('irc-message')

const Logger = require('../helper/Logger')
const DiscordLog = require('../helper/DiscordLog')

const host = 'irc.chat.twitch.tv'
const port = 6667
const reconnectMultiplier = 2000
const reconnectJitter = 500

class TwitchIrcConnection extends EventEmitter {
  /**
   * @param {Bot} bot
   */
  constructor (bot) {
    super()
    this._bot = bot
    this.forceDisconnect = false
    this.reconnectionAttempts = 0
    this.interval = null
    this.client = new net.Socket()
    this.client.setKeepAlive(false)
    this.channels = []
    this.connected = false
    this.registerEvents()
    this.awaitingPong = false
    this.reconnectTimeout = null
    this.commandsPer30 = 0
    this._lastPingDuration = -1
    this._currentPingStart = 0

    this.interval = setInterval(() => {
      this.commandsPer30 = 0
      this._sendPing()
    }, 30 * 1000)
  }

  /**
   * @return {Bot}
   */
  get bot () {
    return this._bot
  }

  /**
   * @return {number}
   */
  get lastPingDuration () {
    return this._lastPingDuration
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
      this._currentPingStart = Date.now()
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
          this._lastPingDuration = Date.now() - this._currentPingStart
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
    this.client.on('close', () => {
      this.connected = false
      this.handleDisconnect()
      this.emit('disconnect')
    })
    this.client.on('error', () => {
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
   * Join a channel
   * @param channel
   */
  join (channel) {
    this.send(`JOIN #${channel}`)
    this.channels.push(channel)
  }

  /**
   * Part a channel
   * @param channel
   */
  leave (channel) {
    this.channels = this.channels.filter(c => c !== channel)
    this.send(`PART #${channel}`)
  }

  /**
   * Rejoins a channel
   * @param channel
   */
  rejoin (channel) {
    this.leave(channel)
    this.join(channel)
  }

  /**
   * Connect to the twitch IRC server, login and send CAP REQ
   * @returns {Promise<void>}
   */
  async connect () {
    Logger.info(`Connecting to ${host}:${port}`)
    return new Promise((resolve) => {

      this.client.connect(port, host, () => {
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout)
          this.reconnectTimeout = null
        }
        this.reconnectionAttempts = 0
        this.connected = true
        Logger.info(`Successfully connected to ${host}:${port}`)
        this.send('CAP REQ :twitch.tv/tags twitch.tv/commands')// twitch.tv/membership')
        this.send(`PASS oauth:${this.bot.authentication.accessToken}`)
        this.send(`NICK ${this.bot.userName}`)
        this.send(`USER ${this.bot.userName} 8 * :${this.bot.userName}`)
        this.emit('connect')
        for (let i = 0; i < this.channels.length; i++) {
          this.send(`JOIN #${this.channels[i]}`)
        }
        this.pingTimeout = setTimeout(() => this._sendPing(), 60 * 1000)

        resolve()
      })
    })
  }

  /**
   * Say a message in a channel
   * @param channel
   * @param message
   */
  say (channel, message) {
    if (channel.charAt(0) !== '#') {
      channel = '#' + channel
    }
    //Logger.debug(`++> PRIVMSG ${channel} :${message}`)
    this.send(`PRIVMSG ${channel} :${message}`)
  }

  /**
   * Send a raw line to the twitch IRC
   * @param data
   */
  send (data) {
    if (data.indexOf("\n") >= 0) {
      Logger.warn('Tried to send a newline character!')
      DiscordLog.warn('Tried to send a newline character:\n' + data)
      return
    }
    if (data !== 'PONG' && data !== 'PING') {
      Logger.debug(`--> ${data.startsWith('PASS ') ? 'PASS oauth:********' : data}`)
    }
    ++this.commandsPer30
    this.client.write(`${data}\n`)
  }

  /**
   * Handle the disconnect and start a timeout to reconnect
   */
  handleDisconnect () {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    if (this.forceDisconnect || this.reconnectionAttempts > 0) {
      return // either deliberate or reconnection is already running.
    }
    Logger.error(`Disconnected from Twitch. \nBot: ${this.bot.userName}`)
    let timeout = 150
    if (this.reconnectionAttempts > 0) {
      const randomJitter = Math.floor(Math.random() * (reconnectJitter + 1))
      timeout = (reconnectMultiplier * this.reconnectionAttempts) - reconnectJitter + randomJitter
    }
    this.reconnectTimeout = setTimeout(() => this.attemptReconnect(), timeout)
  }

  /**
   * Try reconnecting with increasing delay on failure
   */
  attemptReconnect () {
    if (this.connected) {
      return
    }
    this.awaitingPong = false
    if (this.pingTimeout) {
      clearInterval(this.pingTimeout)
    }
    this.pingTimeout = null
    this.reconnectionAttempts++
    this.client.destroy()
    this.client.unref()
    this.client = new net.Socket()
    this.client.setKeepAlive(false)
    this.registerEvents()
    // noinspection JSIgnoredPromiseFromCall
    this.connect()
    const randomJitter = Math.floor(Math.random() * (reconnectJitter + 1))
    const reconnectionAttempts = this.reconnectionAttempts > 8 ? 8 : this.reconnectionAttempts
    const timeout = (reconnectMultiplier * reconnectionAttempts) - reconnectJitter + randomJitter
    this.reconnectTimeout = setTimeout(() => this.attemptReconnect(), timeout)
  }
}

module.exports = TwitchIrcConnection

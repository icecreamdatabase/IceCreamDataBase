const util = require('util')
const net = require('net')
const EventEmitter = require('eventemitter3')
const ircMessage = require('irc-message')

const DiscordLog = require('../modules/DiscordLog')

const host = 'irc.chat.twitch.tv'
const port = 6667
const reconnectMultiplier = 2000
const reconnectJitter = 500

class TwitchIRCConnection extends EventEmitter {
  constructor (botData) {
    super()
    this.queue = null
    this.botData = botData
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

    this.interval = setInterval(() => {
      this.commandsPer30 = 0
      this._sendPing()
    }, 30 * 1000)
  }

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
          console.error(e)
        }
      })
    this.client.on('close', (err) => {
      this.connected = false
      this.handleDisconnect()
      this.emit('disconnect')
    })
    this.client.on('error', (err) => {
      this.connected = false
      this.handleDisconnect()
      this.emit('disconnect')
    })
  }

  close () {
    clearInterval(this.interval)
  }

  join (channel) {
    this.send(`JOIN #${channel}`)
    this.channels.push(channel)
  }

  leave (channel) {
    this.channels = this.channels.filter(c => c !== channel)
    this.send(`PART #${channel}`)
  }

  async connect () {
    console.info(`Connecting to ${host}:${port}`)
    return new Promise((resolve) => {

      this.client.connect(port, host, () => {
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout)
          this.reconnectTimeout = null
        }
        this.reconnectionAttempts = 0
        this.connected = true
        console.info(`Successfully connected to ${host}:${port}`)
        this.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership')
        this.send(`PASS ${this.botData.token}`)
        this.send(`NICK ${this.botData.username}`)
        this.send(`USER ${this.botData.username} 8 * :${this.botData.username}`)
        this.emit('connect')
        for (let i = 0; i < this.channels.length; i++) {
          this.send(`JOIN #${this.channels[i]}`)
        }
        this.pingTimeout = setTimeout(() => this._sendPing(), 60 * 1000)

        resolve()
      })
    })
  }

  say (channel, message) {
    if (channel.charAt(0) !== '#') {
      channel = '#' * channel
    }
    this.send(`PRIVMSG ${channel} ${message}`)
  }

  send (data) {
    if (data.indexOf("\n") >= 0) {
      console.warn('Tried to send a newline character!')
      DiscordLog.warn('Tried to send a newline character:\n' + data)
      return
    }
    if (data !== 'PONG' && data !== 'PING') {
      console.debug(`--> ${data.startsWith('PASS ') ? 'PASS oauth:********' : data}`)
    }
    ++this.commandsPer30
    this.client.write(`${data}\n`)
  }

  handleDisconnect () {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    if (this.forceDisconnect || this.reconnectionAttempts > 0) {
      return // either deliberate or reconnection is already running.
    }
    console.error('Disconnected from Twitch')
    let timeout = 150
    if (this.reconnectionAttempts > 0) {
      const randomJitter = Math.floor(Math.random() * (reconnectJitter + 1))
      timeout = (reconnectMultiplier * this.reconnectionAttempts) - reconnectJitter + randomJitter
    }
    this.reconnectTimeout = setTimeout(() => this.attemptReconnect(), timeout)
  }

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

module.exports = TwitchIRCConnection

"use strict"
const Ws = require('ws')
//CLASSES
const Logger = require('./helper/Logger')
const DiscordLog = require('./helper/DiscordLog')

const WEBSOCKETPINGINTERVAL = 15000
const WS_SENT_VERSION = "2.2.0"

class WebSocket {
  constructor () {
    if (WebSocket.instance) {
      return WebSocket.instance
    }
    WebSocket.instance = this

    this.wss = new Ws.Server({port: 4700})
    this.wss.on('connection', this.newConnection.bind(this))
    setInterval(() => {
      this.wss.clients.forEach(function each (client) {
        if (client.readyState === Ws.OPEN) {
          try {
            client.ping()
          } catch (e) {
            Logger.error(__filename + "\nping failed\n" + e)
          }
        }
      })
    }, WEBSOCKETPINGINTERVAL)

    return this
  }

  /**
   * Handle a new incoming Websocket connection
   * Use like this: this.wss.on('connection', this.newConnection.bind(this))
   * @param ws websocket
   * @param req request object
   */
  newConnection (ws, req) {
    Logger.log(`°° WS connected. Current connections: ${ws._socket.server["_connections"]}`)
    // req.connection.remoteAddress
    ws.on('message', this.newMessage)
    ws.ping()
  }

  /**
   * Handles a new incoming Websocket message. and sets the channel.
   * Do not use .bind(this) for this function. This needs to be the websocket connection not the TtsWebSocket.js class!
   * @param message received message
   */
  newMessage (message) {
    Logger.log(`°° WS received: ${message}`)
    try {
      this.channel = JSON.parse(message).channel.toLowerCase()
    } catch (e) {
      this.channel = ""
      Logger.error("Websocket bad json: " + message)
    }
  }

  /**
   * Send data to the websocket clients. if channel != null only send to that specific channel
   * @param cmd
   * @param channel
   * @param data
   */
  sendToWebsocket (cmd, channel = null, data = null) {
    // save the channel you receive uppon connecting and only send to those
    this.wss.clients.forEach(function each (client) {
      if (client.readyState === Ws.OPEN
        && (
          channel === null || channel.toLowerCase() === (client.channel || "").toLowerCase()
        )) {
        try {
          client.send(JSON.stringify({cmd: cmd, data: data, version: WS_SENT_VERSION}))
        } catch (e) {
          Logger.error(__filename + "\nsend failed\n" + e)
        }
      }
    })
  }

  /**
   * Current number of connected websocket clients that have registered a channel.
   * @returns {number}
   */
  get websocketClientCount () {
    let currentWebsocketClientCount = 0
    this.wss.clients.forEach(function each (client) {
      if (client.readyState === Ws.OPEN) {
        currentWebsocketClientCount++
      }
    })
    return currentWebsocketClientCount
  }
}

module.exports = WebSocket

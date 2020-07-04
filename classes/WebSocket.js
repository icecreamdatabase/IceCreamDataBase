"use strict"
const Ws = require('ws')
//CLASSES
const Logger = require('./helper/Logger')
const DiscordLog = require('./helper/DiscordLog')

const WEBSOCKETPINGINTERVAL = 15000
const WS_SENT_VERSION = "3.0.0"

class WebSocket {
  /**
   * @typedef {object} WsDataReceive
   * @property {string} cmd
   * @property {WsDataReceiveTts|object} data
   * @property {string} version
   */

  /**
   * @typedef {object} WsDataReceiveTts
   * @property {string} channel
   */

  /**
   *
   * @return {WebSocket}
   */
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

  get WS_CMD_TTS_CONNECT () {
    return "tts_connect"
  }

  get WS_CMD_TTS_MESSAGE () {
    return "tts_message"
  }

  get WS_CMD_TTS_SKIP () {
    return "tts_skip"
  }

  get WS_CMD_TTS_RELOAD () {
    return "tts_reload"
  }

  /**
   * Handle a new incoming Websocket connection
   * Use like this: this.wss.on('connection', this.newConnection.bind(this))
   * @param ws websocket
   * @param req request object
   * @this `ws/lib/websocket-server`
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
   * @this `ws/lib/websocket`
   */
  newMessage (message) {
    Logger.log(`°° WS received: ${message}`)
    try {
      let parsedMsg = JSON.parse(message)
      let version = versionStrToArray(parsedMsg.version)

      switch (version[0]) {
        case 2:
          // MAJOR version 2
          /**
           * @type {WsDataReceive}
           */
          this.data = {
            cmd: WebSocket.instance.WS_CMD_TTS_CONNECT,
            data: {
              channel: parsedMsg.channel.toLowerCase()
            },
            version: parsedMsg.version
          }

          break
        case 3:
          // MAJOR version 3
          /**
           * @type {WsDataReceive}
           */
          this.data = parsedMsg

          break
        default:
          // All other versions
          Logger.warn(`Websocket with old version: ${message}`)
      }

    } catch (e) {
      Logger.error(`Websocket bad json: ${message}`)
    }
  }

  /**
   * Send data to the websocket clients. if channel != null only send to that specific ch.annel
   * @param {string} cmd
   * @param {string} channel
   * @param {object} data
   */
  sendToWebsocketBasedOnTtsChannel (cmd, channel = undefined, data = undefined) {
    // save the channel you receive uppon connecting and only send to those
    this.wss.clients.forEach((client) => {
      if (client.readyState === Ws.OPEN
        && client.data.cmd === this.WS_CMD_TTS_CONNECT
        && (
          channel === undefined || channel.toLowerCase() === (client.data.channel || "").toLowerCase()
        )) {
        try {
          client.send(JSON.stringify({cmd: cmd.toLowerCase(), data: data, version: WS_SENT_VERSION}))
        } catch (e) {
          Logger.error(__filename + "\nsend failed\n" + e)
        }
      }
    })
  }

  /**
   * Send data to all open websocket clients based on a includeChannelChecker function.
   * @param {string} cmd
   * @param {object} data
   * @param {function(WsDataReceive): boolean} includeChannelChecker
   */
  sendToWebsocket (cmd, data = undefined, includeChannelChecker = () => true) {
    this.wss.clients.forEach((client) => {
        if (client.readyState === Ws.OPEN) {
          if (Object.prototype.hasOwnProperty.call(client, "data")) {
            if (includeChannelChecker(client.data)) {
              let version = WS_SENT_VERSION
              try {
                // dealing with old 2.2.0 structure
                if (versionStrToArray(client.data.version)[0] === 2) {
                  switch (cmd) {
                    case this.WS_CMD_TTS_MESSAGE:
                      cmd = "tts"
                      break
                    case this.WS_CMD_TTS_SKIP:
                      cmd = "skip"
                      break
                    case this.WS_CMD_TTS_RELOAD:
                      cmd = "reload"
                      break
                  }
                  version = "2.2.0"
                }


                client.send(JSON.stringify({cmd: cmd.toLowerCase(), data: data, version: version}))
              } catch (e) {
                Logger.error(__filename + "\nsend failed\n" + e)
              }
            }
          } else {
            Logger.warn(`Client doesn't have data: \n${util.inspect(client)}`)
          }
        }
      }
    )
  }

  /**
   * Current number of connected websocket clients that have registered a channel.
   * @param {string} cmd
   * @returns {number}
   */
  getWebsocketClientCount (cmd) {
    let currentWebsocketClientCount = 0
    this.wss.clients.forEach(function each (client) {
      if (client.readyState === Ws.OPEN
        && Object.prototype.hasOwnProperty.call(client.data, "cmd")
        && client.data.cmd === cmd.toLowerCase()) {
        currentWebsocketClientCount++
      }
    })
    return currentWebsocketClientCount
  }
}

/**
 * Version should be in MAJOR.MINOR.PATCH --> [MAJOR, MINOR, PATCH] format.
 * @param versionStr
 * @return {number[]} [MAJOR, MINOR, PATCH] format.
 */
function versionStrToArray (versionStr) {
  return versionStr.split('.').map(x => parseInt(x))
}

module.exports = WebSocket

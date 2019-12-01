"use strict"
const util = require('util')
//CLASSES
const SqlPoints = require('../sql/modules/SqlPoints')
const Api = require('../api/Api.js')
const DiscordLog = require('./DiscordLog')
const Helper = require('./commands/Helper')
const UserLevels = require("../../ENUMS/UserLevels")

const WebSocket = require('ws')


module.exports = class Tts {
  constructor () {
    if (Tts.instance) {
      return Tts.instance
    }
    Tts.instance = this

    this.wss = new WebSocket.Server({ port: 4700 })
    this.wss.on('connection', this.newConnection.bind(this))

    return this
  }

  newConnection (ws) {
    console.log("-----------------")
    ws.on('message', function incoming(message) {
      console.log('received: %s', message)
    })
  }

  sendTts (channel, message) {
    if (channel.startsWith("#")) {
      channel = channel.substring(1)
    }

    this.wss.clients.forEach(function each (client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({channel: channel, message: message}))
      }
    })
  }

}

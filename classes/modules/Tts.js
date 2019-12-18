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
    console.log("-------------------")
    console.log("WS connected")
    ws.on('message', this.newMessage.bind(this))
  }

  newMessage (message) {
    console.log('WS received: %s', message)
  }

  sendTts (channel, message, voice = "Brian") {
    if (channel.startsWith("#")) {
      channel = channel.substring(1)
    }

    // save the channel you receive uppon connecting and only send to those
    this.wss.clients.forEach(function each (client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({channel: channel, message: message, voice: voice}))
      }
    })
  }

}

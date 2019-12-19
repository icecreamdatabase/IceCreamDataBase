"use strict"
const util = require('util')
//CLASSES
const SqlPoints = require('../sql/modules/SqlPoints')
const Api = require('../api/Api.js')
const DiscordLog = require('./DiscordLog')
const Helper = require('./commands/Helper')
const UserLevels = require("../../ENUMS/UserLevels")
const ClearChat = require("./ClearChat")

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

  sendTtsWithTimeoutCheck (channel, user, message, voice, waitForTimeoutLength = 5) {
    return new Promise((resolve)=> {
      setTimeout(async (channel, user, message, voice) => {
        // * 2 so we are also checking a bit before "now"
        let wasTimed = await ClearChat.wasTimedOut(channel, user, waitForTimeoutLength * 2)

        if (wasTimed) {
          DiscordLog.warn("TTS fail due to timeout: \n#" + channel + ", " + user + ": " + message)
          resolve(false)
        } else {
          this.sendTts(channel, message, voice)
          resolve(true)
        }
      }, waitForTimeoutLength * 1000, channel, user, message, voice)
    })
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

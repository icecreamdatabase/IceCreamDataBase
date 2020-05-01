"use strict"
const util = require('util')
const WebSocket = require('ws')
//CLASSES
const Logger = require('../../helper/Logger')
const Api = require('../../api/Api.js')
const DiscordLog = require('../DiscordLog')
const Helper = require('../commands/Helper')
const UserLevels = require("../../../ENUMS/UserLevels")
const ClearChat = require("../IrcTags/ClearChat")
const ClearMsg = require("../IrcTags/ClearMsg")

const WEBSOCKETPINGINTERVAL = 15000
const regExpTtsArray = new RegExp(/(\w+)(?:\(x?(\d*\.?\d*)\))?:/)
const PLAYBACKRATEMIN = 0.1
const PLAYBACKRATEMAX = 10.0

const voices = require('../../../json/se-voices.json')
const fallbackVoice = "Brian"
const useCaseSensitiveVoiceMatching = false
const voiceRandomObj = {
  "lang": "Random",
  "voices": [
    {
      "id": "Random",
      "name": "Random"
    }
  ]
}
// noinspection JSUnresolvedFunction
const voicesWithRandom = voices.concat([voiceRandomObj])

module.exports = class TtsWebSocket {
  constructor () {
    if (TtsWebSocket.instance) {
      return TtsWebSocket.instance
    }
    TtsWebSocket.instance = this

    this.wss = new WebSocket.Server({port: 4700})
    this.wss.on('connection', this.newConnection.bind(this))
    setInterval(() => {
      this.wss.clients.forEach(function each (client) {
        if (client.readyState === WebSocket.OPEN) {
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
   * Get voice language in ISO code by voice name or id.
   * @param voice voice or id
   * @param useCase is case sensitivity
   * @returns {string} voice language
   */
  getVoiceLang (voice, useCase = false) {
    let voiceLang = null

    voicesWithRandom.some(langElem => {
      let hasElem = langElem.voices.some(voiceElem => {
        if (useCase) {
          return (voiceElem.id === voice || voiceElem.name === voice)
        } else {
          return (voiceElem.id.toLowerCase() === voice.toLowerCase() || voiceElem.name.toLowerCase() === voice.toLowerCase())
        }
      })

      if (hasElem) {
        voiceLang = langElem.lang
      }

      return hasElem
    })

    return voiceLang
  }

  /**
   * Get voice ID by voice name.
   * Voice ID can be the same as voice name.
   * @param voice voice name
   * @param useCase use case sensitivity
   * @returns {string} voice ID
   */
  getVoiceID (voice, useCase = false) {
    let voiceID = null
    voice = voice.trim()

    voicesWithRandom.some(langElem => {
      return langElem.voices.some(voiceElem => {
        let match = (useCase ?
          (voiceElem.id === voice || voiceElem.name === voice) :
          (voiceElem.id.toLowerCase() === voice.toLowerCase() || voiceElem.name.toLowerCase() === voice.toLowerCase()))

        if (match) {
          voiceID = voiceElem.id
        }

        return match
      })
    })

    return voiceID
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
   * Send a TTS message with the "was user timed out for TTS message" check
   * @param privMsgObj
   * @param conversation
   * @param queue
   * @param allowCustomPlaybackrate
   * @param volume 0 - 100
   * @param voice
   * @param waitForTimeoutLength
   * @param maxMessageTime
   * @returns {Promise<unknown>}
   */
  sendTtsWithTimeoutCheck (privMsgObj, conversation = false, queue = false, allowCustomPlaybackrate = false, volume = 100, voice = defaultVoice, waitForTimeoutLength = 5, maxMessageTime = 0) {
    return new Promise((resolve) => {
      setTimeout(async (channel, username, message, conversation, queue, allowCustomPlaybackrate, volume, voice, maxMessageTime, color) => {
        // * 2 so we are also checking a bit before "now"
        if (ClearChat.wasTimedOut(channel, username, waitForTimeoutLength * 2) || ClearMsg.wasDeleted(privMsgObj.raw.tags.id)) {
          let userInfo = await Api.apiFallbackObject.kraken.userDataFromLogins([username]) //TODO: test this
          DiscordLog.twitchMessageCustom("tts-message-log",
            "Failed in: " + channel,
            message,
            new Date().toISOString(),
            color,
            username,
            userInfo[0].logo
          )
          resolve(false)
        } else {
          this.sendTts(channel, message, conversation, queue, allowCustomPlaybackrate, volume, voice, maxMessageTime)
          resolve(true)
        }
      }, waitForTimeoutLength * 1000, privMsgObj.channel, privMsgObj.username, privMsgObj.message, conversation, queue, allowCustomPlaybackrate, volume, voice, maxMessageTime, privMsgObj.raw.tags.color)
    })
  }

  /**
   * Send a TTS message to all clients, which have registered with the same channel.
   * @param channel
   * @param message
   * @param conversation
   * @param queue
   * @param allowCustomPlaybackrate
   * @param volume 0 - 100
   * @param voice
   * @param maxMessageTime
   */
  sendTts (channel, message, conversation = false, queue = false, allowCustomPlaybackrate = false, volume = 100, voice = fallbackVoice, maxMessageTime = 0) {
    if (channel.startsWith("#")) {
      channel = channel.substring(1)
    }
    let data = {channel: channel, data: [], queue: queue, volume: volume, maxMessageTime: maxMessageTime}

    if (conversation) {
      data.data = this.createTTSArray(message, useCaseSensitiveVoiceMatching, voice, allowCustomPlaybackrate)
    } else {
      data.data[0] = {voice: voice, message: message}
    }
    this.sendToWebsocket("tts", channel, data)
  }

  /**
   * Send the skip next message to a specific channel
   * @param channel
   */
  skip (channel) {
    if (channel.startsWith("#")) {
      channel = channel.substring(1)
    }
    this.sendToWebsocket("skip", channel)
  }

  reload () {
    this.sendToWebsocket("reload")
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
      if (client.readyState === WebSocket.OPEN
        && (
          channel === null || channel.toLowerCase() === (client.channel || "").toLowerCase()
        )) {
        try {
          client.send(JSON.stringify({cmd: cmd, data: data}))
        } catch (e) {
          Logger.error(__filename + "\nsend failed\n" + e)
        }
      }
    })
  }

  /**
   * Split the message like the forsen TTS syntax:
   * Brian: message 1 Justin: message 2 Brian: message 3
   * @param message
   * @param useCase
   * @param defaultVoice
   * @param allowCustomPlaybackrate
   * @param defaultPlaybackrate
   * @returns {{voice: string, message: string, playbackrate: number}[]}
   */
  createTTSArray (message, useCase = false, defaultVoice = fallbackVoice, allowCustomPlaybackrate = false, defaultPlaybackrate = 1.0) {
    let output = [{voice: defaultVoice, message: "", playbackrate: defaultPlaybackrate}]
    let outputIndex = 0
    for (let word of message.split(" ")) {
      if (word.endsWith(":")) {
        let match = word.match(regExpTtsArray)
        if (match && match[1]) {
          let voice
          if ((voice = this.getVoiceID(match[1], useCase))) {
            output[++outputIndex] = {}
            output[outputIndex]["voice"] = voice
            let playbackrate = parseFloat(match[2]) || defaultPlaybackrate
            playbackrate = Math.min(PLAYBACKRATEMAX, Math.max(PLAYBACKRATEMIN, playbackrate))
            output[outputIndex]["playbackrate"] = allowCustomPlaybackrate ? playbackrate : defaultPlaybackrate
            output[outputIndex]["message"] = ""
          }
        }
      } else {
        output[outputIndex]["message"] += " " + word
      }
    }
    output.map(x => {
      x.message = x.message.trim()
      if (x.voice === voiceRandomObj.voices[0].id) {
        x.voice = this.randomVoice
      }
    })
    return output.filter(x => x.message)
  }

  get randomVoice () {
    // noinspection JSUnresolvedVariable
    let languageArr = voices[Math.floor(Math.random() * voices.length)]
    // noinspection JSUnresolvedVariable
    let voiceObj = languageArr.voices[Math.floor(Math.random() * languageArr.voices.length)]
    // noinspection JSUnresolvedVariable
    return voiceObj.id
  }

  /**
   * Current number of connected websocket clients that have registered a channel.
   * @returns {number}
   */
  get websocketClientCount () {
    let currentWebsocketClientCount = 0
    this.wss.clients.forEach(function each (client) {
      if (client.readyState === WebSocket.OPEN) {
        currentWebsocketClientCount++
      }
    })
    return currentWebsocketClientCount
  }
}

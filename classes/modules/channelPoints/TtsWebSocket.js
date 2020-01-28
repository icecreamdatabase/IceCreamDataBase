"use strict"
const util = require('util')
//CLASSES
const Api = require('../../api/Api.js')
const DiscordLog = require('../DiscordLog')
const Helper = require('../commands/Helper')
const UserLevels = require("../../../ENUMS/UserLevels")
const ClearChat = require("../ClearChat")

const WebSocket = require('ws')
const voices = require('../../../json/se-voices.json')
const fallbackVoice = "Brian"
const conversationVoice = "CONVERSATION"
const useCaseSensitiveVoiceMatching = false

module.exports = class TtsWebSocket {
  constructor () {
    if (TtsWebSocket.instance) {
      return TtsWebSocket.instance
    }
    TtsWebSocket.instance = this

    this.wss = new WebSocket.Server({ port: 4700 })
    this.wss.on('connection', this.newConnection.bind(this))

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

    voices.some(langElem => {
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

    voices.some(langElem => {
      return langElem.voices.some(voiceElem => {
        let match = ( useCase ?
            (voiceElem.id === voice || voiceElem.name === voice) :
            (voiceElem.id.toLowerCase() === voice.toLowerCase() || voiceElem.name.toLowerCase() === voice.toLowerCase()) )

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
   */
  newConnection (ws) {
    console.log("-------------------")
    console.log("WS connected")
    ws.on('message', this.newMessage)
  }

  /**
   * Handles a new incoming Websocket message. and sets the channel.
   * Do not use .bind(this) for this function. This needs to be the websocket connection not the TtsWebSocket.js class!
   * @param message received message
   */
  newMessage (message) {
    console.log('WS received: %s', message)
    try {
      this.channel = JSON.parse(message).channel.toLowerCase()
    } catch (e) {
      this.channel = ""
      console.error("Websocket bad json: " + message)
      DiscordLog.error("Websocket bad json: " + message)
    }
  }

  /**
   * Send a TTS message with the "was user timed out for TTS message" check
   * @param privMsgObj
   * @param conversation
   * @param queue
   * @param voice
   * @param waitForTimeoutLength
   * @returns {Promise<unknown>}
   */
  sendTtsWithTimeoutCheck (privMsgObj, conversation = false, queue = false, voice = defaultVoice, waitForTimeoutLength = 5) {
    return new Promise((resolve)=> {
      setTimeout(async (channel, username, message, conversation, queue, voice, color) => {
        // * 2 so we are also checking a bit before "now"
        if (await ClearChat.wasTimedOut(channel, username, waitForTimeoutLength * 2)) {
          let userInfo = await Api.userDataFromLogins(global.clientIdFallback, [username])
          DiscordLog.twitchMessageCustom("tts-log",
                                                  "Failed in: " + channel,
                                                        message,
                                                        new Date().toISOString(),
                                                        color,
                                                        username,
                                                        userInfo[0].logo
                                        )
          resolve(false)
        } else {
          this.sendTts(channel, message, conversation, queue, voice)
          resolve(true)
        }
      }, waitForTimeoutLength * 1000, privMsgObj.channel, privMsgObj.username, privMsgObj.message, conversation, queue, voice, privMsgObj.raw.tags.color)
    })
  }

  /**
   * Send a TTS message to all clients, which have registered with the same channel.
   * @param channel
   * @param message
   * @param conversation
   * @param queue
   * @param voice
   */
  sendTts (channel, message, conversation = false, queue = false, voice = fallbackVoice) {
    if (channel.startsWith("#")) {
      channel = channel.substring(1)
    }
    let data = {channel: channel, data: [], queue: queue}
    let useCase = useCaseSensitiveVoiceMatching

    if (conversation) {
      data.data = this.createTTSArray(message, useCase, voice)
    } else {
      data.data[0] = {voice: voice, message: message}
    }

    // save the channel you receive uppon connecting and only send to those
    this.wss.clients.forEach(function each (client) {
      if (client.readyState === WebSocket.OPEN && channel.toLowerCase() === (client.channel || "").toLowerCase()) {
        client.send(JSON.stringify(data))
      }
    })
  }

  /**
   * Split the message like the forsen TTS syntax:
   * Brian: message 1 Justin: message 2 Brian: message 3
   * @param message
   * @param defaultVoice
   * @returns {{voice: string, message: string}[]}
   */
  createTTSArray (message, useCase = false, defaultVoice = fallbackVoice) {
    let output = [{voice: defaultVoice, message: ""}]
    let outputIndex = 0
    for (let word of message.split(" ")) {
      let voice
      if (word.endsWith(":") && (voice = this.getVoiceID(word.substr(0, word.length - 1), useCase))) {
        output[++outputIndex] = {}
        output[outputIndex]["voice"] = voice
        output[outputIndex]["message"] = ""
      } else {
        output[outputIndex]["message"] += " " + word
      }
    }
    output.map(x => x.message = x.message.trim())
    return output.filter(x => x.message)
  }
}

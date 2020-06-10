"use strict"
const WebSocket = require('ws')
//CLASSES
const Logger = require('../../../helper/Logger')
const Api = require('../../../api/Api.js')
const DiscordLog = require('../../../helper/DiscordLog')
const ClearChat = require("../IrcTags/ClearChat")
const ClearMsg = require("../IrcTags/ClearMsg")
const SqlChannelPoints = require('../../../sql/modules/SqlChannelPoints')

const WEBSOCKETPINGINTERVAL = 15000
const regExpTtsArray = new RegExp(/(\w+)(?:\(x?(\d*\.?\d*)\))?:/)
const PLAYBACKRATEMIN = 0.1
const PLAYBACKRATEMAX = 10.0
const WS_SENT_VERSION = "2.2.0"

const voices = require('../../../../json/se-voices.json')
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

class TtsWebSocket {
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
   * @param {privMsgObj} privMsgObj
   * @param {SqlChannelPoints} settingObj
   * @returns {Promise<boolean>}
   */
  async sendTtsWithTimeoutCheck (privMsgObj, settingObj) {
    await sleep(settingObj.timeoutCheckTime * 1000)

    // * 2 so we are also checking a bit before "now"
    if (ClearChat.wasTimedOut(privMsgObj.channel, privMsgObj.username, settingObj.timeoutCheckTime * 2) || ClearMsg.wasDeleted(privMsgObj.raw.tags.id)) {
      let userInfo = await Api.apiFallbackObject.kraken.userDataFromLogins([privMsgObj.username])
      DiscordLog.twitchMessageCustom("tts-message-log",
        "Failed in: " + privMsgObj.channel,
        privMsgObj.message,
        new Date().toISOString(),
        privMsgObj.raw.tags.color,
        privMsgObj.username,
        userInfo[0].logo
      )
      await SqlChannelPoints.ttsLog(privMsgObj.raw.tags.id,
        privMsgObj.roomId,
        privMsgObj.userId,
        privMsgObj.message,
        settingObj.defaultVoiceName,
        privMsgObj.userLevel,
        false
      )
      return false
    } else {
      this.sendTts(privMsgObj, settingObj, privMsgObj.message)
      await SqlChannelPoints.ttsLog(privMsgObj.raw.tags.id,
        privMsgObj.roomId,
        privMsgObj.userId,
        privMsgObj.message,
        settingObj.defaultVoiceName,
        privMsgObj.userLevel,
        true
      )
      return true
    }
  }

  /**
   * Send a TTS message to all clients, which have registered with the same channel.
   * @param {privMsgObj} privMsgObj
   * @param {SqlChannelPoints} settingObj
   * @param {string} message
   */
  sendTts (privMsgObj, settingObj, message) {
    let data = {
      channel: privMsgObj.channel,
      redeemer: privMsgObj.username,
      //id: privMsgObj.raw.tags.id,
      data: [],
      queue: settingObj.queue,
      volume: settingObj.volume,
      maxMessageTime: settingObj.maxMessageTime
    }

    if (data.channel.startsWith("#")) {
      data.channel = data.channel.substring(1)
    }

    if (settingObj.conversation) {
      data.data = this.createTTSArray(message, useCaseSensitiveVoiceMatching, settingObj.defaultVoiceName, settingObj.allowCustomPlaybackrate)
    } else {
      data.data[0] = {voice: settingObj.defaultVoiceName, message: message}
    }
    this.sendToWebsocket("tts", data.channel, data)
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
          client.send(JSON.stringify({cmd: cmd, data: data, version: WS_SENT_VERSION}))
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
      let newVoiceStart = false
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
            newVoiceStart = true
          }
        }
      }
      if (!newVoiceStart) {
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

module.exports = TtsWebSocket

/**
 *
 * @param {number} ms
 * @return {Promise<unknown>}
 */
async function sleep (ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

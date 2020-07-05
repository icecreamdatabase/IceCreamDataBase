"use strict"
//CLASSES
const WebSocket = new (require('../../../WebSocket')) //singleton
const Logger = require('../../../helper/Logger')
const Api = require('../../../api/Api.js')
const DiscordLog = require('../../../helper/DiscordLog')
const ClearChat = require("../IrcTags/ClearChat")
const ClearMsg = require("../IrcTags/ClearMsg")
const SqlChannelPoints = require('../../../sql/modules/SqlChannelPoints')

const regExpTtsArray = new RegExp(/(\w+)(?:\(x?(\d*\.?\d*)\))?:/)
const PLAYBACKRATEMIN = 0.1
const PLAYBACKRATEMAX = 10.0

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

const reloadOldVersionsIntervalTime = 120 * 1000 // 2 min
let reloadOldVersionsIntervalId

class TtsWebSocket {
  /**
   * Get voice language in ISO code by voice name or id.
   * @param voice voice or id
   * @param useCase is case sensitivity
   * @returns {string} voice language
   */
  static getVoiceLang (voice, useCase = false) {
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
  static getVoiceID (voice, useCase = false) {
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
   * Send a TTS message with the "was user timed out for TTS message" check
   * @param {privMsgObj} privMsgObj
   * @param {SqlChannelPoints} settingObj
   * @returns {Promise<boolean>}
   */
  static async sendTtsWithTimeoutCheck (privMsgObj, settingObj) {
    await sleep(settingObj.timeoutCheckTime * 1000)

    // * 2 so we are also checking a bit before "now"
    if (ClearChat.wasTimedOut(privMsgObj.channel, privMsgObj.username, settingObj.timeoutCheckTime * 2) || ClearMsg.wasDeleted(privMsgObj.raw.tags.id)
      || ClearMsg.wasDeleted(privMsgObj.raw.tags.id)
    ) {
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
  static sendTts (privMsgObj, settingObj, message) {
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
    WebSocket.sendToWebsocket(WebSocket.WS_CMD_TTS_MESSAGE,
      data,
      rxData => rxData.cmd === WebSocket.WS_CMD_TTS_CONNECT && rxData.data.channel === data.channel
    )
  }

  /**
   * Send the skip next message to a specific channel
   * @param channel
   */
  static skip (channel) {
    if (channel.startsWith("#")) {
      channel = channel.substring(1)
    }
    WebSocket.sendToWebsocket(WebSocket.WS_CMD_TTS_SKIP,
      undefined,
      rxData => rxData.cmd === WebSocket.WS_CMD_TTS_CONNECT && rxData.data.channel === channel
    )
  }

  /**
   * @param {string} [channel]
   * @return {number} How many clients have been reloaded
   */
  static reload (channel) {
    if (channel && channel.charAt(0) === '#') {
      channel = channel.substr(1)
    }
    return WebSocket.sendToWebsocket(WebSocket.WS_CMD_TTS_RELOAD,
      undefined,
      rxData => rxData.cmd === WebSocket.WS_CMD_TTS_CONNECT && (rxData.data.channel === channel || channel === undefined)
    )
  }

  /**
   * @return {number} How many clients have been reloaded
   */
  static reloadOldVersions () {
    let reloadAmount = WebSocket.sendToWebsocket(WebSocket.WS_CMD_TTS_RELOAD,
      undefined,
      rxData => rxData.cmd === WebSocket.WS_CMD_TTS_CONNECT && (rxData.version !== WebSocket.WS_SENT_VERSION)
    )
    if (reloadAmount > 0) {
      Logger.log(`Reloaded ${reloadAmount} old clients!`)
    }
    return reloadAmount
  }

  /**
   * @return {boolean} Auto reload is now on
   */
  static reloadOldVersionsAutoToggle () {
    if (reloadOldVersionsIntervalId === undefined) {
      reloadOldVersionsIntervalId = setInterval(this.reloadOldVersions, reloadOldVersionsIntervalTime)
      this.reloadOldVersions()
    } else {
      clearInterval(reloadOldVersionsIntervalId)
      reloadOldVersionsIntervalId = undefined
    }
    return reloadOldVersionsIntervalId !== undefined
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
  static createTTSArray (message, useCase = false, defaultVoice = fallbackVoice, allowCustomPlaybackrate = false, defaultPlaybackrate = 1.0) {
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

  static get randomVoice () {
    // noinspection JSUnresolvedVariable
    let languageArr = voices[Math.floor(Math.random() * voices.length)]
    // noinspection JSUnresolvedVariable
    let voiceObj = languageArr.voices[Math.floor(Math.random() * languageArr.voices.length)]
    // noinspection JSUnresolvedVariable
    return voiceObj.id
  }

  static get websocketTtsClientCount () {
    return WebSocket.getWebsocketClientCount(WebSocket.WS_CMD_TTS_CONNECT)
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

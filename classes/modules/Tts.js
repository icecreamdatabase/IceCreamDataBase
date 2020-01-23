"use strict"
const util = require('util')
//CLASSES
const Api = require('../api/Api.js')
const DiscordLog = require('./DiscordLog')
const Helper = require('./commands/Helper')
const UserLevels = require("../../ENUMS/UserLevels")
const ClearChat = require("./ClearChat")

const WebSocket = require('ws')
const voices = require('../../json/se-voices.json')
const defaultVoice = "Brian"
const conversationVoice = "CONVERSATION"

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

  getVoices () {
    return voices
  }

  getVoiceLang (voice, noCase = false) {
    let voiceLang = null

    voices.some(langElem => {
        let hasElem = langElem.voices.some(voiceElem => {
            if (noCase)
                return (voiceElem.id.toLowerCase() === voice.toLowerCase() || voiceElem.name.toLowerCase() === voice.toLowerCase())
            else
                return (voiceElem.id === voice || voiceElem.name === voice)
        })

        if (hasElem) voicelang = langElem.lang

        return hasElem
    })

    return voiceLang
  }

  getVoiceID (voice, noCase = false) {
    let voiceID = null

    voices.some(langElem => {
        return langElem.voices.some(voiceElem => {
            let match = ( noCase ?
                (voiceElem.id.toLowerCase() === voice.toLowerCase() || voiceElem.name.toLowerCase() === voice.toLowerCase()) :
                (voiceElem.id === voice || voiceElem.name === voice) )

            if (match) voiceID = voiceElem.id

            return match
        })
    })

    return voiceID
  }

  newConnection (ws) {
    console.log("-------------------")
    console.log("WS connected")
    ws.on('message', this.newMessage.bind(this))
  }

  newMessage (message) {
    console.log('WS received: %s', message)
  }

  sendTtsWithTimeoutCheck (channel, user, message, conversation = false, voice = defaultVoice, waitForTimeoutLength = 5) {
    return new Promise((resolve)=> {
      setTimeout(async (channel, user, message, conversation, voice) => {
        // * 2 so we are also checking a bit before "now"
        let wasTimed = await ClearChat.wasTimedOut(channel, user, waitForTimeoutLength * 2)

        if (wasTimed) {
          DiscordLog.warn("TTS fail due to timeout: \n" + channel + ", " + user + ": " + message)
          resolve(false)
        } else {
          this.sendTts(channel, message, conversation, voice)
          resolve(true)
        }
      }, waitForTimeoutLength * 1000, channel, user, message, conversation, voice)
    })
  }

  sendTts (channel, message, conversation = false, voice = defaultVoice) {
    if (channel.startsWith("#")) {
      channel = channel.substring(1)
    }
    let data = {channel: channel, data: []}

    if (conversation) {
      data.data = this.createTTSArray(message, voice)
    } else {
      data.data[0] = {voice: voice, message: message}
    }

    // save the channel you receive uppon connecting and only send to those
    this.wss.clients.forEach(function each (client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data))
      }
    })
  }

  createTTSArray (message, defaultVoice = "Brian") {
    let output = [{voice: defaultVoice, message: ""}]
    let outputIndex = 0
    for (let word of message.split(" ")) {
      let voice
      if (word.endsWith(":") && (voice = this.getVoiceID(word.substr(0, word.length - 1), true))) {
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

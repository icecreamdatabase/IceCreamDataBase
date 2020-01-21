"use strict"
const util = require('util')
//CLASSES
const Api = require('../api/Api.js')
const DiscordLog = require('./DiscordLog')
const Helper = require('./commands/Helper')
const UserLevels = require("../../ENUMS/UserLevels")
const ClearChat = require("./ClearChat")

const WebSocket = require('ws')
const voices = ["Aditi", "Amy", "Astrid", "Bianca", "Brian", "Carla", "Carmen", "Celine", "Chantal", "Conchita", "Cristiano", "Dora", "Emma", "Enrique", "Ewa", "Filiz", "Geraint", "Giorgio", "Gwyneth", "Hans", "Ines", "Ivy", "Jacek", "Jan", "Joanna", "Joey", "Justin", "Karl", "Kendra", "Kimberly", "Liv", "Lotte", "Mads", "Maja", "Marlene", "Mathieu", "Matthew", "Maxim", "Mia", "Miguel", "Mizuki", "Naja", "Nicole", "Penelope", "Raveena", "Ricardo", "Ruben", "Russell", "Salli", "Seoyeon", "Takumi", "Tatyana", "Vicki", "Vitoria", "Zhiyu", /* Less refinded ones */ "An", "Andika", "Asaf", "Danny", "Filip", "Guillaume", "HanHan", "Heather", "Heidi", "Hemant", "Herena", "Hoda", "Huihui", "Ivan", "Jakub", "Kalpana", "Kangkang", "Karsten", "Lado", "Linda", "Matej", "Michael", "Naayf", "Pattara", "Rizwan", "Sean", "Stefanos", "Szabolcs", "Tracy", "Valluvar", "Yaoyao", "Zhiwei"]
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
      if (word.endsWith(":") && voices.includes(word.substr(0, word.length - 1))) {
        output[++outputIndex] = {}
        output[outputIndex]["voice"] = word.substr(0, word.length - 1)
        output[outputIndex]["message"] = ""
      } else {
        output[outputIndex]["message"] += " " + word
      }
    }
    output.map(x => x.message = x.message.trim())
    return output.filter(x => x.message)
  }

}

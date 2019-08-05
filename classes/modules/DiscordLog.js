"use strict"
const Logger = require('consola')
const https = require('https')
const EventEmitter = require('eventemitter3')
const options = require('../../config.json')

const WEBHOOK = {
  host: "discordapp.com",
  path: "/api/webhooks/",
  method: 'POST',
  headers: {
    "Content-Type": "application/json"
  },
}

const MESSAGE_QUEUE = []
const LOG_QUEUE_EMITTER = new EventEmitter()
LOG_QUEUE_EMITTER.on('event', queueRunner)

let QUEUE_BEING_CHECKED = false

module.exports = class DiscordLog {
  constructor (bot) {
  }

  static error (message) {
    MESSAGE_QUEUE.push(getMessageQueueObj("bot-log", "Error", message, "16009031"))
    LOG_QUEUE_EMITTER.emit("event")
  }
  static warn (message) {
    MESSAGE_QUEUE.push(getMessageQueueObj("bot-log", "Warn", message, "16009031"))
    LOG_QUEUE_EMITTER.emit("event")
  }
  static info (message) {
    MESSAGE_QUEUE.push(getMessageQueueObj("bot-log", "Info", message, "15653937"))
    LOG_QUEUE_EMITTER.emit("event")
  }
  static debug (message) {
    MESSAGE_QUEUE.push(getMessageQueueObj("bot-log", "Debug", message, "8379242"))
    LOG_QUEUE_EMITTER.emit("event")
  }
  static trace (message) {
    MESSAGE_QUEUE.push(getMessageQueueObj("bot-log", "Trace", message, "8379242"))
    LOG_QUEUE_EMITTER.emit("event")
  }

  static custom (webhookName, title, message, decimalColour) {
    MESSAGE_QUEUE.push(getMessageQueueObj(webhookName, title, message, decimalColour))
    LOG_QUEUE_EMITTER.emit("event")
  }

  static getDecimalFromHexString (hex) {
    hex = hex.replace("#", "")
    if (!hex.startsWith("0x")) {
      hex = "0x" + hex
    }
    return parseInt(hex)
  }
}

function getMessageQueueObj (webhookName, title, message, decimalColour) {
  return {
    "webhookName": webhookName,
    "postContent": {
      "wait": true,
      "embeds": [{
        "title": title,
        "description": message,
        "timestamp": new Date().toISOString(),
        "color": decimalColour
      }]
    }
  }
}

function queueRunner () {
  if (MESSAGE_QUEUE.length > 0 && !QUEUE_BEING_CHECKED) {
    QUEUE_BEING_CHECKED = true
    sendToWebhook(MESSAGE_QUEUE.shift()).then(()=>{
      QUEUE_BEING_CHECKED = false
      LOG_QUEUE_EMITTER.emit("event")
    }, () => {
      QUEUE_BEING_CHECKED = false
      LOG_QUEUE_EMITTER.emit("event")
    })
  }
}

async function sendToWebhook (messageQueueObj) {
  return new Promise((resolve, reject) => {
    //Logger.info(JSON.stringify(messageQueueObj, null, 2))
    if (options.hasOwnProperty("discord") && options.discord.hasOwnProperty(messageQueueObj.webhookName)) {
      let request = Object.assign({}, WEBHOOK)
      request.path += options.discord[messageQueueObj.webhookName].id + "/" + options.discord[messageQueueObj.webhookName].token

      let req = https.request(request, (res) => {
        resolve(res)
      })
      req.on('error', (err) => {
        Logger.error(err)
        reject(err)
      })
      req.write(JSON.stringify(messageQueueObj.postContent))
      req.end()
    } else {
      Logger.warn("no options.discord.logwebhook")
      reject()
    }
  })
}


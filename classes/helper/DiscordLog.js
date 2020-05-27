"use strict"
const https = require('https')
const EventEmitter = require('eventemitter3')
const options = require('../../config.json')
const Logger = require('./Logger')

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

class DiscordLog {
  /**
   * @private
   */
  constructor () {
  }

  /**
   * Logs a message in bot-log discord channel.
   * Type: Error
   * Colour: Red
   * @param message Message to log
   */
  static error (message) {
    MESSAGE_QUEUE.push(getMessageQueueObj("bot-log", "Error", message, "16009031"))
    LOG_QUEUE_EMITTER.emit("event")
  }

  /**
   * Logs a message in bot-log discord channel.
   * Type: Warn
   * Colour: Red
   * @param message Message to log
   */
  static warn (message) {
    MESSAGE_QUEUE.push(getMessageQueueObj("bot-log", "Warn", message, "16009031"))
    LOG_QUEUE_EMITTER.emit("event")
  }

  /**
   * Logs a message in bot-log discord channel.
   * Type: Info
   * Colour: Yellow
   * @param message Message to log
   */
  static info (message) {
    MESSAGE_QUEUE.push(getMessageQueueObj("bot-log", "Info", message, "15653937"))
    LOG_QUEUE_EMITTER.emit("event")
  }

  /**
   * Logs a message in bot-log discord channel.
   * Type: Debug
   * Colour: Green
   * @param message Message to log
   */
  static debug (message) {
    MESSAGE_QUEUE.push(getMessageQueueObj("bot-log", "Debug", message, "8379242"))
    LOG_QUEUE_EMITTER.emit("event")
  }

  /**
   * Logs a message in bot-log discord channel.
   * Type: Trace
   * Colour: Green
   * @param message Message to log
   */
  static trace (message) {
    MESSAGE_QUEUE.push(getMessageQueueObj("bot-log", "Trace", message, "8379242"))
    LOG_QUEUE_EMITTER.emit("event")
  }

  /**
   * Log a message in a twitch message style.
   * By webhookName
   * @param webhookName
   * @param title
   * @param description
   * @param timestamp
   * @param colorHex
   * @param footerText
   * @param footerIconUrl
   */
  static twitchMessageCustom (webhookName, title, description, timestamp, colorHex, footerText, footerIconUrl) {
    if (Object.prototype.hasOwnProperty.call(options, "discord") && Object.prototype.hasOwnProperty.call(options.discord, webhookName)) {
      this.twitchMessageManual(options.discord[webhookName].id, options.discord[webhookName].token, title, description, timestamp, colorHex, footerText, footerIconUrl)
    }
  }

  /**
   * Log a message in a twitch message style.
   * By id and token
   * @param id
   * @param token
   * @param title
   * @param description
   * @param timestamp
   * @param colorHex
   * @param footerText
   * @param footerIconUrl
   */
  static twitchMessageManual (id, token, title, description, timestamp, colorHex, footerText, footerIconUrl) {
    let messageQueueObj = {
      "webhookName": "custom",
      "id": id,
      "token": token,
      "postContent": {
        "wait": true,
        "embeds": [{
          //"title": title,
          "description": description,
          "timestamp": timestamp,
          "color": DiscordLog.getDecimalFromHexString(colorHex),
          //"footer": {
          //  "text": footerText,
          //  "icon_url": footerIconUrl
          //},
        }]
      }
    }
    if (title) {
      messageQueueObj.postContent.embeds[0].title = title
    }
    if (footerText || footerIconUrl) {
      messageQueueObj.postContent.embeds[0].footer = {}
    }
    if (footerText) {
      messageQueueObj.postContent.embeds[0].footer.text = footerText
    }
    if (footerIconUrl) {
      messageQueueObj.postContent.embeds[0].footer["icon_url"] = footerIconUrl
    }

    MESSAGE_QUEUE.push(messageQueueObj)
    LOG_QUEUE_EMITTER.emit(("event"))
  }

  /**
   * Send a Discord webhook object manually.
   * @param messageQueueObj Discord webhook object
   */
  static manual (messageQueueObj) {
    MESSAGE_QUEUE.push(messageQueueObj)
    LOG_QUEUE_EMITTER.emit(("event"))
  }

  /**
   * Send a basic message to a Discord webhook.
   * @param webhookName
   * @param title
   * @param message
   * @param decimalColour
   */
  static custom (webhookName, title, message, decimalColour) {
    MESSAGE_QUEUE.push(getMessageQueueObj(webhookName, title, message, decimalColour))
    LOG_QUEUE_EMITTER.emit("event")
  }

  /**
   * Convert Hex colour string to decimal used by Discord webhooks
   * @param hex input colour
   * @returns {number} converted decimal colour
   */
  static getDecimalFromHexString (hex) {
    hex = hex.toString().replace("#", "")
    if (!hex.startsWith("0x")) {
      hex = "0x" + hex
    }
    return parseInt(hex)
  }
}

/**
 * Create basic Discord webhook object.
 * Has not converted webhookname to id + token yet.
 * @param webhookName
 * @param title
 * @param message
 * @param decimalColour
 * @returns {{postContent: {wait: boolean, embeds: [{color: *, description: *, title: *, timestamp: *}]}, webhookName: *}}
 */
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

/**
 * Checks the queue, handles the current object and send the 'event' event again.
 * Use like this: LOG_QUEUE_EMITTER.on('event', queueRunner)
 */
function queueRunner () {
  if (MESSAGE_QUEUE.length > 0 && !QUEUE_BEING_CHECKED) {
    QUEUE_BEING_CHECKED = true
    sendToWebhook(MESSAGE_QUEUE.shift()).then(() => {
      QUEUE_BEING_CHECKED = false
      LOG_QUEUE_EMITTER.emit("event")
    }, () => {
      QUEUE_BEING_CHECKED = false
      LOG_QUEUE_EMITTER.emit("event")
    })
  }
}

/**
 * Send a messageQueueObj to the Discord servers.
 * Converts webhookName to id + token
 * @param messageQueueObj input object
 * @returns {Promise<void>}
 */
async function sendToWebhook (messageQueueObj) {
  return new Promise((resolve, reject) => {
    //Logger.info(JSON.stringify(messageQueueObj, null, 2))
    if (messageQueueObj.webhookName === "custom"
      || Object.prototype.hasOwnProperty.call(options, "discord") && Object.prototype.hasOwnProperty.call(options.discord, messageQueueObj.webhookName)) {
      let request = Object.assign({}, WEBHOOK)
      if (messageQueueObj.webhookName === "custom") {
        request.path += messageQueueObj.id + "/" + messageQueueObj.token
      } else {
        request.path += options.discord[messageQueueObj.webhookName].id + "/" + options.discord[messageQueueObj.webhookName].token
      }
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

module.exports = DiscordLog

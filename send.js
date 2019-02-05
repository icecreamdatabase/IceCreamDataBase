const Logger = require('consola')
const Api = require('./api.js')
const EventEmitter = require('eventemitter3')

module.exports = {
  pastMessages,
  cleanupGlobalTimeout,
  checkGlobalTimeout,
  sayQueue
}
//regex
const nlRegEx = new RegExp("{nl\\d*}", 'ig')
const delayRegEx = new RegExp("\\d*}", 'ig')

const PLEB_RATELIMIT = 20
const MOD_RATELIMIT = 100
const KNOWN_RATELIMIT = 100 //TODO: get the corrext number
const VERIFIED_RATELIMIT = 7500

const queueEmitter = new EventEmitter()
var messageQueue = []
var pastMessages = []
var addSpecialCharacter = {}
var lastBotLevelChecked = {}

async function cleanupGlobalTimeout () {
  while (pastMessages.length > 0 && pastMessages[0] + 30000 < new Date().getTime()) {
    pastMessages.shift()
  }
}

function checkGlobalTimeout (bot, channel) {
  let ratelimit = PLEB_RATELIMIT
  if (PLEB_RATELIMIT === MOD_RATELIMIT) {
    ratelimit = MOD_RATELIMIT
  }
  if (bot.chat.isKnown) {
    ratelimit = KNOWN_RATELIMIT
  }
  if (bot.chat.isVerified) {
    ratelimit = VERIFIED_RATELIMIT
  }
  if (pastMessages.length < ratelimit) {
    Logger.info(pastMessages.length + " message(s) in the past 30 seconds")
    return false
  } else {
    return true
  }
}

function channelIdFromName (chat, channel) {
  let channelId = -1
  for (var channelIndex in chat.channels) {
    if (channel.replace(/#/, '') === chat.channels[channelIndex].channelName) {
      channelId = chat.channels[channelIndex].channelID
    }
  }
  return channelId
}

async function sayQueue (chat, channel, message, userId) {
  userId = userId || "-1"
  bot = bots[chat.botData.userId]
  //chat.say(channel, message)
  let channelId = channelIdFromName(chat, channel)
  chat.say(channel, (chat.channels[channelId].botStatus))
  //messageQueue.push({checked: false, isBeingChecked: false, allow: false, chat: chat, channel: channel, userId: userId, message: message})
  queueEmitter.emit('checkQueue')
}
/*
queueEmitter.on('checkQueue', async () => {
  if (messageQueue.length > 0) {
    if (messageQueue[0].checked) {
      if (messageQueue[0].allow) {
        queueEmitter.emit('checkQueue')
        let msgObj = messageQueue.shift()
        handleNewLine(msgObj.chat, msgObj.channel, msgObj.userId, msgObj.message)
      } else {
        messageQueue.shift()
      }
    } else if (!messageQueue[0].isBeingChecked) {
      messageQueue[0].isBeingChecked = true

      messageQueue[0].allow = !moderationHandler.containsNword(messageQueue[0].messageObj.message)
      messageQueue[0].checked = true
      messageQueue[0].isBeingChecked = false
      queueEmitter.emit('event')
    }
  }
})

function handleNewLine (chat, channel, userId, message) {
  if (nlRegEx.test(message)) {
    let delay = !isMOD(client, channel, client.getUsername()) && !isVIP(channel, client.getUsername()) ? 1250 : 0
    let currentDelay = 0

    console.log(client.getUsername() + " " + delay)

    let regNls = message.match(nlRegEx)
    let regDelay = message.match(delayRegEx)
    //this is simply needed to not cause errors later at currentDelay += regDelay[index]
    //message.split is 1 longer than regDelay --> would throw array out of bound
    regDelay.push('{nl}')

    //get the raw number from {nlXXXX}
    //if only {nl} return 0
    regDelay.forEach( function (element, index) {
      regDelay[index] = parseInt(element) || 0
    })

    message.split(nlRegEx).forEach( function (messageElement, index) {
      messageElement = messageElement.trim()
      setTimeout(function () {
        sendMessage(client, channel, username, messageElement)
      }, currentDelay)

      currentDelay += regDelay[index]
      //only add the "pleb delay" if pleb.
      if (regDelay[index] < delay) {
        //Imagine regDelay[index] is 1000ms and delay is 1250ms
        //because the 1000ms where already added earlier now only the delay of 250 needs to be added
        currentDelay += delay - regDelay[index]
      }
    })
  } else {
    sendMessage(client, channel, username, message)
  }
}
*/

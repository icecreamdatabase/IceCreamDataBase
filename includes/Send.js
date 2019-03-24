"use strict"
const Logger = require('consola')
const EventEmitter = require('eventemitter3')
const UserLevels = require('../ENUMS/UserLevels.js')

module.exports = {
  pastMessages,
  cleanupGlobalTimeout,
  checkGlobalTimeout,
  sayQueue
}
//regex
//group #1 is the text infront of the {nlXXXX}
//group #2 is the delay in {nlXXXX} ... if XXXX is not there group#2 is ""
const regExNewLine = new RegExp(/([^{}]*){nl(\d*)}*/, 'ig')

const PLEB_RATELIMIT = 20
const MOD_RATELIMIT = 100
const KNOWN_RATELIMIT = 50 //TODO: get the corrext number
const VERIFIED_RATELIMIT = 7500

const queueEmitter = new EventEmitter()

//make this per bot
var messageQueue = []
//make this per channel
var pastMessages = []
var addSpecialCharacter = {}

async function cleanupGlobalTimeout () {
  while (pastMessages.length > 0 && pastMessages[0] + 30000 < new Date().getTime()) {
    pastMessages.shift()
  }
}

function checkGlobalTimeout (chat, channel) {
  let ratelimit = PLEB_RATELIMIT
  if (PLEB_RATELIMIT === MOD_RATELIMIT) {
    ratelimit = MOD_RATELIMIT
  }
  if (chat.isKnown) {
    ratelimit = KNOWN_RATELIMIT
  }
  if (chat.isVerified) {
    ratelimit = VERIFIED_RATELIMIT
  }
  if (pastMessages.length < ratelimit) {
    Logger.info(pastMessages.length + " message(s) in the past 30 seconds")
    return false
  } else {
    return true
  }
}

//TODO: use userIdLoginCache
function channelIdFromName (chat, channel) {
  let channelId = -1
  for (var channelIndex in chat.channels) {
    if (channel.replace(/#/, '') === chat.channels[channelIndex].channelName) {
      channelId = chat.channels[channelIndex].channelID
    }
  }
  return channelId
}

//TODO make the handlenewline fill the queue and then the queue send the messages out and check for global timeout

async function sayQueue (chat, channel, message, userId) {
  //if userId paramter is missing just set it to "-1"
  userId = userId || "-1"

  messageQueue.push({checked: false, isBeingChecked: false, allow: false, chat, channel: chat.channels[channelIdFromName(chat, channel)], userId, message})
  queueEmitter.emit('checkQueue')
}

queueEmitter.on('checkQueue', async () => {
  if (messageQueue.length > 0) {
    if (messageQueue[0].checked) {
      if (messageQueue[0].allow) {
        let msgObj = messageQueue.shift()
        handleNewLine(msgObj.chat, msgObj.channel, msgObj.userId, msgObj.message)
        queueEmitter.emit('checkQueue')
      } else {
        messageQueue.shift()
      }
    } else if (!messageQueue[0].isBeingChecked) {
      messageQueue[0].isBeingChecked = true

      /* TODO: moderation*/
      messageQueue[0].allow = true //!moderationHandler.containsNword(messageQueue[0].messageObj.message)
      messageQueue[0].checked = true
      messageQueue[0].isBeingChecked = false
      queueEmitter.emit('event')
    }
  }
})

function handleNewLine (chat, channel, userId, message) {
  if (regExNewLine.test(message)) {
    let delay = (channel.botStatus >= UserLevels.VIP) ? 0 : 1250
    let currentDelay = 0
    message += "{nl}"
    let matchArray = []

    let match = regExNewLine.exec(message)
    while (match != null) {
      matchArray.push([match[1], parseInt(match[2]) || 0])
      match = regExNewLine.exec(message)
    }

    for (var matchElement of matchArray) {
      Logger.info(currentDelay)
      Logger.info(delay)
      Logger.info(matchElement)
      Logger.info("-----------------")
      setTimeout(function () {
        sendMessage(chat, channel, userId, matchElement[0] || "")
      }, currentDelay)

      currentDelay += matchElement[1]
      //only add the "pleb delay" if pleb.
      if (matchElement[1] < delay) {
        //Imagine matchElement[1] is 1000ms and delay is 1250ms
        //because the 1000ms where already added earlier now only the delay of 250 needs to be added
        currentDelay += delay - matchElement[1]
      }
    }
  } else {
    sendMessage(chat, channel, userId, message)
  }
}

async function sendMessage (chat, channel, userId, message) {
  if (message.length === 0) {
    return
  }

  let isSelfMessage = chat.botData.userID === userId
  let elevatedUser = channel.botStatus >= UserLevels.VIP
  var delay = (isSelfMessage && !elevatedUser) ? 1250 : 0

  if (delay > 0) {
    await sleep(delay)
  }

  var currentTimeMillis = new Date().getTime()
  //more than 1250ms since last message
  if ((channel.lastMessageTime || 0) + 1225 < currentTimeMillis || elevatedUser) {
    channel.lastMessageTime = currentTimeMillis

    //anti global ban
    cleanupGlobalTimeout()
    if (!checkGlobalTimeout(chat, elevatedUser)) {
      pastMessages.push(new Date().getTime())
      var shouldAdd = addSpecialCharacter[channel] || false
      if (shouldAdd && !elevatedUser) {
        message = message + " \u206D"
      }
      addSpecialCharacter[channel] = !shouldAdd
      Logger.info("--> " + channel.channelName + ": " + message)
      chat.say(channel.channelName, message)
    } else {
      console.log("ratelimit: XX messages in past " + (currentTimeMillis - pastMessages[0]) + "ms")
    }
  } else {
    console.log("ratelimit: Too fast as pleb " + (currentTimeMillis - (channel.lastMessageTime || 0)) + "ms")
  }
}

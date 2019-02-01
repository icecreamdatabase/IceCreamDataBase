const Logger = require('consola')
const Api = require('./api.js')

module.exports = {
  pastMessages,
  cleanupGlobalTimeout,
  checkGlobalTimeout,
  sayQueue
}

const PLEB_RATELIMIT = 20
const MOD_RATELIMIT = 100
const KNOWN_RATELIMIT = 100 //TODO: get the corrext number
const VERIFIED_RATELIMIT = 7500

var pastMessages = []
var addSpecialCharacter = {}

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

async function sayQueue (chat, channel, message) {
  chat.say(channel, message)
}

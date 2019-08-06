"use strict"
const util = require('util')
//CLASSES
const ApiFunctions = require('../../api/ApiFunctions.js')
const DiscordLog = require('./../DiscordLog')


module.exports = class PrivMsg {
  constructor (bot) {
    this.bot = bot

  }

  /**
   * Handles hardcoded commands
   * @param messageObj created in PrivMsg.createRawMessageObj
   * @returns {boolean} don't allow further commands
   */
  handle (messageObj) {
    /* Shutting down the bot */
    if (messageObj.message.startsWith("<s ") && messageObj.userId === "38949074") {
      this.bot.TwitchIRCConnection.say(messageObj.channel, "Shutting down FeelsBadMan")
      setTimeout(function () {
        process.exit(0)
      }, 1200)
      return true
    }

    if (messageObj.message.startsWith("<bot ")) {
      this.bot.TwitchIRCConnection.queue.sayWithBoth(messageObj.roomId, messageObj.channel, "I'm the not so shitty V2 version of the IceCreamDataBase bot. Made by icdb in nodejs. FeelsDankMan ", messageObj.userId)
      return true
    }

    if (messageObj.message.startsWith("<uptime ")) {
      this.bot.TwitchIRCConnection.queue.sayWithBoth(messageObj.roomId, messageObj.channel, messageObj.username + ", Bot running for " + PrivMsg.msToDDHHMMSS(process.uptime()), messageObj.userId)
      return true
    }

    if (messageObj.message.startsWith("< ")) {
      this.bot.TwitchIRCConnection.queue.sayWithBoth(messageObj.roomId, messageObj.channel, ">", messageObj.userId)
      return true
    }

    /*
    if (messageObj.message.startsWith("<tags ")) {
      this.bot.TwitchIRCConnection.queue.sayWithBoth(messageObj.roomId, messageObj.channel, JSON.stringify(messageObj), messageObj.userId)
      return true
    }
    if (messageObj.message.startsWith("<y ")) {
      this.bot.TwitchIRCConnection.queue.sayWithBoth(messageObj.roomId, messageObj.channel, "word1{nl}word2 {nl}word3{nl} word4 {nl} word5 {nl} {nl}", messageObj.userId)
      return true
    }
    */
    return false
  }

  //TODO: move somewhere useful
  static msToDDHHMMSS (ms) {
    let secNum = parseInt(ms + "", 10) // don't forget the second param
    let days = Math.floor(secNum / 86400)
    let hours = Math.floor((secNum - (days * 86400)) / 3600)
    let minutes = Math.floor((secNum - (days * 86400) - (hours * 3600)) / 60)
    let seconds = secNum - (days * 86400) - (hours * 3600) - (minutes * 60)

    /*
    if (hours < 10) { hours = "0" + hours }
    if (minutes < 10) { minutes = "0" + minutes }
    if (seconds < 10) { seconds = "0" + seconds }
    */

    let time = seconds + 's'
    if (minutes > 0 || hours > 0) {
      time = minutes + 'm ' + time
    }
    if (hours > 0) {
      time = hours + 'h ' + time
    }
    if (days > 0) {
      time = days + 'd ' + time
    }
    return time
  }
}

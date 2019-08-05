"use strict"
const util = require('util')
//CLASSES
const ApiFunctions = require('../api/ApiFunctions.js')
const DiscordLog = require('./DiscordLog')


module.exports = class PrivMsg {
  constructor (bot) {
    this.bot = bot

    bot.TwitchIRCConnection.on('PRIVMSG', this.onChat.bind(this))
  }


  async onChat (obj) {
    let channel = obj.param
    let roomId = obj.tags['room-id']
    let userId = obj.tags['user-id']
    let username = obj.tags['display-name']
    let message = obj.trailing

    //Handle ACTION /me messages
    let isACTION = false
    if (message.startsWith("\u0001ACTION")) {
      message = message.substring(7, message.length - 1)
      isACTION = true
    }

    console.info("<-- " + channel + " " + username + ": " + message)

    message += " "

    /* update the bot */
    if (message.startsWith("<update ") && userId === "38949074") {
      let { spawn } = require( 'child_process' ); let ls = spawn( 'git', [ 'pull' ] )

      ls.on( 'close', code => {
          if (code === 0) {
            this.bot.TwitchIRCConnection.say(channel, "Updated... Please restart bot to apply updates.")
          }
      } )
    }

    /* Shutting down the bot */
    if (message.startsWith("<s ") && userId === "38949074") {
      this.bot.TwitchIRCConnection.say(channel, "Shutting down FeelsBadMan")
      setTimeout(function () {
        process.exit(0)
      }, 1200)
    }


    if (message.startsWith("<bot ")) {
      this.bot.TwitchIRCConnection.queue.sayWithBoth(roomId, channel, "I'm the not so shitty V2 version of the IceCreamDataBase bot. Made by icdb in nodejs. FeelsDankMan ", userId)
    }

    if (message.startsWith("<uptime ")) {
      this.bot.TwitchIRCConnection.queue.sayWithBoth(roomId, channel, username + ", Bot running for " + PrivMsg.msToDDHHMMSS(process.uptime()), userId)
    }

    return

    if (message.startsWith("<tags ")) {
      this.bot.TwitchIRCConnection.queue.sayWithBoth(roomId, channel, JSON.stringify(obj), userId)
    }

    if (message.startsWith("<y ")) {
      this.bot.TwitchIRCConnection.queue.sayWithBoth(roomId, channel, "word1{nl}word2 {nl}word3{nl} word4 {nl} word5 {nl} {nl}", userId)
    }

    if (message.startsWith("< ")) {
      this.bot.TwitchIRCConnection.queue.sayWithBoth(roomId, channel, ">", userId)
    }
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

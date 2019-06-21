"use strict"
const Logger = require('consola')
//CLASSES
const UserNotice = require('../modules/UserNotice.js')
const ApiFunctions = require('../classes/ApiFunctions.js')
const DiscordLog = require('../modules/DiscordLog')


module.exports = class OnX {
  constructor (bot) {
    this.bot = bot
    this.UserNotice = new UserNotice(bot)

    bot.chat.on('PRIVMSG', this.onChat)
  }


  async onChat (msg) {
    Logger.info("--> " + msg.channel + " " + msg.username + ": " + msg.message)

    msg.message += " "

    /* update the bot */
    if (msg.message.startsWith("<update ") && msg.tags.userId === "38949074") {
      let { spawn } = require( 'child_process' ); let ls = spawn( 'git', [ 'pull' ] )

      ls.on( 'close', code => {
          if (code === 0) {
            this.say(msg.channel, "Updated... Please restart bot to apply updates.")
          }
      } )
    }

    /* Shutting down the bot */
    if (msg.message.startsWith("<s ") && msg.tags.userId === "38949074") {
      this.say(msg.channel, "Shutting down FeelsBadMan")
      setTimeout(function () {
        process.exit(0)
      }, 1200)
    }

    return

    if (msg.message.startsWith("<tags ")) {
      this.queue.sayWithBoth(msg.tags.roomId, msg.channel, JSON.stringify(msg.tags, null, 2), msg.tags.userId)
    }

    if (msg.message.startsWith("<y ")) {
      this.queue.sayWithBoth(msg.tags.roomId, msg.channel, "word1{nl}word2 {nl}word3{nl} word4 {nl} word5 {nl} {nl}", msg.tags.userId)
    }

    if (msg.message.startsWith("< ")) {
      DiscordLog.error("Error message")
      DiscordLog.warn("Warn message")
      DiscordLog.info("Info message")
      DiscordLog.debug("Debug message")
      DiscordLog.trace("Trace message")
      this.queue.sayWithBoth(msg.tags.roomId, msg.channel, ">", msg.tags.userId)
      this.queue.sayWithBoth(msg.tags.roomId, msg.channel, ">", msg.tags.userId)
      this.queue.sayWithBoth(msg.tags.roomId, msg.channel, ">------------", msg.tags.userId)
      //"1{nl}2{nl}3{nl1000}4"
    }
  }
}

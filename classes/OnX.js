"use strict"
const Logger = require('consola')
//CLASSES
const ApiFunctions = require('../classes/ApiFunctions.js')

module.exports = class OnX {
  constructor (bot) {
    this.bot = bot

    bot.chat.on('PRIVMSG', onChat)
    bot.chat.on('USERNOTICE/SUBSCRIPTION', onSubscription)
    bot.chat.on('USERNOTICE/RESUBSCRIPTION', onResubscription)
    bot.chat.on('USERNOTICE/SUBSCRIPTION_GIFT', onSubscriptionGift)
    bot.chat.on('USERNOTICE/SUBSCRIPTION_GIFT_COMMUNITY', onSubscriptionGiftCommunity)
    bot.chat.on('USERNOTICE/GIFT_PAID_UPGRADE', onGiftPaidUpgrade)
    bot.chat.on('USERNOTICE/ANON_GIFT_PAID_UPGRADE', onAnonGiftPaidUpgrade)
    bot.chat.on('USERNOTICE/RITUAL', onRitual)
    bot.chat.on('USERNOTICE/RAID', onRaid)
  }

}

  async function onChat (msg) {
    Logger.info("--> " + msg.channel + " " + msg.username + ": " + msg.message)

    /* update the bot */
    if (msg.message.startsWith("<update") && msg.tags.userId === "38949074") {
      let { spawn } = require( 'child_process' ); let ls = spawn( 'git', [ 'pull' ] )

      ls.on( 'close', code => {
          if (code === 0) {
            this.say(msg.channel, "Updated... Please restart bot to apply updates.")
          }
      } )
    }

    /* Shutting down the bot */
    if (msg.message.startsWith("<s") && msg.tags.userId === "38949074") {
      this.say(msg.channel, "Shutting down FeelsBadMan")
      setTimeout(function () {
        process.exit(0)
      }, 1200)
    }

    if (msg.message.startsWith("<tags")) {
      this.queue.sayWithBoth(msg.tags.roomId, msg.channel, JSON.stringify(msg.tags, null, 2), msg.tags.userId)
    }

    if (msg.message.startsWith("<")) {
      this.queue.sayWithBoth(msg.tags.roomId, msg.channel, ">", msg.tags.userId)
      this.queue.sayWithBoth(msg.tags.roomId, msg.channel, ">", msg.tags.userId)
      this.queue.sayWithBoth(msg.tags.roomId, msg.channel, ">------------", msg.tags.userId)
      //"1{nl}2{nl}3{nl1000}4"
    }

  }
  async function onSubscription (msg) {}
  async function onResubscription (msg) {}
  async function onSubscriptionGift (msg) {}
  async function onSubscriptionGiftCommunity (msg) {}
  async function onGiftPaidUpgrade (msg) {}
  async function onAnonGiftPaidUpgrade (msg) {}
  async function onRitual (msg) {}
  async function onRaid (msg) {}

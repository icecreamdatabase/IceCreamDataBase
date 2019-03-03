"use strict";
const Logger = require('consola')
//CLASSES
const ApiFunctions = require('../classes/ApiFunctions.js')

module.exports = class OnX {
  constructor(bot) {
    this.bot = bot

    bot.chat.on('PRIVMSG', this.onChat)
    bot.chat.on('USERNOTICE/SUBSCRIPTION', this.onSubscription)
    bot.chat.on('USERNOTICE/RESUBSCRIPTION', this.onResubscription)
    bot.chat.on('USERNOTICE/SUBSCRIPTION_GIFT', this.onSubscriptionGift)
    bot.chat.on('USERNOTICE/SUBSCRIPTION_GIFT_COMMUNITY', this.onSubscriptionGiftCommunity)
    bot.chat.on('USERNOTICE/GIFT_PAID_UPGRADE', this.onGiftPaidUpgrade)
    bot.chat.on('USERNOTICE/ANON_GIFT_PAID_UPGRADE', this.onAnonGiftPaidUpgrade)
    bot.chat.on('USERNOTICE/RITUAL', this.onRitual)
    bot.chat.on('USERNOTICE/RAID', this.onRaid)
  }

  async onChat (msg) {
    Logger.info("--> " + msg.channel + " " + msg.username + ": " + msg.message)

    /* Shutting down the bot */
    if (msg.message.startsWith("<sd") && msg.tags.userId === "38949074") {
      this.say(msg.channel, "Shutting down FeelsBadMan")
      setTimeout(function () {
        process.exit(0)
      }, 1200)
    }

    if (msg.message.startsWith("<tags")) {
      this.queue.sayWithBoth(msg.tags.roomId, msg.channel, JSON.stringify(msg.tags,null,2), msg.tags.userId)
    }
    
    if (msg.message.startsWith("<")) {
      this.queue.sayWithBoth(msg.tags.roomId, msg.channel, ">", msg.tags.userId)
      //"1{nl}2{nl}3{nl1000}4"
    }

  }
  async onSubscription (msg) {}
  async onResubscription (msg) {}
  async onSubscriptionGift (msg) {}
  async onSubscriptionGiftCommunity (msg) {}
  async onGiftPaidUpgrade (msg) {}
  async onAnonGiftPaidUpgrade (msg) {}
  async onRitual (msg) {}
  async onRaid (msg) {}
}

"use strict";
const Logger = require('consola')
//CLASSES
const ApiFunctions = require('../classes/ApiFunctions.js')

module.exports = class OnX {
  constructor(chat) {
    this.chat = chat;

    chat.on('PRIVMSG', this.onChat)
    chat.on('USERNOTICE/SUBSCRIPTION', this.onSubscription)
    chat.on('USERNOTICE/RESUBSCRIPTION', this.onResubscription)
    chat.on('USERNOTICE/SUBSCRIPTION_GIFT', this.onSubscriptionGift)
    chat.on('USERNOTICE/SUBSCRIPTION_GIFT_COMMUNITY', this.onSubscriptionGiftCommunity)
    chat.on('USERNOTICE/GIFT_PAID_UPGRADE', this.onGiftPaidUpgrade)
    chat.on('USERNOTICE/ANON_GIFT_PAID_UPGRADE', this.onAnonGiftPaidUpgrade)
    chat.on('USERNOTICE/RITUAL', this.onRitual)
    chat.on('USERNOTICE/RAID', this.onRaid)

    //chat.sayQueue = Sender.sayQueue
  }

  async onChat (msg) {
    Logger.info("<-- " + msg.channel + " " + msg.username + ": " + msg.message)

    /* Shutting down the bot */
    if (msg.message.startsWith("<sd") && msg.tags.userId === "38949074") {
      this.sayQueue(this, msg.channel, "Shutting down FeelsBadMan")
      setTimeout(function () {
        process.exit(0)
      }, 1200)
    }

    if (msg.message.startsWith("<")) {
      //this.sayQueue(this, msg.channel, "1{nl}2{nl}3{nl1000}4", msg.tags.userId)
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

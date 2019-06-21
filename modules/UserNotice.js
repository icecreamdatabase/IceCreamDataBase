"use strict"
const Logger = require('consola')
//CLASSES
const Sql = require('../classes/sql/modules/SqlUserNotice.js')
const Api = require('../classes/Api.js')

const UPDATE_NOTIFICATION_INTERVAL = 15000 //ms

module.exports = class SubNotifications {
  constructor (bot) {
    this.bot = bot
    this.notificationData = {}

    //.bind(this) is required so the functions can access not only the `bot.chat` object
    // but the `bot` object and the `notificationData` array.

    bot.chat.on('USERNOTICE/SUBSCRIPTION', this.onSubscription.bind(this))
    bot.chat.on('USERNOTICE/RESUBSCRIPTION', this.onResubscription.bind(this))
    bot.chat.on('USERNOTICE/SUBSCRIPTION_GIFT', this.onSubscriptionGift.bind(this))
    bot.chat.on('USERNOTICE/SUBSCRIPTION_GIFT_COMMUNITY', this.onSubscriptionGiftCommunity.bind(this))
    bot.chat.on('USERNOTICE/GIFT_PAID_UPGRADE', this.onGiftPaidUpgrade.bind(this))
    bot.chat.on('USERNOTICE/ANON_GIFT_PAID_UPGRADE', this.onAnonGiftPaidUpgrade.bind(this))
    bot.chat.on('USERNOTICE/RITUAL', this.onRitual.bind(this))
    bot.chat.on('USERNOTICE/RAID', this.onRaid.bind(this))

    //run it once and start the interval
    this.updateNotificationData.bind(this)
    setInterval(this.updateNotificationData.bind(this), UPDATE_NOTIFICATION_INTERVAL)
  }

  async onSubscription (msg) {}
  async onResubscription (msg) {}
  async onSubscriptionGift (msg) {}
  async onSubscriptionGiftCommunity (msg) {}
  async onGiftPaidUpgrade (msg) {}
  async onAnonGiftPaidUpgrade (msg) {}
  async onRitual (msg) {}
  async onRaid (msg) {}


  async updateNotificationData () {
    this.notificationData = await Sql.getNotificationData(this.bot.chat.botData.userId)
  }
}


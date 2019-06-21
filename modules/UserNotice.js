"use strict"
const Logger = require('consola')
const util = require('util')
//CLASSES
const DiscordLog = require('../modules/DiscordLog')
const Sql = require('../classes/sql/modules/SqlUserNotice.js')
const Api = require('../classes/Api.js')

const timeunits = ["nanoseconds", "microseconds", "milliseconds", "seconds", "minutes", "hours", "decades", "centuries", "millennia"]
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

  async onSubscription (msg) {
    DiscordLog.info(util.inspect(msg))

    Logger.info(JSON.stringify(msg))
    if (msg.hasOwnProperty("room-id") && this.notificationData.hasOwnProperty(msg["room-id"])) {
      let announcementMessage = this.methodToMessage(this.notificationData[msg["room-id"]], "sub")
      if (announcementMessage) {
        announcementMessage = SubNotifications.notificationParameter(announcementMessage, msg)
        DiscordLog.info("Would have send: " + announcementMessage)
        //this.bot.chat.queue.sayWithBoth(msg.tags.roomId, msg.channel, ">", msg.tags.userId)
      }
    }
  }
  async onResubscription (msg) {

    DiscordLog.info(util.inspect(msg))
  }
  async onSubscriptionGift (msg) {

    DiscordLog.info(util.inspect(msg))
  }
  async onSubscriptionGiftCommunity (msg) {

    DiscordLog.info(util.inspect(msg))
  }
  async onGiftPaidUpgrade (msg) {

    DiscordLog.info(util.inspect(msg))
  }
  async onAnonGiftPaidUpgrade (msg) {

    DiscordLog.info(util.inspect(msg))
  }
  async onRitual (msg) {

    DiscordLog.info(util.inspect(msg))
  }
  async onRaid (msg) {

    DiscordLog.info(util.inspect(msg))
  }



  methodToMessage (channel, methods) {
    //{"prime":true,"plan":"Prime","planName":"Channel Subscription (forsenlol)"}
    //{"prime":false,"plan":"1000","planName":"Channel Subscription (forsenlol)"}
    //{"plan":"1000","planName":"Channel Subscription (forsenlol)"}
    let announcementMessage = ""

    if (methods.type === "sub" || methods.type === "resub") {
      let plans = ["Prime", "1000", "2000", "3000"]
      let planMsgs = new Array(4).fill(null)

      if (methods.type === "sub") {
        let subPrime = this.notificationData[channel].subPrime || null
        let subT1 = this.notificationData[channel].subT1 || null
        let subT2 = this.notificationData[channel].subT2 || subT1
        let subT3 = this.notificationData[channel].subT3 || subT2
        planMsgs = [subPrime, subT1, subT2, subT3]
      } else {
        let resubPrime = this.notificationData[channel].resubPrime || null
        let resubT1 = this.notificationData[channel].resubT1 || null
        let resubT2 = this.notificationData[channel].resubT2 || resubT1
        let resubT3 = this.notificationData[channel].resubT3 || resubT2
        planMsgs = [resubPrime, resubT1, resubT2, resubT3]
      }
      announcementMessage = planMsgs[plans.indexOf(methods.plan)]

    } else if (methods.type === "subGift") {
      announcementMessage = this.notificationData[channel].subGift || null

    } else if (methods.type === "subMysteryGift") {
      announcementMessage = this.notificationData[channel].subMysteryGift || null

    } else if (methods.type === "giftPaidUpgrade") {
      announcementMessage = this.notificationData[channel].giftPaidUpgrade || null
    }

    return announcementMessage
  }

  static notificationParameter (message, data) {
    //customLog(JSON.stringify(data))

    let channel = data.channel.substring(1) || null
    let username = data.username || null
    let secondUser = data.recipient || data.sender || null
    let months = data.months || 0
    let massGiftCount = parseInt(data.massGiftCount) || 1
    let senderCount = parseInt(data.senderCount) || 0
    let timeunit = timeunits[Math.floor(Math.random() * timeunits.length)]
    let extraS = months === 1 ? "" : "s"

    message = message.replace(new RegExp("\\${channel}", 'g'), channel)
    message = message.replace(new RegExp("\\${user}", 'g'), username)
    message = message.replace(new RegExp("\\${secondUser}", 'g'), secondUser)
    message = message.replace(new RegExp("\\${months}", 'g'), months)
    message = message.replace(new RegExp("\\${massGiftCount}", 'g'), massGiftCount)
    message = message.replace(new RegExp("\\${senderCount}", 'g'), senderCount)
    message = message.replace(new RegExp("\\${timeunit}", 'g'), timeunit)
    message = message.replace(new RegExp("\\${extraS}", 'g'), extraS)

    return message
  }


  async updateNotificationData () {
    this.notificationData = await Sql.getNotificationData(this.bot.chat.botData.userId)
  }
}


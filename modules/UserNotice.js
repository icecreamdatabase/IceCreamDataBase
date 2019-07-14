"use strict"
const util = require('util')
//CLASSES
const DiscordLog = require('../modules/DiscordLog')
const Sql = require('../classes/sql/modules/SqlUserNotice.js')
const Api = require('../classes/Api.js')

//ENUMS
const UserNoticeTypes = require('../ENUMS/UserNoticeTypes.js')

const timeunits = ["nanoseconds", "microseconds", "milliseconds", "seconds", "minutes", "hours", "decades", "centuries", "millennia"]
const UPDATE_NOTIFICATION_INTERVAL = 15000 //ms

module.exports = class SubNotifications {
  constructor (bot) {
    this.bot = bot
    this.notificationData = {}

    //.bind(this) is required so the functions can access not only the `bot.chat` object
    // but the `bot` object and the `notificationData` array.

    //for in loops through the keys
    for (let eventType in UserNoticeTypes) {
      if (UserNoticeTypes[eventType] < 100) {
        bot.chat.on('USERNOTICE/' + eventType, this.onUsernotice.bind(this))
      }
    }

    //run it once and start the interval
    this.updateNotificationData.bind(this)
    setInterval(this.updateNotificationData.bind(this), UPDATE_NOTIFICATION_INTERVAL)
  }

  async onUsernotice (msg) {
    DiscordLog.custom("usernotice", msg.event, util.inspect(msg))
    if (msg.hasOwnProperty("event")) {
      if (msg.hasOwnProperty("tags")) {
        if (msg.tags.hasOwnProperty("roomId")) {
          if (this.notificationData.hasOwnProperty(msg.tags.roomId)) {
            let announcementMessage = this.methodToMessage(this.notificationData[msg.tags.roomId], msg)
            if (announcementMessage) {
              announcementMessage = SubNotifications.notificationParameter(announcementMessage, msg)
              DiscordLog.custom("usernotice-handled", msg.event, announcementMessage)
              //this.bot.chat.queue.sayWithBoth(msg.tags.roomId, msg.channel, ">", msg.tags.userId)
            }
          } else {
            DiscordLog.error(__filename + ": No data for " + msg.tags.roomId + " in notificationData \n" + Object.keys(this.notificationData) )
          }
        } else {
          DiscordLog.error(__filename + ": No roomId in msg.tags")
        }
      } else {
        DiscordLog.error(__filename + ": No tags in msg")
      }
    } else {
      DiscordLog.error(__filename + ": Received USERNOTICE without msg.event")
    }
  }

  methodToMessage (channel, eventMsg) {
    //eventMsg.parameters is build like this:
    //{"prime":true,"plan":"Prime","planName":"Channel Subscription (forsenlol)"}
    //{"prime":false,"plan":"1000","planName":"Channel Subscription (forsenlol)"}
    //{"plan":"1000","planName":"Channel Subscription (forsenlol)"}
    let UserNoticeType = UserNoticeTypes[eventMsg.event]

    //TODO: make this look nicer and be more compact
    if (UserNoticeType === UserNoticeTypes.SUBSCRIPTION) {
      if (eventMsg.parameters.hasOwnProperty("subPlan")) {
        switch (eventMsg.parameters.subPlan) {
          case "Prime":
            UserNoticeType = UserNoticeTypes.SUBSCRIPTION_PRIME
            break
          case "2000":
            UserNoticeType = UserNoticeTypes.SUBSCRIPTION_T2
            break
          case "3000":
            UserNoticeType = UserNoticeTypes.SUBSCRIPTION_T3
            break
        }
      } else {
        DiscordLog.error(__filename + ": SUBSCRIPTION event without eventMsg.parameters.subPlan")
      }
    }
    if (UserNoticeType === UserNoticeTypes.RESUBSCRIPTION) {
      if (eventMsg.parameters.hasOwnProperty("subPlan")) {
        switch (eventMsg.parameters.subPlan) {
          case "Prime":
            UserNoticeType = UserNoticeTypes.RESUBSCRIPTION_PRIME
            break
          case "2000":
            UserNoticeType = UserNoticeTypes.RESUBSCRIPTION_T2
            break
          case "3000":
            UserNoticeType = UserNoticeTypes.RESUBSCRIPTION_T3
            break
        }
      } else {
        DiscordLog.error(__filename + ": RESUBSCRIPTION event without eventMsg.parameters.subPlan")
      }
    }
    //Get first key by value ... convert the enum int to it's name
    UserNoticeType = Object.keys(UserNoticeTypes).find(key => UserNoticeTypes[key] === UserNoticeType)
    if (this.notificationData[channel].hasOwnProperty(UserNoticeType)) {
      return this.notificationData[channel][UserNoticeType] || null
    } else {
      DiscordLog.error(__filename + ": Get first key by value failed")
      return null
    }
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


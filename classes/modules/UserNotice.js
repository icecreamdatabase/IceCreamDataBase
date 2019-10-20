"use strict"
const util = require('util')
//CLASSES
const DiscordLog = require('./DiscordLog')
const Sql = require('../sql/modules/SqlUserNotice.js')
const Points = new (require('./Points')) //singleton

//ENUMS
const UserNoticeTypes = require('../../ENUMS/UserNoticeTypes.js')

const timeunits = ["nanoseconds", "microseconds", "milliseconds", "seconds", "minutes", "hours", "decades", "centuries", "millennia"]
const UPDATE_NOTIFICATION_INTERVAL = 15000 //ms

module.exports = class UserNotice {
  constructor (bot) {
    this.bot = bot
    this.notificationData = {}

    //.bind(this) is required so the functions can access not only the `bot.chat` object
    // but the `bot` object and the `notificationData` array.

    this.bot.TwitchIRCConnection.on('USERNOTICE', this.onUsernotice.bind(this))

    //run it once and start the interval
    setInterval(this.updateNotificationData.bind(this), UPDATE_NOTIFICATION_INTERVAL)
    this.updateNotificationData.bind(this)()
  }

  async onUsernotice (usernoticeObj) {
    DiscordLog.custom("usernotice", usernoticeObj.command, util.inspect(usernoticeObj))

    if (usernoticeObj.hasOwnProperty("command")) {
      if (this.notificationData.hasOwnProperty(usernoticeObj.tags["room-id"])) {
        let userNoticeType = UserNotice.methodToEnum(usernoticeObj)
        let notificationObj = this.notificationData[usernoticeObj.tags["room-id"]]

        if (notificationObj.hasOwnProperty(userNoticeType)) {

          Points.handleUserNotice(userNoticeType, usernoticeObj)

          let announcementMessage = notificationObj[userNoticeType]
          if (announcementMessage) {
            announcementMessage = UserNotice.notificationParameter(announcementMessage, usernoticeObj)
            DiscordLog.custom("usernotice-handled", usernoticeObj.command, announcementMessage)
            this.bot.TwitchIRCConnection.queue.sayWithBoth(usernoticeObj.tags["room-id"], usernoticeObj.param, announcementMessage, usernoticeObj.tags["user-id"])
          }
        } else {
          DiscordLog.error(__filename + ": Get first key by value failed: " + userNoticeType)
        }
      }
    } else {
      DiscordLog.error("USERNOTICE without command property!")
    }
  }

  static methodToEnum (obj) {
    //eventMsg.parameters is build like this:
    //{"prime":true,"plan":"Prime","planName":"Channel Subscription (forsenlol)"}
    //{"prime":false,"plan":"1000","planName":"Channel Subscription (forsenlol)"}
    //{"plan":"1000","planName":"Channel Subscription (forsenlol)"}
    let UserNoticeType = UserNoticeTypes[obj.tags["msg-id"].toUpperCase()]

    //TODO: make this look nicer and be more compact
    if (UserNoticeType === UserNoticeTypes.SUB) {
      if (obj.tags.hasOwnProperty("msg-param-sub-plan")) {
        switch (obj.tags["msg-param-sub-plan"]) {
          case "Prime":
            UserNoticeType = UserNoticeTypes.SUB_PRIME
            break
          case "2000":
            UserNoticeType = UserNoticeTypes.SUB_T2
            break
          case "3000":
            UserNoticeType = UserNoticeTypes.SUB_T3
            break
        }
      } else {
        DiscordLog.error(__filename + ": SUBSCRIPTION event without obj.tags[\"msg-param-sub-plan\"]")
      }
    }
    if (UserNoticeType === UserNoticeTypes.RESUB) {
      if (obj.tags.hasOwnProperty("msg-param-sub-plan")) {
        switch (obj.tags["msg-param-sub-plan"]) {
          case "Prime":
            UserNoticeType = UserNoticeTypes.RESUB_PRIME
            break
          case "2000":
            UserNoticeType = UserNoticeTypes.RESUB_T2
            break
          case "3000":
            UserNoticeType = UserNoticeTypes.RESUB_T3
            break
        }
      } else {
        DiscordLog.error(__filename + ": RESUBSCRIPTION event without obj.tags[\"msg-param-sub-plan\"]")
      }
    }
    //Get first key by value ... convert the enum int to it's name
    return Object.keys(UserNoticeTypes).find(key => UserNoticeTypes[key] === UserNoticeType)
  }

  static notificationParameter (message, obj) {
    //customLog(JSON.stringify(data))

    let channel = obj.param.substring(1) || null
    let username = obj.tags["display-name"] || obj.tags["login"] || null
    let secondUser = obj.tags["msg-param-recipient-display-name"] || obj.tags["msg-param-recipient-user-name"] || obj.tags["msg-param-sender-name"] || obj.tags["msg-param-sender-name"] || null
    //msgParamMonths is months in a row
    let months = obj.tags["msg-param-cumulative-months"] || 0
    let massGiftCount = obj.tags["msg-param-mass-gift-count"] || 1
    let senderCount = obj.tags["msg-param-sender-count"] || 0
    let timeunit = timeunits[Math.floor(Math.random() * timeunits.length)]
    let extraS = months === 1 ? "" : "s"
    let viewerCount = obj.tags["msg-param-viewerCount"] || 0

    message = message.replace(new RegExp("\\${channel}", 'g'), channel)
    message = message.replace(new RegExp("\\${user}", 'g'), username)
    message = message.replace(new RegExp("\\${secondUser}", 'g'), secondUser)
    message = message.replace(new RegExp("\\${months}", 'g'), months)
    message = message.replace(new RegExp("\\${massGiftCount}", 'g'), massGiftCount)
    message = message.replace(new RegExp("\\${senderCount}", 'g'), senderCount)
    message = message.replace(new RegExp("\\${timeunit}", 'g'), timeunit)
    message = message.replace(new RegExp("\\${extraS}", 'g'), extraS)
    message = message.replace(new RegExp("\\${viewerCount}", 'g'), viewerCount)

    return message
  }


  async updateNotificationData () {
    this.notificationData = await Sql.getNotificationData(this.bot.TwitchIRCConnection.botData.userId)
  }
}


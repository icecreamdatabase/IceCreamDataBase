"use strict"
const util = require('util')
//CLASSES
const Logger = require('../../../helper/Logger')
const DiscordLog = require('../../../helper/DiscordLog')
const Sql = require('../../../sql/modules/SqlUserNotice.js')

//ENUMS
const UserNoticeTypes = require('../../../../ENUMS/UserNoticeTypes.js')

const timeunits = ["nanoseconds", "microseconds", "milliseconds", "seconds", "minutes", "hours", "decades", "centuries", "millennia"]
const UPDATE_NOTIFICATION_INTERVAL = 15000 //ms

class UserNotice {
  /**
   * @param {Bot} bot
   */
  constructor (bot) {
    this._bot = bot
    this._notificationData = {}

    //.bind(this) is required so the functions can access not only the `bot.chat` object
    // but the `bot` object and the `_notificationData` array.

    this.bot.irc.ircConnectionPool.on('USERNOTICE', this.onUsernotice.bind(this))

    //run it once and start the interval
    setInterval(this.updateNotificationData.bind(this), UPDATE_NOTIFICATION_INTERVAL)
    this.updateNotificationData.bind(this)()
  }

  /**
   * @return {Bot}
   */
  get bot () {
    return this._bot
  }

  /**
   * Method from bot.TwitchIRCconnection event emitter 'USERNOTICE'.
   * @param usernoticeObj raw object from TwitchIRCconnection registerEvents
   * @returns {Promise<void>}
   */
  async onUsernotice (usernoticeObj) {
    if (Object.prototype.hasOwnProperty.call(this._notificationData, usernoticeObj.tags["room-id"])) {

      if (this.bot.isUserIdInBlacklist(usernoticeObj["user-id"])) {
        Logger.debug(`User on blacklist: ${usernoticeObj["user-id"]} - ${usernoticeObj["room-id"]}`)
        return
      }

      let userNoticeType = UserNotice.methodToEnum(usernoticeObj)
      if (userNoticeType) {
        let notificationObj = this._notificationData[usernoticeObj.tags["room-id"]]
        if (Object.prototype.hasOwnProperty.call(notificationObj, userNoticeType)) {
          let announcementMessage = notificationObj[userNoticeType]
          if (announcementMessage) {
            announcementMessage = UserNotice.notificationParameter(announcementMessage, usernoticeObj)
            this.bot.irc.queue.sayWithBoth(usernoticeObj.tags["room-id"], usernoticeObj.param, announcementMessage, usernoticeObj.tags["user-id"])
          }
        }
      } else {
        DiscordLog.warn(__filename + ": Get first key by value failed: " + usernoticeObj.tags["msg-id"] + "\n\n\n" + util.inspect(usernoticeObj))
      }
    }
  }

  /**
   * Converts plan and planName into UserNoticeTypes ENUM and returns UserNoticeType.
   * @param usernoticeObj raw object from TwitchIRCconnection registerEvents
   * @returns {string} UserNoticeType fitting to usernoticeObj
   */
  static methodToEnum (usernoticeObj) {
    //eventMsg.parameters is build like this:
    //{"prime":true,"plan":"Prime","planName":"Channel Subscription (forsenlol)"}
    //{"prime":false,"plan":"1000","planName":"Channel Subscription (forsenlol)"}
    //{"plan":"1000","planName":"Channel Subscription (forsenlol)"}
    let UserNoticeType = UserNoticeTypes[usernoticeObj.tags["msg-id"].toUpperCase()]

    //TODO: make this look nicer and be more compact
    if (UserNoticeType === UserNoticeTypes.SUB) {
      if (Object.prototype.hasOwnProperty.call(usernoticeObj.tags, "msg-param-sub-plan")) {
        switch (usernoticeObj.tags["msg-param-sub-plan"]) {
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
        DiscordLog.error(__filename + ": SUBSCRIPTION event without usernoticeObj.tags[\"msg-param-sub-plan\"]")
      }
    }
    if (UserNoticeType === UserNoticeTypes.RESUB) {
      if (Object.prototype.hasOwnProperty.call(usernoticeObj.tags, "msg-param-sub-plan")) {
        switch (usernoticeObj.tags["msg-param-sub-plan"]) {
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
        DiscordLog.error(__filename + ": RESUBSCRIPTION event without usernoticeObj.tags[\"msg-param-sub-plan\"]")
      }
    }
    //Get first key by value ... convert the enum int to it's name
    return Object.keys(UserNoticeTypes).find(key => UserNoticeTypes[key] === UserNoticeType)
  }

  /**
   * Handle and replace replace parameter inside of notification response messages
   * @param message input response message
   * @param usernoticeObj raw object from TwitchIRCconnection registerEvents
   * @returns {string}
   */
  static notificationParameter (message, usernoticeObj) {
    //customLog(JSON.stringify(data))

    let channel = usernoticeObj.param.substring(1) || null
    let username = usernoticeObj.tags["display-name"] || usernoticeObj.tags["login"] || null
    let secondUser = usernoticeObj.tags["msg-param-recipient-display-name"] || usernoticeObj.tags["msg-param-recipient-user-name"] || usernoticeObj.tags["msg-param-sender-name"] || usernoticeObj.tags["msg-param-sender-name"] || null
    //msgParamMonths is months in a row
    let months = usernoticeObj.tags["msg-param-cumulative-months"] || 0
    let massGiftCount = usernoticeObj.tags["msg-param-mass-gift-count"] || 1
    let senderCount = usernoticeObj.tags["msg-param-sender-count"] || 0
    let timeunit = timeunits[Math.floor(Math.random() * timeunits.length)]
    let extraS = months === 1 ? "" : "s"
    let viewerCount = usernoticeObj.tags["msg-param-viewerCount"] || 0

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

  /**
   * Update UserNotice._notificationData from the Database
   * @returns {Promise<void>}
   */
  async updateNotificationData () {
    this._notificationData = await Sql.getNotificationData(this.bot.userId)
  }
}

module.exports = UserNotice

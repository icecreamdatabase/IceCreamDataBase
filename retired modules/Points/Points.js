"use strict"
const util = require('util')
//CLASSES
const SqlPoints = require('../sql/modules/SqlPoints')
const Api = require('../api/Api.js')
const DiscordLog = require('./DiscordLog')
const Helper = require('./commands/Helper')
const Tts = new (require('./Tts')) //singleton
const UserLevels = require("../../ENUMS/UserLevels")

const UPDATE_INTERVAL = 30000//ms

module.exports = class Points {

  /**
   * Singleton class constructor
   *
   * Import like this:
   *   const Points = new (require('./Points')) //singleton
   *
   * Also import once in index.js like this:
   * const Points = require('./classes/modules/Points')
   *
   * After bot data received from DB create new Points (Could be done as normal singleton?)
   * points = new Points()
   *
   * @returns {Points|Points}
   */
  constructor () {
    if (Points.instance) {
      return Points.instance
    }
    Points.instance = this

    this.pointsSettings = {}
    this.runningIntervals = []
    this.userActivity = {}
    this.lastUsage = {}
    this.lastShot = {}

    setTimeout(this.updatePointSettings.bind(this), 2000)
    setInterval(this.updatePointSettings.bind(this), UPDATE_INTERVAL)

    return this
  }

  /**
   * Handles PRIVMSG
   *
   * Call like this:
   *   if (channelObj.usePoints) {
   *     // noinspection ES6MissingAwait
   *     Points.handlePrivMsg(messageObj, this.bot)
   *   }
   *
   * @param privMsgObj
   * @param bot
   * @returns {Promise<boolean>}
   */
  async handlePrivMsg (privMsgObj, bot) {
    if (this.pointsSettings.hasOwnProperty(privMsgObj.roomId)) {
      if (!this.userActivity[privMsgObj.roomId]) {
        this.userActivity[privMsgObj.roomId] = {}
      }
      if (!this.userActivity[privMsgObj.roomId][privMsgObj.userId]) {
        this.userActivity[privMsgObj.roomId][privMsgObj.userId] = 0
      }
      this.userActivity[privMsgObj.roomId][privMsgObj.userId]++

      let ps = this.pointsSettings[privMsgObj.roomId]
      if (ps.commandTimeout * 1000 + (this.lastUsage[privMsgObj.roomId] || 0) < Date.now() || privMsgObj.userLevel === UserLevels.BOTADMIN) {
        if (ps.commandPointsEnabled && privMsgObj.message.startsWith(ps.commandPointsCommand + " ")) {
          let queryName = privMsgObj.message.split(" ")[ps.commandPointsTargetNr] || ""
          let returnMessage
          let pointsObj
          if (queryName && await Helper.checkUserWasInChannel(privMsgObj.channel, queryName)) { //second half might not be needed
            let userId = await Api.userIdFromLogin(global.clientIdFallback, queryName)
            pointsObj = await SqlPoints.getUserInfo(userId, privMsgObj.roomId)
            returnMessage = ps.commandPointsResponseTarget
          } else {
            pointsObj = await SqlPoints.getUserInfo(privMsgObj.userId, privMsgObj.roomId)
            returnMessage = ps.commandPointsResponseUser
          }
          returnMessage = await Helper.replaceParameterMessage(privMsgObj, returnMessage)
          returnMessage = returnMessage.replace(new RegExp("\\${pointsBalance}", 'g'), pointsObj.balance)
          returnMessage = returnMessage.replace(new RegExp("\\${pointsRank}", 'g'), pointsObj.rank)
          returnMessage = returnMessage.replace(new RegExp("\\${pointsTotalWallets}", 'g'), pointsObj.total)
          bot.TwitchIRCConnection.queue.sayWithMsgObj(privMsgObj, returnMessage)
          this.lastUsage[privMsgObj.roomId] = Date.now()

        } else if (ps.commandTopEnabled && privMsgObj.message.startsWith(ps.commandTopCommand + " ")) {
          let returnMessage = ps.commandTopResponse

          let amount = 5
          let max = privMsgObj.userLevel === UserLevels.BOTADMIN ? 30 : 10
          let firstParameter = privMsgObj.message.split(" ")[1]
          if (firstParameter && !isNaN(firstParameter)) {
            amount = Math.min(Math.max(parseInt(firstParameter), 1), max)
          }
          let topArr = await SqlPoints.getTopPoints(privMsgObj.roomId, amount)
          let userIDs = topArr.map(x => x.userID)
          let balance = topArr.map(x => x.balance)
          let userInfo = await Api.userDataFromIds(global.clientIdFallback, userIDs)
          let usernames = userInfo.map(x => x['display_name'])
          usernames = usernames.map(x => x.split("").join("\u{E0000}"))
          let topMessage = ""
          for (let i = 0; i < usernames.length; ++i) {
            topMessage += i > 0 ? ", " : ""
            topMessage += "#" + (i + 1) + " " + usernames[i] + " (" + balance[i] + ")"
          }
          returnMessage = await Helper.replaceParameterMessage(privMsgObj, returnMessage)
          returnMessage = returnMessage.replace(new RegExp("\\${pointsTop}", 'g'), topMessage)
          bot.TwitchIRCConnection.queue.sayWithMsgObj(privMsgObj, returnMessage)
          this.lastUsage[privMsgObj.roomId] = Date.now()

        } else if (ps.commandShootEnabled && ps.commandShootCommandRegexObj.test(privMsgObj.message)) {
          let returnMessage = ps.commandShootRejectCooldown
          if (ps.commandShootCooldown * 1000 + (this.lastShot[privMsgObj.roomId] || 0) < Date.now() || privMsgObj.userLevel === UserLevels.BOTADMIN) {
            this.lastShot[privMsgObj.roomId] = Date.now()
            let target = privMsgObj.message.split(" ")[ps.commandShootTargetNr]
            let pointsObj = await SqlPoints.getUserInfo(privMsgObj.userId, privMsgObj.roomId)

            if (ps.commandShootCost <= pointsObj.balance) {
              //reduce points
              SqlPoints.addPoints(privMsgObj.userId, privMsgObj.roomId, -ps.commandShootCost)
              returnMessage = ".timeout " + target + " " + ps.commandShootLength + " " + ps.commandShootExplanation
            } else {
              returnMessage = ps.commandShootRejectPoints
            }
          }
          returnMessage = await Helper.replaceParameterMessage(privMsgObj, returnMessage)
          bot.TwitchIRCConnection.queue.sayWithMsgObj(privMsgObj, returnMessage)
          this.lastUsage[privMsgObj.roomId] = Date.now()

        } else if (ps.commandPointsEnabled && ( privMsgObj.message.startsWith(ps.commandTtsCommandBrian + " ")
                                             || privMsgObj.message.startsWith(ps.commandTtsCommandJustin + " "))
                  ) {
          if (privMsgObj.userLevel >= ps.commandTtsReqUserLevel) {
            let returnMessage = ps.commandTtsResponseRejectCooldown
            //TODO: this.lastShot into something like this.lastTts
            if (ps.commandTtsCooldown * 1000 + (this.lastShot[privMsgObj.roomId] || 0) < Date.now() || privMsgObj.userLevel === UserLevels.BOTADMIN) {
              let pointsObj = await SqlPoints.getUserInfo(privMsgObj.userId, privMsgObj.roomId)
              if (ps.commandTtsCost <= pointsObj.balance) {
                //reduce points
                SqlPoints.addPoints(privMsgObj.userId, privMsgObj.roomId, -ps.commandTtsCost)
                Tts.sendTts(privMsgObj.channel,
                  privMsgObj.message.substr(privMsgObj.message.indexOf(" ") + 1),
                  privMsgObj.message.startsWith(ps.commandTtsCommandJustin + " ") ? "Justin" : "Brian")
                returnMessage = ps.commandTtsResponseAccept
              } else {
                returnMessage = ps.commandTtsRejectPoints
              }
            }
            returnMessage = await Helper.replaceParameterMessage(privMsgObj, returnMessage)
            bot.TwitchIRCConnection.queue.sayWithMsgObj(privMsgObj, returnMessage)
            this.lastUsage[privMsgObj.roomId] = Date.now()
          }
        }
      }
    }
    return false
  }

  /**
   * Handles incoming usernotices.
   *
   * Call like this:
   *   let userNoticeType = UserNotice.methodToEnum(usernoticeObj)
   *   if (this.bot.channels[usernoticeObj.tags['room-id']].usePoints) {
   *     Points.handleUserNotice(userNoticeType, usernoticeObj)
   *   }
   *
   * @param userNoticeType
   * @param userNoticeObj
   */
  handleUserNotice (userNoticeType, userNoticeObj) {
    let username = userNoticeObj.tags["display-name"] || userNoticeObj.tags["login"]
    let userId = userNoticeObj.tags['user-id']
    let roomId = userNoticeObj.tags['room-id']
    try {
      if (username && userId && roomId && this.pointsSettings.hasOwnProperty(roomId)) {
        SqlPoints.addPoints(userId, roomId, this.pointsSettings[roomId].usernoticeSubPoints)
      }
    } catch (e) {
      DiscordLog.error("Points handleUserNotice failed: " + username + " " + userId + " " + roomId + " " + this.pointsSettings[roomId] + "\n" + e)
    }
  }

  handleTimed (channelID) {
    if (this.pointsSettings.hasOwnProperty(channelID)) {
      setTimeout(this.handleTimed.bind(this, channelID), this.pointsSettings[channelID].intervalTime * 1000)

      //TODO: is online check
      //TODO: do stuff for interval

      if (global.hasOwnProperty("clientIdFallback")) {
        let clientId = global.clientIdFallback
        Api.streamInfo(clientId, channelID).then(info => {
          //is live
          if (info.stream || !this.pointsSettings[channelID].requireLive) {
            Api.loginFromUserId(clientId, channelID).then(channelName => {
              Api.getAllUsersInChannel(channelName).then(users => {
                Api.userDataFromLogins(clientId, users).then(data => {
                  if (!this.userActivity[channelID]) {
                    this.userActivity[channelID] = {}
                  }
                  let queryParams = data.map(data => {
                    let points = this.userActivity[channelID][data["_id"]] || 0
                    points /= this.pointsSettings[channelID].activityReqMsgPerInterval
                    points *= this.pointsSettings[channelID].activityMaxPoints
                    points += this.pointsSettings[channelID].intervalPoints
                    return [parseInt(data["_id"]), parseInt(channelID), points]
                  })
                  this.userActivity[channelID] = {}
                  SqlPoints.addPointsBulk(queryParams)
                })
              })
            })
          }
        })
      }

    } else {
      this.runningIntervals.splice(this.runningIntervals.indexOf(channelID), 1)
      console.log("Points interval stopped for channelID: " + channelID)
      DiscordLog.debug("Points interval stopped for channelID: " + channelID)
    }
  }

  updatePointSettings () {
    SqlPoints.getPointsSettings().then(data => {
      this.pointsSettings = data
      for (let channelID in this.pointsSettings) {
        if ( this.pointsSettings.hasOwnProperty(channelID)
          && this.runningIntervals.indexOf(channelID) === -1) {

          this.runningIntervals.push(channelID)
          this.handleTimed(channelID)
        }
      }
    })
  }
}

"use strict"
const util = require('util')
//CLASSES
const SqlPoints = require('../sql/modules/SqlPoints')
const Api = require('../api/Api.js')
const DiscordLog = require('./DiscordLog')

const UPDATE_INTERVAL = 30000//ms

module.exports = class Points {
  constructor () {
    if (Points.instance) {
      return Points.instance
    }
    Points.instance = this

    this.pointsSettings = {}
    this.runningIntervals = []
    this.userActivity = {}

    setTimeout(this.updatePointSettings.bind(this), 2000)
    setInterval(this.updatePointSettings.bind(this), UPDATE_INTERVAL)

    return this
  }

  async fillParams (msgObj, message) {
    if ( message.includes("${pointsBalance}")
      || message.includes("${pointsRank}")
      || message.includes("${pointsTotalWallets}")) {
      let pointsObj = await SqlPoints.getUserInfo(msgObj.userId, msgObj.roomId)
      message = message.replace(new RegExp("\\${pointsBalance}", 'g'), pointsObj.balance)
      message = message.replace(new RegExp("\\${pointsRank}", 'g'), pointsObj.rank)
      message = message.replace(new RegExp("\\${pointsTotalWallets}", 'g'), pointsObj.total)
    }
    if ( message.includes("${pointsTop}")) {
      let topArr = await SqlPoints.getTopPoints(msgObj.roomId, 3)
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
      message = message.replace(new RegExp("\\${pointsTop}", 'g'), topMessage)
    }

    return message
  }

  handlePrivMsg (privMsgObj) {
    if (this.pointsSettings.hasOwnProperty(privMsgObj.roomId)) {
      if (!this.userActivity[privMsgObj.roomId]) {
        this.userActivity[privMsgObj.roomId] = {}
      }
      if (!this.userActivity[privMsgObj.roomId][privMsgObj.userId]) {
        this.userActivity[privMsgObj.roomId][privMsgObj.userId] = 0
      }
      this.userActivity[privMsgObj.roomId][privMsgObj.userId]++

    }
    return false
  }

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
          if (info.stream) {
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

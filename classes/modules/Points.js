"use strict"
const util = require('util')
//CLASSES
const SqlPoints = require('../sql/modules/SqlPoints')
const Api = require('../api/Api.js')
const DiscordLog = require('./DiscordLog')
const Helper = require('./commands/Helper')

const UPDATE_INTERVAL = 10000//ms

module.exports = class Points {
  constructor () {
    if (Points.instance) {
      return Points.instance
    }
    Points.instance = this

    this.pointsSettings = {}
    this.runningIntervals = []
    setTimeout(this.updatePointSettings.bind(this), 2000)
    //this.updatePointSettings()
    setInterval(this.updatePointSettings.bind(this), UPDATE_INTERVAL)

    return this
  }

  handlePrivMsg (privMsgObj) {

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
              Helper.getAllUsersInChannel(channelName).then(users => {
                  Api.userDataFromLogins(clientId, users).then(data => {

                  console.log("---------------------------------------------")
                  let queryParams = data.map(data => {
                    return [data["_id"], channelID, this.pointsSettings[channelID].intervalPoints]
                  })
                  //SqlPoints.addPointsBulk(queryParams)
                  console.log("---------------------------------------------")
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

"use strict"
const util = require('util')
//CLASSES
const SqlPoints = require('../sql/modules/SqlPoints')
const ApiFunctions = require('../api/ApiFunctions.js')
const DiscordLog = require('./DiscordLog')

const UPDATE_INTERVAL = 10000//ms

module.exports = class Points {
  constructor () {
    if (Points.instance) {
      return Points.instance
    }
    Points.instance = this

    this.pointsSettings = {}
    this.runningIntervals = []
    this.updatePointSettings()
    setInterval(this.updatePointSettings.bind(this), UPDATE_INTERVAL)

    return this
  }

  handlePrivMsg (privMsgObj) {

  }

  handleUserNotice (userNoticeType, userNoticeObj) {

  }

  handleTimed (channelID) {
    if (this.pointsSettings.hasOwnProperty(channelID)) {

      //TODO: do stuff for interval

      setTimeout(this.handleTimed.bind(this, channelID), this.pointsSettings[channelID].intervalTime * 1000)
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

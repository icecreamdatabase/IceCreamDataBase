"use strict"
const util = require('util')
//CLASSES
const Logger = require('../../helper/Logger')
const DiscordLog = require('../DiscordLog')
//ENUMS
const UserLevels = require('../../../ENUMS/UserLevels.js')

module.exports = class UserState {
  constructor (bot) {
    this.bot = bot

    this.bot.TwitchIRCConnection.on('USERSTATE', this.onUserState.bind(this))
  }

  /**
   * Method from bot.TwitchIRCconnection event emitter 'USERSTATE'.
   * @param obj raw object from TwitchIRCconnection registerEvents
   * @returns {Promise<boolean>} Was action taken
   */
  async onUserState (obj) {
    // update own botStatus in a specific channel
    let roomId = await this.bot.userIdLoginCache.nameToId(obj.param.substr(1))
    this.bot.channels[roomId].botStatus = UserState.getUserLevel(obj.tags)

    return true
  }

  static getUserLevel (tagsObj) {
    if (Object.prototype.hasOwnProperty.call(tagsObj, "badges")) {
      let badges = tagsObj["badges"]
      if (badges !== true) {
        let badgeSplit = badges.split(",")
        badgeSplit = badgeSplit.map((x) => UserLevels[x.split("/")[0].toUpperCase()]).filter(Boolean)
        badgeSplit.push(UserLevels.DEFAULT)
        return Math.max(...badgeSplit)
      }
    }
    return UserLevels.DEFAULT
  }
}

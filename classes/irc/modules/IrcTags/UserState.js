"use strict"
const UserLevels = require('../../../../ENUMS/UserLevels.js')

class UserState {
  /**
   * @param {Bot} bot
   */
  constructor (bot) {
    this._bot = bot

    this.bot.irc.ircConnector.on('USERSTATE', this.onUserState.bind(this))
  }

  /**
   * @return {Bot}
   */
  get bot () {
    return this._bot
  }

  /**
   * Method from bot.TwitchIRCconnection event emitter 'USERSTATE'.
   * @param obj raw object from TwitchIRCconnection registerEvents
   * @returns {Promise<boolean>} Was action taken
   */
  async onUserState (obj) {
    // update own botStatus in a specific channel
    let roomId = await this.bot.userIdLoginCache.nameToId(obj.param.substr(1))
    if (Object.prototype.hasOwnProperty.call(this.bot.irc.channels, roomId)) {
      this.bot.irc.channels[roomId].botStatus = UserState.getUserLevel(obj.tags)
    }

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

module.exports = UserState

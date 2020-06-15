"use strict"
const Logger = require('./Logger')

const CLEANUPINTERVAL = 10800000 //3 hours

let userInfosById = {}
let userInfosByName = {}

class UserIdLoginCache {
  /**
   * @param {Bot} bot
   */
  constructor (bot) {
    this._bot = bot

    setInterval(this.updateMaps.bind(this), CLEANUPINTERVAL)
    setTimeout(this.updateMaps.bind(this), 10000)
  }

  /**
   * @return {Bot}
   */
  get bot () {
    return this._bot
  }

  /**
   *
   * @param {string[]|number[]} ids
   * @return {Promise<void>}
   */
  async prefetchListOfIds (ids) {
    let users = await this.bot.api.kraken.userDataFromIds(ids)
    for (let user of users) {
      userInfosById[user["_id"]] = user
      userInfosByName[user["name"].toLowerCase()] = user
    }
  }

  /**
   *
   * @param {string|number} id
   * @return {Promise<undefined|string>}
   */
  async idToName (id) {
    if (!Object.prototype.hasOwnProperty.call(userInfosById, id)) {
      let users = await this.bot.api.kraken.userDataFromIds([id])
      if (users.length > 0) {
        let user = users[0]
        userInfosById[user["_id"]] = user
        userInfosByName[user["name"].toLowerCase()] = user
      } else {
        Logger.warn(`idToName failed with id: ${id}\nChannel is probably banned.`)
        return undefined
      }
    }

    return userInfosById[id].name
  }

  /**
   *
   * @param {string} name
   * @return {Promise<null|number|string>}
   */
  async nameToId (name) {
    name = name.toLowerCase().trim()
    //Get rid of channelnamne #
    if (name.charAt(0) === "#") {
      name = name.substr(1)
    }
    if (!Object.prototype.hasOwnProperty.call(userInfosByName, name)) {
      let users = await this.bot.api.kraken.userDataFromLogins([name])
      if (users.length > 0) {
        let user = users[0]
        userInfosById[user["_id"]] = user
        userInfosByName[user["name"].toLowerCase()] = user
      } else {
        Logger.warn(`nameToId failed with name: ${name}`)
        return null
      }
    }

    return userInfosByName[name]["_id"]
  }

  updateMaps () {
    let currentIds = Object.keys(userInfosById)
    userInfosById = {}
    userInfosByName = {}
    this.prefetchListOfIds(currentIds).then(() => Logger.debug(`Refreshed UserIdLoginCache. ${this.bot.userId} (${this.bot.userName}) is currently tracking ${Object.keys(userInfosById).length} ids.`))
  }
}

module.exports = UserIdLoginCache

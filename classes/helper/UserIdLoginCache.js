"use strict"
const util = require('util')
const Logger = require('./Logger')

const CLEANUPINTERVAL = 10800000 //3 hours

let userInfosById = {}
let userInfosByName = {}

module.exports = class UserIdLoginCache {
  constructor (bot) {
    this.bot = bot

    setInterval(this.updateMaps.bind(this), CLEANUPINTERVAL)
    setTimeout(this.updateMaps.bind(this), 15000)
  }

  async prefetchListOfIds (ids) {
    let users = await this.bot.api.kraken.userDataFromIds(ids)
    for (let user of users) {
      userInfosById[user["_id"]] = user
      userInfosByName[user["name"].toLowerCase()] = user
    }
  }

  async idToName (id) {
    if (!Object.prototype.hasOwnProperty.call(userInfosById, id)) {
      let users = await this.bot.api.kraken.userDataFromIds([id])
      if (users.length > 0) {
        let user = users[0]
        userInfosById[user["_id"]] = user
        userInfosByName[user["name"].toLowerCase()] = user
      } else {
        Logger.warn(`idToName failed with id: ${id}`)
        return null
      }
    }

    return userInfosById[id].name
  }

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
    try {
      this.prefetchListOfIds(currentIds).then(() => Logger.debug(`Refreshed UserIdLoginCache. Currently tracking ${Object.keys(userInfosById).length} ids.`))
    } catch (e) {
      Logger.warn(`${e.message}\n\n${util.inspect(this.bot.api)}`)
    }
  }
}


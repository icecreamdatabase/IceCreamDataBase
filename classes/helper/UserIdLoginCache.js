"use strict"
const util = require('util')
const Logger = require('./Logger')

let userInfosById = {}
let userInfosByName = {}

module.exports = class UserIdLoginCache {
  constructor (bot) {
    this.bot = bot
  }

  async prefetchListOfIds (ids) {
    let users = await this.bot.apiFunctions.userDataFromIds(ids)
    for (let user of users) {
      userInfosById[user["_id"]] = user
      userInfosByName[user["name"].toLowerCase()] = user
    }
  }

  async idToName (id, allowRecheck = true) {
    if (!userInfosById.hasOwnProperty(id)) {
      let users = await this.bot.apiFunctions.userDataFromIds([id])
      if (users.count > 0) {
        let user = users[0]
        userInfosById[user["_id"]] = user
        userInfosByName[user["name"].toLowerCase()] = user
      } else {
        Logger.warn(`idToName failed with id: ${id}\nRecheck: ${allowRecheck}`)
        if (allowRecheck) {
          //TODO: Don't make this recursive. It can only go in once ... but would be nice to do it elsewise!
          return await this.idToName(id, false)
        }
        return null
      }
    }

    return userInfosById[id].name
  }

  async nameToId (name, allowRecheck = true) {
    name = name.toLowerCase().trim()
    if (!userInfosByName.hasOwnProperty(name)) {
      let users = await this.bot.apiFunctions.userDataFromLogins([name])
      if (users.count > 0) {
        let user = users[0]
        userInfosById[user["_id"]] = user
        userInfosByName[user["name"].toLowerCase()] = user
      } else {
        Logger.warn(`nameToId failed with name: ${name}\nRecheck: ${allowRecheck}`)
        if (allowRecheck) {
          //TODO: Don't make this recursive. It can only go in once ... but would be nice to do it elsewise!
          return await this.nameToId(name, false)
        }
        return null
      }
    }

    return userInfosByName[name].name
  }

  clearMaps () {
    userInfosById = {}
    userInfosByName = {}
  }
}


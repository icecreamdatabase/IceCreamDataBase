"use strict"
const Logger = require('./Logger')
const SqlChannels = require('./../sql/main/SqlChannels')

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
  }

  /**
   * @return {Bot}
   */
  get bot () {
    return this._bot
  }

  async prefetchFromDatabase () {
    let channels = await SqlChannels.getChannelData(this.bot.userId)
    for (let currentId in channels) {
      if (Object.prototype.hasOwnProperty.call(channels, currentId)) {
        let channel = channels[currentId]
        userInfosById[channel.channelID] = channel.channelName
        userInfosByName[channel.channelName.toLowerCase()] = channel.channelID
      }
    }
  }

  async checkNameChanges () {
    let channelIdsFromDb = Object.keys(await SqlChannels.getChannelData(this.bot.userId))
    let users = await this.bot.api.kraken.userDataFromIds(channelIdsFromDb)
    for (let user of users) {
      if (userInfosById[user._id] !== undefined
        && userInfosById[user._id] !== user.name) {
        // Person must have changed their name
        Logger.debug(`############################################################`)
        Logger.debug(`${user._id} changed their name: ${userInfosById[user._id]} --> ${user.name}`)
        Logger.debug(`############################################################`)
        await SqlChannels.updateUserNameIfExists(user._id, user.name)
      }
    }
    await this.prefetchFromDatabase()
    await this.bot.irc.updateBotChannels()
  }

  /**
   *
   * @param {string[]|number[]} ids
   * @return {Promise<void>}
   */
  async prefetchListOfIds (ids) {
    let users = await this.bot.api.kraken.userDataFromIds(ids)
    for (let user of users) {
      userInfosById[user["_id"]] = user.name
      userInfosByName[user["name"].toLowerCase()] = user["_id"]
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
        userInfosById[user._id] = user.name
        userInfosByName[user.name.toLowerCase()] = user._id
      } else {
        Logger.warn(`idToName failed with id: ${id}\nChannel is probably banned.`)
        return undefined
      }
    }

    return userInfosById[id]
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
        userInfosById[user._id] = user.name
        userInfosByName[user.name.toLowerCase()] = user._id
      } else {
        Logger.warn(`nameToId failed with name: ${name}`)
        return null
      }
    }

    return userInfosByName[name]
  }

  async updateMaps () {
    let currentIds = Object.keys(userInfosById)
    userInfosById = {}
    userInfosByName = {}
    await this.prefetchListOfIds(currentIds)
    await this.checkNameChanges()
    Logger.debug(`Refreshed UserIdLoginCache. ${this.bot.userId} (${this.bot.userName}) is currently tracking ${Object.keys(userInfosById).length} ids.`)
  }
}

module.exports = UserIdLoginCache

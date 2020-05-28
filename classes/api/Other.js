"use strict"
const axios = require('axios')
const configOption = require('../../config')

//TODO: use custom axois instances https://www.npmjs.com/package/axios

class Other {
  /**
   * @param {Bot} bot
   */
  constructor (bot) {
    this._bot = bot
  }

  /**
   * @return {Bot}
   */
  get bot () {
    return this._bot
  }

  /**
   * Get a list of users in a channel
   * @param channelName channel to check
   * @returns {Promise<string[]>} array of chatters
   */
  static async getAllUsersInChannel (channelName) {
    if (channelName.charAt(0) === '#') {
      channelName = channelName.substring(1)
    }
    let chattersObj = (await axios(`https://tmi.twitch.tv/group/user/${channelName}/chatters`)).data
    if (Object.prototype.hasOwnProperty.call(chattersObj, "chatters")) {
      return [].concat.apply([], Object.values(chattersObj.chatters))
    }
    return []
  }

  /**
   * Check if user is in chatters list
   * @param loginToCheck
   * @param channelName
   * @returns {Promise<boolean>}
   */
  static async isUserInChannel (loginToCheck, channelName) {
    let allChatters = await this.getAllUsersInChannel(channelName)
    return this.stringEntryInArray(allChatters, loginToCheck)
  }

  /**
   * Case insensitive version of Array.includes()
   * @param array Array to check
   * @param entryToCheck Entry to check
   * @returns {boolean} includes
   */
  static stringEntryInArray (array, entryToCheck) {
    if (array.length > 0) {
      for (let entry of array) {
        if (entry.toLowerCase() === entryToCheck.toLowerCase()) {
          return true
        }
      }
    }
    return false
  }

  /**
   * Send a "Short Answer" request to the Wolfram Alpha API
   * @param input query import
   * @returns {Promise<string>} Answer
   */
  static async wolframAlphaRequest (input) {
    let waAppid = configOption.waoptions.appid
    if (waAppid) {
      let apiUrl = "https://api.wolframalpha.com/v1/result?i=" + encodeURIComponent(input) + "&appid=" + waAppid + "&units=metric"
      try {
        return (await axios(apiUrl)).data
      } catch (e) {
        return e.response.data.toString()
      }
    } else {
      return "No Wolfram Alpha AppID set."
    }
  }

  /**
   * Pings the Supinic api bot active endpoint.
   * Return true if sucessful or "If you authorize correctly, but you're not being tracked as a channel bot".
   * Else returns false
   * @param user supiniicApiUser
   * @param key supinicApiKey
   * @returns {Promise<boolean>} Was ping successful
   */
  static async supinicApiPing (user, key) {
    if (user && key) {
      try {
        await axios({
          method: 'put',
          url: 'https://supinic.com/api/bot-program/bot/active',
          headers: {
            Authorization: `Basic ${user}:${key}`
          }
        })
        return true
      } catch (e) {
        return e.response.status === 400
      }
    }
    return false
  }
}

module.exports = Other

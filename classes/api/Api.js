"use strict"
const axios = require('axios')
const util = require('util')
const configOption = require('../../config')
const TimeConversion = require("../../ENUMS/TimeConversion")

const TWITCH_API_KRAKEN = {
  url: "https://api.twitch.tv/kraken/",
  method: 'GET',
  headers: {
    'Accept': 'application/vnd.twitchtv.v5+json',
  }
}

const TWITCH_API_HELIX = {
  host: "api.twitch.tv",
  path: "/helix/",
  method: 'GET',
  headers: {}
}

//TODO: use custom axois instances https://www.npmjs.com/package/axios

module.exports = class ApiFunctions {
  constructor () {

  }

  /**
   * Creates a basic https request which follows redirects
   * @param request https requestObj or new URL(url)
   * @param raw returns full AxiosResponse object instead of only the data
   * @returns {Promise<string|*>}
   */
  static request (request, raw = false) {
    return new Promise((resolve, reject) => {
      axios(request).then((res) => {
        resolve(raw ? res : res.data)
      }).catch((err) => {
        reject(err)
      })
    })
  }

  /**
   * Creates an API request towards twitch API version 5 (kraken)
   * It's recommended to use await to call this function
   * @param clientID
   * @param pathAppend path after *api.twitch.tv/kraken/'
   * @returns {Promise<object>} return from the API parsed from string to json
   */
  static async apiRequestKraken (clientID, pathAppend) {
    return await this.apiRequest(clientID, TWITCH_API_KRAKEN, pathAppend)
  }

  /**
   * Creates an API request towards twitch API version ? (helix)
   * It's recommended to use await to call this function
   * @param clientID
   * @param pathAppend path after *api.twitch.tv/helix/'
   * @returns {Promise<object>} return from the API parsed from string to json
   */
  static async apiRequestHelix (clientID, pathAppend) {
    return await this.apiRequest(clientID, TWITCH_API_HELIX, pathAppend)
  }

  /**
   * Create an https request
   * @param clientID
   * @param requestBase Base object to clone to use for the request
   * @param pathAppend path appended to requestBase.path
   * @returns {Promise<*>} return body parsed to json
   */
  static async apiRequestJson (clientID, requestBase, pathAppend) {
    return await this.apiRequest(clientID, requestBase, pathAppend)
  }

  /**
   * Create an https request
   * @param clientID
   * @param requestBase Base object to clone to use for the request
   * @param pathAppend path appended to requestBase.path
   * @returns {Promise<*>} return body as string
   */
  static async apiRequest (clientID, requestBase, pathAppend) {
    //Duplicate default request object
    let request = Object.assign({}, requestBase)
    request.headers["Client-ID"] = clientID
    request.url += pathAppend
    let ret = await axios(request)
    return ret.data
  }

  /**
   * Gets info about current live broadcast for channelID
   * @param clientID
   * @param channelID
   * @returns {Promise<Object>}
   */
  static async streamInfo (clientID, channelID) {
    return await this.apiRequestKraken(clientID, 'streams/' + channelID)
  }

  /**
   * Get an array with info of past 100 broadcast vods
   * @param clientId
   * @param channelID
   * @returns {Promise<Object>}
   */
  static async getVods (clientId, channelID) {
    return await this.apiRequestKraken(clientId, 'channels/' + channelID + '/videos?broadcast_type=archive&limit=100')
  }

//TODO: cleanup of duplicated stuff
  /**
   * receive login name from a single userid
   * @param clientID
   * @param userId userid to check
   * @returns {Promise<string>} login name as string inside a promise
   */
  static async loginFromUserId (clientID, userId) {
    let response = await this.userInfo(clientID, userId)
    if (response.hasOwnProperty('login')) {
      return response['login']
    } else {
      return ""
    }
  }

//TODO: cleanup of duplicated stuff
  /**
   * Returns the userId from a single login
   * @param clientID
   * @param username login to check
   * @returns {Promise<string>} userId as string
   */
  static async userIdFromLogin (clientID, username) {
    let response = await this.userInfosFromLogins(clientID, [username])

    if (response.total === 0 || response.users.length === 0) {
      return '-1'
    } else {
      return response.users[0]["_id"]
    }
  }

//TODO: cleanup of duplicated stuff
  /**
   * Returns the userInfo from an array of usernames
   * directly returns the ["users"]
   * automatically handles if more than 100 usernames are requested
   *
   * @param clientID
   * @param {Array<String>} ids The ids to check for
   * @returns {Object} return from users api
   */
  static async userDataFromIds (clientID, ids) {
    let chunkSize = 100
    let users = []
    let requestChunks = [].concat.apply([], ids.map((elem, i) => i % chunkSize ? [] : [ids.slice(i, i + chunkSize)]))

    for (let chunk of requestChunks) {
      let responseChunk = await this.userInfosFromIds(clientID, chunk)
      if (responseChunk["_total"] > 0) {
        users = users.concat(responseChunk["users"])
      }
    }
    return users
  }

//TODO: cleanup of duplicated stuff
  /**
   * Returns the userInfo from an array of ids
   * directly returns the ["users"]
   * automatically handles if more than 100 usernames are requested
   *
   * @param clientID
   * @param {Array<String>} usernames The names to check for
   * @returns {Object} return from users api
   */
  static async userDataFromLogins (clientID, usernames) {
    let chunkSize = 100
    let users = []
    let requestChunks = [].concat.apply([], usernames.map((elem, i) => i % chunkSize ? [] : [usernames.slice(i, i + chunkSize)]))

    for (let chunk of requestChunks) {
      let responseChunk = await this.userInfosFromLogins(clientID, chunk)
      if (responseChunk["_total"] > 0) {
        users = users.concat(responseChunk["users"])
      }
    }
    return users
  }

  /**
   * Return the userInfo from an array of ids
   * max 100 entries are allowed
   *
   * @param clientID
   * @param  {Array<String>} ids The ids to check for
   * @return {Object} return from users api
   */
  static async userInfosFromIds (clientID, ids) {
    return await this.apiRequestKraken(clientID, 'users?id=' + ids.join(','))
  }

  /**
   * Return the userInfo from an array of usernames
   * max 100 entries are allowed
   *
   * @param clientID
   * @param  {Array<String>} usernames The names to check for
   * @return {Object} return from users api
   */
  static async userInfosFromLogins (clientID, usernames) {
    usernames.map((entry) => {
      return entry.replace(/#/, '')
    })
    return await this.apiRequestKraken(clientID, 'users?login=' + usernames.join(','))
  }

  /**
   * Users object returned by
   * kraken/users/XXXXXX/chat and
   * kraken/users/XXXXXX/chat/channels/YYYYYY
   *
   * @typedef {Object} Users
   * @property {string} id
   * @property {string} login
   * @property {string} displayName
   * @property {string} color
   * @property {boolean} isVerifiedBot
   * @property {boolean} isKnownBot
   * @property {Object} Badges
   */

  /**
   * Accesses the kraken/users/:userID/chat
   * Example: https://api.twitch.tv/kraken/users/38949074/chat?api_version=5
   * Example return:
   * {
   *   "id":"38949074",
   *   "login":"icdb",
   *   "displayName":"icdb",
   *   "color":"#00FF00",
   *   "isVerifiedBot":false,
   *   "isKnownBot":false,
   *   "badges":[]
   * }
   * @param clientID
   * @param  {String|int} userId The userID to check for
   * @return {Users} [description]
   */
  static async userInfo (clientID, userId) {
    return await this.apiRequestKraken(clientID, 'users/' + userId + '/chat')
  }

  /**
   * Accesses the kraken/users/:userID/chat/channels/:roomID
   * Example: https://api.twitch.tv/kraken/users/38949074/chat/channels/38949074?api_version=5
   * Example return:
   * {
   *   "id":"38949074",
   *   "login":"icdb",
   *   "displayName":"icdb",
   *   "color":"#00FF00",
   *   "isVerifiedBot":false,
   *   "isKnownBot":false,
   *   "badges":[
   *     {
   *       "id":"moderator",
   *       "version":"1"
   *     }
   *   ]
   * }
   * @param clientID
   * @param  {String|int} userId The userID to check for
   * @param  {String|int} roomId The roomID to check in
   * @return {Users} [description]
   */
  static async userInChannelInfo (clientID, userId, roomId) {
    return await this.apiRequestKraken(clientID, 'users/' + userId + '/chat/channels/' + roomId)
  }


  /**
   * Accesses the kraken/channels/:roomID
   * Example: https://api.twitch.tv/kraken/channels/38949074?api_version=5
   * Example return:
   * {
   *   "mature":true,
   *   "status":"—o—",
   *   "broadcaster_language":"en",
   *   "broadcaster_software":"unknown_rtmp",
   *   "display_name":"icdb",
   *   "game":"Travel \u0026 Outdoors",
   *   "language":"en",
   *   "_id":"38949074",
   *   "name":"icdb",
   *   "created_at":"2013-01-01T18:40:40Z",
   *   "updated_at":"2020-02-28T17:11:55Z",
   *   "partner":false,
   *   "logo":"https://static-cdn.jtvnw.net/jtv_user_pictures/c328da4c-dfc8-490e-a02a-63473b023a2d-profile_image-300x300.png",
   *   "video_banner":null,
   *   "profile_banner":"https://static-cdn.jtvnw.net/jtv_user_pictures/4788ff0a-cae9-48cb-9028-effe6996f9b3-profile_banner-480.png",
   *   "profile_banner_background_color":null,
   *   "url":"https://www.twitch.tv/icdb",
   *   "views":5149,
   *   "followers":398,
   *   "broadcaster_type":"affiliate",
   *   "description":"The Ice Cream Database (abbreviated icdb) is an online database of information related to ice cream, cones, and scoops, including flavour and nutritional information. OpieOP",
   *   "private_video":false,
   *   "privacy_options_enabled":false
   * }
   * @param clientID
   * @param  {String|int} roomId The roomID to check
   * @return {Users} [description]
   */
  static async channelInfo (clientID, roomId) {
    return await this.apiRequestKraken(clientID, 'channels/' + roomId)
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
    let chattersObj = await this.request("https://tmi.twitch.tv/group/user/" + channelName + "/chatters")
    if (chattersObj.hasOwnProperty("chatters")) {
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
   * TODO: WIP
   * Get followtime of a user in channel
   * @param clientID
   * @param userId
   * @param roomId
   * @returns {Promise<{followDate: Date, followTimeMs: number, followTimeS: number, followtimeMin: number, followtimeH: number, followtimeD: number, followtimeMon: number, followtimeY: number}>}
   */
  static async followTime (clientID, userId, roomId) {
    let response = await this.apiRequestKraken(clientID, 'users/' + userId + '/follows/channels/' + roomId).catch(e => console.log(e))
    console.log(response)
    let returnObj = {followDate: undefined, followTimeMs: -1, followTimeS: -1, followtimeMin: -1, followtimeH: -1, followtimeD: -1, followtimeMon: -1, followtimeY: -1}
    if (response && response.hasOwnProperty("created_at")) {
      returnObj.followDate = new Date(response.created_at)
      returnObj.followTimeMs = Date.now() - returnObj.followDate
      returnObj.followTimeS = Math.floor(returnObj.followTimeMs / 1000)
      returnObj.followtimeMin = Math.floor(returnObj.followTimeS / TimeConversion.MINUTETOSECONDS)
      returnObj.followtimeH = Math.floor(returnObj.followTimeS / TimeConversion.HOURTOSECONDS)
      returnObj.followtimeD = Math.floor(returnObj.followTimeS / TimeConversion.DAYTOSECONDS)
      returnObj.followtimeMon = Math.floor(returnObj.followTimeS / TimeConversion.MONTHTOSECONDS)
      returnObj.followtimeY = Math.floor(returnObj.followTimeS / TimeConversion.YEARTOSECONDS)
    }
    return returnObj
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
      return await this.request(apiUrl)
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
      let request = {
        method: 'put',
        url: 'https://supinic.com/api/bot/active',
        headers: {
          Authorization: "Basic " + user + ":" + key
        }
      }
      try {
        await this.request(request, true)
        return true
      } catch (e) {
        return e.response.status === 400
      }
    }
    return false
  }
}

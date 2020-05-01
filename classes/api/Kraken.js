"use strict"
const Logger = require('../helper/Logger')
const axios = require('axios')
const util = require('util')
const configOption = require('../../config')
const TimeConversion = require("../../ENUMS/TimeConversion")

//TODO: use custom axois instances https://www.npmjs.com/package/axios

module.exports = class Kraken {
  constructor (bot) {
    this.bot = bot
  }

  async request (pathAppend, method = 'GET') {
    try {
      let result = await axios({
        url: `https://api.twitch.tv/kraken/${pathAppend}`,
        method: method,
        headers: {
          'Accept': 'application/vnd.twitchtv.v5+json',
          'Client-ID': this.bot.authentication.clientId,
          'Authorization': `OAuth ${this.bot.authentication.accessToken}`,
        }
      })

    } catch (e) {

    }
  }

  /**
   * Gets info about current live broadcast for channelID
   * @param clientID
   * @param channelID
   * @returns {Promise<Object>}
   */
   async streamInfo (clientID, channelID) {
    return await this.request(`streams/${channelID}`)
  }

  /**
   * Get an array with info of past 100 broadcast vods
   * @param clientId
   * @param channelID
   * @returns {Promise<Object>}
   */
   async getVods (clientId, channelID) {
    return await this.request(`channels/${channelID}/videos?broadcast_type=archive&limit=100`)
  }

//TODO: cleanup of duplicated stuff
  /**
   * receive login name from a single userid
   * @param userId userid to check
   * @returns {Promise<string>} login name as string inside a promise
   */
  async loginFromUserId (userId) {
    let response = await this.userInfo(userId)
    if (Object.hasOwnProperty.call(response, 'login')) {
      return response['login']
    } else {
      return ""
    }
  }

//TODO: cleanup of duplicated stuff
  /**
   * Returns the userId from a single login
   * @param username login to check
   * @returns {Promise<string>} userId as string
   */
   async userIdFromLogin (username) {
    let response = await this.userInfosFromLogins([username])

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
   * @param {Array<String>} ids The ids to check for
   * @returns {Object} return from users api
   */
   async userDataFromIds (ids) {
    let chunkSize = 100
    let users = []
    let requestChunks = [].concat.apply([], ids.map((elem, i) => i % chunkSize ? [] : [ids.slice(i, i + chunkSize)]))

    for (let chunk of requestChunks) {
      let responseChunk = await this.userInfosFromIds(chunk)
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
   * @param {Array<String>} usernames The names to check for
   * @returns {Object} return from users api
   */
   async userDataFromLogins (usernames) {
    let chunkSize = 100
    let users = []
    let requestChunks = [].concat.apply([], usernames.map((elem, i) => i % chunkSize ? [] : [usernames.slice(i, i + chunkSize)]))

    for (let chunk of requestChunks) {
      let responseChunk = await this.userInfosFromLogins(chunk)
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
   * @param  {Array<String>} ids The ids to check for
   * @return {Object} return from users api
   */
   async userInfosFromIds (ids) {
    return await this.request('users?id=' + ids.join(','))
  }

  /**
   * Return the userInfo from an array of usernames
   * max 100 entries are allowed
   *
   * @param  {Array<String>} usernames The names to check for
   * @return {Object} return from users api
   */
   async userInfosFromLogins (usernames) {
    usernames.map((entry) => {
      return entry.replace(/#/, '')
    })
    return await this.request('users?login=' + usernames.join(','))
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
   * @param  {String|int} userId The userID to check for
   * @return {Users} [description]
   */
  async userInfo (userId) {
    return await this.request('users/' + userId + '/chat')
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
   * @param  {String|int} userId The userID to check for
   * @param  {String|int} roomId The roomID to check in
   * @return {Users} [description]
   */
   async userInChannelInfo (userId, roomId) {
    return await this.request('users/' + userId + '/chat/channels/' + roomId)
  }

  /**
   * Channel object returned by
   * kraken/channels/XXXXXX
   *
   * @typedef {Object} Channel
   * @property {boolean} mature
   * @property {string} status
   * @property {string} broadcaster_language
   * @property {string} broadcaster_software
   * @property {string} display_name
   * @property {string} game
   * @property {string} language
   * @property {string} _id
   * @property {string} name
   * @property {string} created_at
   * @property {string} updated_at
   * @property {boolean} partner
   * @property {string} logo
   * @property {string} video_banner
   * @property {string} profile_banner
   * @property {string} profile_banner_background_color
   * @property {string} url
   * @property {number} views
   * @property {number} followers
   * @property {string} broadcaster_type
   * @property {string} description
   * @property {boolean} private_video
   * @property {boolean} privacy_options_enabled
   */

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
   *   "logo":"https://-cdn.jtvnw.net/jtv_user_pictures/c328da4c-dfc8-490e-a02a-63473b023a2d-profile_image-300x300.png",
   *   "video_banner":null,
   *   "profile_banner":"https://-cdn.jtvnw.net/jtv_user_pictures/4788ff0a-cae9-48cb-9028-effe6996f9b3-profile_banner-480.png",
   *   "profile_banner_background_color":null,
   *   "url":"https://www.twitch.tv/icdb",
   *   "views":5149,
   *   "followers":398,
   *   "broadcaster_type":"affiliate",
   *   "description":"The Ice Cream Database (abbreviated icdb) is an online database of information related to ice cream, cones, and scoops, including flavour and nutritional information. OpieOP",
   *   "private_video":false,
   *   "privacy_options_enabled":false
   * }
   * @param  {String|int} roomId The roomID to check
   * @return {Users} [description]
   */
   async channelInfo (roomId) {
    return await this.request('channels/' + roomId)
  }

  /**
   * Get Channel objects for an array of roomIds
   * @param {[number]} roomIds
   * @returns {Promise<Object>}
   */
   async channelInfos (roomIds) {
    return await this.request('channels?id=' + roomIds.join(','))
  }

  /**
   * Get Channel objects for an array of roomIds
   * @param {[number]} roomIds
   * @returns {Promise<[Channel]>} channelObjects
   */
   async channelInfosFromIds (roomIds) {
    let chunkSize = 100
    let users = []
    let requestChunks = [].concat.apply([], roomIds.map((elem, i) => i % chunkSize ? [] : [roomIds.slice(i, i + chunkSize)]))

    for (let chunk of requestChunks) {
      let responseChunk = await this.channelInfos(chunk)
      if (responseChunk["_total"] > 0) {
        users = users.concat(responseChunk["channels"])
      }
    }
    return users
  }

  /**
   * TODO: WIP
   * Get followtime of a user in channel
   * @param userId
   * @param roomId
   * @returns {Promise<{followDate: Date, followTimeMs: number, followTimeS: number, followtimeMin: number, followtimeH: number, followtimeD: number, followtimeMon: number, followtimeY: number}>}
   */
   async followTime (userId, roomId) {
    let response = await this.request('users/' + userId + '/follows/channels/' + roomId).catch(e => Logger.log(e))
    Logger.log(response)
    let returnObj = {
      followDate: undefined,
      followTimeMs: -1,
      followTimeS: -1,
      followtimeMin: -1,
      followtimeH: -1,
      followtimeD: -1,
      followtimeMon: -1,
      followtimeY: -1
    }
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
}

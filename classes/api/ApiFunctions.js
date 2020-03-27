"use strict"
const Api = require('./Api.js')
//ENUMS
const Logger = require('../helper/Logger')
const UserLevels = require('../../ENUMS/UserLevels.js')
const ChatLimit = require('../../ENUMS/ChatLimit.js')

//update bot status every 300 seconds (5 minutes)
const UPDATE_BOT_STATUS_INTERVAL = 300000 //ms
const UPDATE_BOT_STATUS_RANDOM_DELAY_FACTOR = 0.5
const UPDATE_BOT_STATUS_RANDOM_MIN_DELAY = 100 //ms
//ping supinic api once very 1800 seconds (30 minutes)
const SUPINIC_API_PING_INTERVAL = 1800000

module.exports = class ApiFunctions {
  constructor (bot) {
    this.bot = bot

    setInterval(this.updateBotStatus.bind(this, true), UPDATE_BOT_STATUS_INTERVAL)
    setInterval(this.supinicApiPing.bind(this), SUPINIC_API_PING_INTERVAL)
    // noinspection JSIgnoredPromiseFromCall
    this.supinicApiPing()
  }

  /**
   * Creates an API request towards twitch API version 5 (kraken)
   * It's recommended to use await to call this function
   * @param pathAppend path after *api.twitch.tv/kraken/'
   * @returns {Promise<object>} return from the API parsed from string to json
   */
  async apiRequestKraken (pathAppend) {
    return await Api.apiRequestKraken(this.bot.clientId, pathAppend)
  }

  /**
   * Creates an API request towards twitch API version ? (helix)
   * It's recommended to use await to call this function
   * @param pathAppend path after *api.twitch.tv/helix/'
   * @returns {Promise<object>} return from the API parsed from string to json
   */
  async apiRequestHelix (pathAppend) {
    return await Api.apiRequestHelix(this.bot.clientId, pathAppend)
  }

  /**
   * Create an https request
   * @param requestBase Base object to clone to use for the request
   * @param pathAppend path appended to requestBase.path
   * @returns {Promise<*>} return body parsed to json
   */
  async apiRequestJson (requestBase, pathAppend) {
    return await Api.apiRequestJson(this.bot.clientId, requestBase, pathAppend)
  }

  /**
   * receive login name from a single userid
   * @param userId userid to check
   * @returns {Promise<string>} login name as string inside a promise
   * @deprecated
   */
  async loginFromUserId (userId) {
    return await Api.loginFromUserId(this.bot.clientId, userId)
  }

  /**
   * Returns the userId from a single login
   * @param username login to check
   * @returns {Promise<string>} userId as string
   * @deprecated
   */
  async userIdFromLogin (username) {
    return await Api.userIdFromLogin(this.bot.clientId, username)
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
    return await Api.userDataFromIds(this.bot.clientId, ids)
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
    return await Api.userDataFromLogins(this.bot.clientId, usernames)
  }

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
    return Api.userInfo(this.bot.clientId, userId)
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
    return Api.userInChannelInfo(this.bot.clientId, userId, roomId)
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
   * @param  {String|int} roomId The roomID to check
   * @return {Users} [description]
   */
  async channelInfo (roomId) {
    return Api.channelInfo(this.bot.clientId, roomId)
  }

  /**
   * Get Channel objects for an array of roomIds
   * @param {[number]} roomIds
   * @returns {Promise<[Channel]>} channelObjects
   */
  async channelInfosFromIds (roomIds) {
    return Api.channelInfosFromIds(this.bot.clientId, roomIds)
  }

  /**
   * TODO: WIP
   * Get followtime of a user in channel
   * @param userId
   * @param roomId
   * @returns {Promise<{followDate: Date, followTimeMs: number, followTimeS: number, followtimeMin: number, followtimeH: number, followtimeD: number, followtimeMon: number, followtimeY: number}>}
   */
  async followTime (userId, roomId) {
    return await Api.followTime(this.bot.clientId, userId, roomId)
  }

  /**
   * Send a "Short Answer" request to the Wolfram Alpha API
   * @param input query import
   * @returns {Promise<string>} Answer
   */
  async wolframAlphaRequest (input) {
    return await Api.wolframAlphaRequest(input)
  }

  /**
   * Pings the Supinic api bot active endpoint.
   * Return true if sucessful or "If you authorize correctly, but you're not being tracked as a channel bot".
   * Else returns false
   * @returns {Promise<boolean>} Was ping successful
   */
  async supinicApiPing () {
    return await Api.supinicApiPing(this.bot.supinicApiUser, this.bot.supinicApiKey)
  }

  /**
   * Returns the userstate of a userId inside a room from the api
   * @param  {String|int} userId The userID to check for
   * @param  {String|int} roomId The roomID to check in
   * @return {isBroadcaster, isMod, isVip, isAny}        Object of the status
   */
  async userStatus (userId, roomId) {
    let userData = await this.userInChannelInfo(userId, roomId)
    let isBroadcaster = false
    let isMod = false
    let isVip = false
    let isSubscriber = false
    for (let badge of userData.badges) {
      if (badge.id === "broadcaster") {
        isBroadcaster = true
      }
      if (badge.id === "moderator") {
        isMod = true
      }
      if (badge.id === "vip") {
        isVip = true
      }
      if (badge.id === "subscriber") {
        isSubscriber = true
      }
    }
    let isAny = isBroadcaster || isMod || isVip
    let isKnownBot = userData["is_known_bot"] || false
    let isVerifiedBot = userData["is_verified_bot"] || false

    return {isBroadcaster, isMod, isVip, isAny, isSubscriber, isKnownBot, isVerifiedBot}
  }

  /**
   * Update the UserLevel of the bot for every channel they are joined.
   * @returns {Promise<void>}
   */
  async updateBotStatus (slowFetch = false) {
    let maxDelay = UPDATE_BOT_STATUS_INTERVAL * UPDATE_BOT_STATUS_RANDOM_DELAY_FACTOR / Object.keys(this.bot.channels).length
    for (let i in this.bot.channels) {
      let channel = this.bot.channels[i]
      let botStatus = await this.userStatus(this.bot.userId, channel.channelID)
      channel.botStatus = UserLevels.PLEB
      if (botStatus.isSubscriber) {
        channel.botStatus = UserLevels.SUBSCRIBER
      }
      if (botStatus.isVip) {
        channel.botStatus = UserLevels.VIP
      }
      if (botStatus.isMod) {
        channel.botStatus = UserLevels.MODERATOR
      }
      if (botStatus.isBroadcaster) {
        channel.botStatus = UserLevels.BROADCASTER
      }

      if (botStatus.isVerifiedBot) {
        this.bot.rateLimitUser = ChatLimit.VERIFIED
        this.bot.rateLimitModerator = ChatLimit.VERIFIED_MOD
      } else if (botStatus.isKnownBot) {
        this.bot.rateLimitUser = ChatLimit.KNOWN
        this.bot.rateLimitModerator = ChatLimit.KNOWN_MOD
      } else {
        this.bot.rateLimitUser = ChatLimit.NORMAL
        this.bot.rateLimitModerator = ChatLimit.NORMAL_MOD
      }
      if (slowFetch) {
        await ApiFunctions.sleep(Math.floor(Math.random() * maxDelay) + UPDATE_BOT_STATUS_RANDOM_MIN_DELAY)
      }
    }
  }

  static async sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

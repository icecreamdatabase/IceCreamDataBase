"use strict"
const Api = require('./Api.js')
//ENUMS
const UserLevels = require('../../ENUMS/UserLevels.js')
const ChatLimit = require('../../ENUMS/ChatLimit.js')

//update bot status every 60 seconds (1 minute)
const UPDATE_BOT_STATUS_INTERVAL = 60000 //ms

module.exports = class ApiFunctions {
  constructor (bot) {
    this.bot = bot

    setInterval(this.updateBotStatus.bind(this), UPDATE_BOT_STATUS_INTERVAL)
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
   */
  async loginFromUserId (userId) {
    return await Api.loginFromUserId(this.bot.clientId, userId)
  }

  /**
   * Returns the userId from a single login
   * @param username login to check
   * @returns {Promise<string>} userId as string
   */
  async userIdFromLogin (username) {
    return await Api.userIdFromLogin(this.bot.clientId, username)
  }

  async userInfosFromLogins (usernames) {
    return await Api.apiRequestKraken(this.bot.clientId, usernames)
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
  async updateBotStatus () {
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
    }
  }
}

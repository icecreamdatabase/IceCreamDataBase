"use strict"
const Logger = require('consola')
const https = require('https')
//ENUMS
const UserLevels = require('../ENUMS/UserLevels.js')
const ChatLimit = require('../ENUMS/ChatLimit.js')

const UPDATE_BOT_STATUS_INTERVAL = 15000 //ms

const TWITCH_API_KRAKEN = {
  host: "api.twitch.tv",
  path: "/kraken/",
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


module.exports = class ApiFunctions {
  constructor (bot) {
    this.bot = bot
    TWITCH_API_KRAKEN.headers["Client-ID"] = bot.chat.botData.clientID
    TWITCH_API_HELIX.headers["Client-ID"] = bot.chat.botData.clientID

    setInterval(this.updateBotStatus.bind(this), UPDATE_BOT_STATUS_INTERVAL)
  }

  /**
   * Creates an API request towards twitch API version 5 (kraken)
   * It's recommended to use await to call this function
   * @param pathAppend path after *api.twitch.tv/kraken/'
   * @returns {Promise<object>} return from the API parsed from string to json
   */
  async apiRequestKraken (pathAppend) {
    return await this.apiRequestJson(TWITCH_API_KRAKEN, pathAppend)
  }

  /**
   * Creates an API request towards twitch API version ? (helix)
   * It's recommended to use await to call this function
   * @param pathAppend path after *api.twitch.tv/helix/'
   * @returns {Promise<object>} return from the API parsed from string to json
   */
  async apiRequestHelix (pathAppend) {
    return await this.apiRequestJson(TWITCH_API_HELIX, pathAppend)
  }

  /**
   * Create an https request
   * @param requestBase Base object to clone to use for the request
   * @param pathAppend path appended to requestBase.path
   * @returns {Promise<*>} return body parsed to json
   */
  async apiRequestJson (requestBase, pathAppend) {
    return JSON.parse(await this.apiRequestString(requestBase, pathAppend))
  }

  /**
   * Create an https request
   * @param requestBase Base object to clone to use for the request
   * @param pathAppend path appended to requestBase.path
   * @returns {Promise<*>} return body as string
   */
  async apiRequestString (requestBase, pathAppend) {
    return new Promise((resolve, reject) => {
      //Duplicate default request object
      let request = Object.assign({}, requestBase)
      request.path += pathAppend

      let req = https.request(request, (res) => {
        res.setEncoding('utf8')
        res.on('data', (response) => {
          resolve(response)
        })
      })
      req.on('error', (err) => {
        reject(err)
      })
      req.write('')
      req.end()
    })
  }

  /**
   * receive login name from a single userid
   * @param userId userid to check
   * @returns {Promise<string>} login name as string inside a promise
   */
  async loginFromUserId (userId) {
    let response = await this.userInfo(userId)
    if (response.hasOwnProperty('_id')) {
      return response['_id']
    } else {
      return ""
    }
  }

  /**
   * Returns the userId from a single login
   * @param username login to check
   * @returns {Promise<string>} userId as string
   */
  async userIdFromLogin (username) {
    let response = this.userInfosFromLogins([username])

    if (response.total === 0) {
      return '-1'
    } else {
      return response.users[0].id
    }
  }

  /**
   * Return the userInfo from an array of usernames
   *
   * @param  {Array<String>} usernames The names to check for
   * @return {Object} return from users api
   */
  async userInfosFromLogins (usernames) {
    usernames.map((entry) => {
      return entry.replace(/#/, '')
    })
    return await this.apiRequestKraken('users?login=' + usernames.join(','))
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
    return await this.apiRequestKraken('users/' + userId + '/chat')
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
    return await this.apiRequestKraken('users/' + userId + '/chat/channels/' + roomId)
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
    let isKnownBot = userData.isKnownBot || false
    let isVerifiedBot = userData.isVerifiedBot || false

    return {isBroadcaster, isMod, isVip, isAny, isSubscriber, isKnownBot, isVerifiedBot}
  }

  async updateBotStatus () {
    for (let i in this.bot.chat.channels) {
      let channel = this.bot.chat.channels[i]
      let botStatus = await this.userStatus(this.bot.chat.botData.userId, channel.channelID)
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
        this.bot.chat.rateLimitUser = ChatLimit.VERIFIED
        this.bot.chat.rateLimitModerator = ChatLimit.VERIFIED_MOD
      } else if (botStatus.isKnownBot) {
        this.bot.chat.rateLimitUser = ChatLimit.KNOWN
        this.bot.chat.rateLimitModerator = ChatLimit.KNOWN_MOD
      } else {
        this.bot.chat.rateLimitUser = ChatLimit.NORMAL
        this.bot.chat.rateLimitModerator = ChatLimit.NORMAL_MOD
      }
    }
  }
}

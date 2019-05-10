"use strict"
const Logger = require('consola')
//ENUMS
const UserLevels = require('../ENUMS/UserLevels.js')
const ChatLimit = require('../ENUMS/ChatLimit.js')

const UPDATE_BOT_STATUS_INTERVAL = 15000 //ms


module.exports = class ApiFunctions {
  constructor (bot) {
    this.bot = bot

    setInterval(this.updateBotStatus.bind(this), UPDATE_BOT_STATUS_INTERVAL)
  }

  /**
   * Return the UserID from a username
   * Example: https://api.twitch.tv/kraken/users?api_version=5&login=icdb
   * @param  {String} username The name to check for
   * @return {String}        userID or -1 when no user found
   */
  async userIdFromLogin (username) {
    username = username.replace(/#/, '')
    return new Promise((resolve, reject) => {
      this.bot.api.get('users', {'version': 'kraken', search: {'api_version': '5', 'client_id': this.bot.chat.botData.clientID, 'login': username}}).then(response => {
        if (response.total === 0) {
          resolve("-1")
        } else {
          resolve(response.users[0].id)
        }
      }).catch((err) => {
        reject(err)
      })
    })
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
    return new Promise((resolve, reject) => {
      this.bot.api.get('users/' + userId + '/chat', {'version': 'kraken', search: {'api_version': '5', 'client_id': this.bot.chat.botData.clientID}}).then(response => {
        resolve(response)
      }).catch((err) => {
        reject(err)
      })
    })
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
    return new Promise((resolve, reject) => {
      this.bot.api.get('users/' + userId + '/chat/channels/' + roomId, {'version': 'kraken', search: {'api_version': '5', 'client_id': this.bot.chat.botData.clientID}}).then(response => {
        resolve(response)
      }).catch((err) => {
        reject(err)
      })
    })
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

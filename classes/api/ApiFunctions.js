"use strict"
const Logger = require('consola')
const https = require('https')
const Api = require('./Api.js')
//ENUMS
const UserLevels = require('../../ENUMS/UserLevels.js')
const ChatLimit = require('../../ENUMS/ChatLimit.js')

//update bot status every 60 seconds (1 minute)
const UPDATE_BOT_STATUS_INTERVAL = 60000 //ms

module.exports = class ApiFunctions {
  constructor (bot) {
    this.bot = bot
    this.clientID = bot.TwitchIRCConnection.botData.clientID

    setInterval(this.updateBotStatus.bind(this), UPDATE_BOT_STATUS_INTERVAL)
  }

  async apiRequestKraken (pathAppend) {
    return await Api.apiRequestKraken(this.clientID, pathAppend)
  }

  async apiRequestHelix (pathAppend) {
    return await Api.apiRequestHelix(this.clientID, pathAppend)
  }

  async apiRequestJson (requestBase, pathAppend) {
    return await Api.apiRequestJson(this.clientID, requestBase, pathAppend)
  }

  async apiRequestString (requestBase, pathAppend) {
    return await Api.apiRequestString(this.clientID, requestBase, pathAppend)
  }

  async loginFromUserId (userId) {
    return await Api.loginFromUserId(this.clientID, userId)
  }

  async userIdFromLogin (username) {
    return await Api.userIdFromLogin(this.clientID, username)
  }

  async userInfosFromLogins (usernames) {
    return await Api.apiRequestKraken(this.clientID, usernames)
  }

  async userInfo (userId) {
    return await this.apiRequestKraken('users/' + userId + '/chat')
  }

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
    for (let i in this.bot.channels) {
      let channel = this.bot.channels[i]
      let botStatus = await this.userStatus(this.bot.TwitchIRCConnection.botData.userId, channel.channelID)
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

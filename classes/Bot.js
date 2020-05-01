"use strict"
const util = require('util')
const EventEmitter = require('eventemitter3')
//CLASSES
const Logger = require('./helper/Logger')
const SqlBlacklist = require('./sql/main/SqlUserBlacklist')
const Api = require('./api/Api')
const UserIdLoginCache = require('./helper/UserIdLoginCache')
const Authentication = require('./auth/Authentication')
const IrcBot = require('./irc/Irc')
//ENUMS


const UPDATE_USERBLACKLIST_INTERVAL = 15000 // 15 seconds
const SUPINIC_API_PING_INTERVAL = 1800000 // 30 minutes

module.exports = class Bot {
  constructor (id) {
    this.refreshEmmitter = new EventEmitter()
    this.refreshEmmitter.on('refresh', this.onRefresh.bind(this))

    this.userBlacklist = []
    setInterval(this.updateUserBlacklist.bind(this), UPDATE_USERBLACKLIST_INTERVAL)
    // noinspection JSIgnoredPromiseFromCall
    this.updateUserBlacklist()

    this.userIdLoginCache = new UserIdLoginCache(this)

    this.authentication = new Authentication(this, id)
    this.authentication.init().then(this.onAuthentication.bind(this))
  }

  onAuthentication () {
    if (this.authentication.enableBot) {
      this.api = new Api(this)


      setInterval(this.api.other.supinicApiPing.bind(this, this.authentication.supinicApiUser, this.authentication.supinicApiKey), SUPINIC_API_PING_INTERVAL)
      // noinspection JSIgnoredPromiseFromCall
      this.api.other.supinicApiPing(this.authentication.supinicApiUser, this.authentication.supinicApiKey)

      this.ircBot = new IrcBot(this)
      //this.pubSub = new PubSub(this)
    }
  }

  onRefresh () {
    //TODO
  }

  get userId () {
    return this.authentication.userId
  }

  get userName () {
    return this.authentication.userName
  }

  isUserIdInBlacklist (userId) {
    return this.userBlacklist.includes(parseInt(userId))
  }

  async addUserIdToBlacklist (userId) {
    SqlBlacklist.addUserId(userId)
    await this.updateUserBlacklist()
  }

  async updateUserBlacklist () {
    this.userBlacklist = await SqlBlacklist.getUserIds()
  }
}

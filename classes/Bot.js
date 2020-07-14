"use strict"
const EventEmitter = require('eventemitter3')
//CLASSES
const SqlBlacklist = require('./sql/main/SqlUserBlacklist')
const Api = require('./api/Api')
const UserIdLoginCache = require('./helper/UserIdLoginCache')
const Authentication = require('./auth/Authentication')
const Irc = require('./irc/Irc')
const PubSub = require('./pubsub/PubSub')
//ENUMS

const UPDATE_USERBLACKLIST_INTERVAL = 120000 // 2 minutes
const SUPINIC_API_PING_INTERVAL = 1800000 // 30 minutes

class Bot extends EventEmitter{
  constructor (id) {
    super()
    /** @type {UserIdLoginCache} @private */
    this._userIdLoginCache = undefined
    /** @type {Api} @private */
    this._api = undefined
    /** @type {Irc} @private */
    this._irc = undefined
    /** @type {PubSub} @private */
    this._pubSub = undefined
    this.refreshEventName = 'refresh'

    this.userBlacklist = []
    setInterval(this.updateUserBlacklist.bind(this), UPDATE_USERBLACKLIST_INTERVAL)
    // noinspection JSIgnoredPromiseFromCall
    this.updateUserBlacklist()

    this.on(this.refreshEventName, this.updateUserBlacklist.bind(this))
    this.authentication = new Authentication(this, id)
    this.authentication.init().then(this.onAuthentication.bind(this))
  }

  /**
   * @return {UserIdLoginCache}
   */
  get userIdLoginCache () {
    return this._userIdLoginCache
  }

  /**
   * @return {Api}
   */
  get api () {
    return this._api
  }

  /**
   * @return {Irc}
   */
  get irc () {
    return this._irc
  }

  /**
   * @return {PubSub}
   */
  get pubSub () {
    return this._pubSub
  }

  onAuthentication () {
    if (this.authentication.enableBot) {
      this._userIdLoginCache = new UserIdLoginCache(this)
      this._api = new Api(this)

      setInterval(this.api.other.constructor.supinicApiPing.bind(this, this.authentication.supinicApiUser, this.authentication.supinicApiKey), SUPINIC_API_PING_INTERVAL)
      // noinspection JSIgnoredPromiseFromCall
      //this.api.other.constructor.supinicApiPing(this.authentication.supinicApiUser, this.authentication.supinicApiKey)

      this._irc = new Irc(this)
      this._pubSub = new PubSub(this)
    }
  }

  get userId () {
    return this.authentication.userId
  }

  get userName () {
    return this.authentication.userName
  }

  /**
   * @param {number|string} userId
   * @return {boolean} isUserBlackListed
   */
  isUserIdInBlacklist (userId) {
    return this.userBlacklist.includes(parseInt(userId))
  }

  /**
   * @param {number|string} userId
   * @return {Promise<void>}
   */
  async addUserIdToBlacklist (userId) {
    SqlBlacklist.addUserId(userId)
    await this.updateUserBlacklist()
  }

  async updateUserBlacklist () {
    this.userBlacklist = await SqlBlacklist.getUserIds()
  }
}

module.exports = Bot

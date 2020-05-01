"use strict"
const util = require('util')
const EventEmitter = require('eventemitter3')
//CLASSES
const Logger = require('./helper/Logger')
const SqlBlacklist = require('./sql/main/SqlUserBlacklist')
const ApiFunctions = require('./api/ApiFunctions.js')
const UserIdLoginCache = require('./helper/UserIdLoginCache')
const Authentication = require('./auth/Authentication')

const IrcBot = require('./irc/IrcBot')


const UPDATE_USERBLACKLIST_INTERVAL = 15000 // 15 seconds

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
      //this.api = new Api(this)
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

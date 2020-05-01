"use strict"
const util = require('util')
const Logger = require('../helper/Logger')
const axios = require('axios')
const SqlAuth = require('../sql/main/SqlAuth')
//ENUMS
const TimeConversion = require('../../ENUMS/TimeConversion')

const VALIDATE_REFRESH_OFFSET = 120000 // 2 minutes
const VALIDATE_INTERVAL = 900000 // 15 minutes
const UPDATE_INTERVAL = 300000 // 5 minutes

module.exports = class Authentication {
  constructor (bot, userId) {
    this.bot = bot
    this._userId = userId
    this._authData = {}
    setInterval(this.validate.bind(this), VALIDATE_INTERVAL)
    setInterval(this.update.bind(this), UPDATE_INTERVAL)

    this.bot.refreshEmmitter.on('refresh', this.update.bind(this))
  }

  get userId () {
    return this._userId
  }

  get userName () {
    return this._authData["userName"]
  }
  get clientId () {
    return this._authData["clientID"]
  }

  get accessToken () {
    return this._authData["access_token"]
  }

  get enableBot () {
    return !!this._authData["enableBot"]
  }

  /**
   * Supinic user id of the current bot
   * @returns {string} userName
   */
  get supinicApiUser () {
    return this._authData["supinicApiUser"]
  }

  /**
   * Supinic API key of the current bot
   * @returns {string} key
   */
  get supinicApiKey () {
    return this._authData["supinicApiKey"]
  }

  async validate () {
    try {
      let result = await axios({
        method: 'get',
        url: 'https://id.twitch.tv/oauth2/validate',
        headers: {
          'Authorization': `OAuth ${this.accessToken}`
        }
      })
      if (result.data["expires_in"] < (VALIDATE_INTERVAL + VALIDATE_REFRESH_OFFSET) / TimeConversion.SECONDSTOMILLISECONDS) {
        this.refresh()
      }
    } catch (e) {
      //if unauthorized (expired or wrong token) also this.refresh()
      if (e.response.status === 401) {
        this.refresh()
      }
      Logger.warn(e)
    }
  }

  async refresh () {
    try {
      let result = await axios({
        method: 'post',
        url: 'https://id.twitch.tv/oauth2/token',
        params: {
          'client_id': this.clientID,
          'client_secret': this._authData["clientSecret"],
          'grant_type': 'refresh_token',
          'refresh_token': this._authData["refresh_token"]
        }
      })
      await SqlAuth.setAccessToken(this.userId, result.data["access_token"])
      await this.update()
      Logger.debug(`Token refreshed for ${this.bot.userName}`)
    } catch (e) {
      Logger.warn(`Token refresh failed for ${this.bot.userName}`)
    }
  }

  async revoke () {
    try {
      let result = await axios({
        method: 'post',
        url: 'https://id.twitch.tv/oauth2/revoke',
        params: {
          'client_id': this.clientID,
          'token': this.accessToken
        }
      })
      Logger.debug(`Token revoked for ${this.bot.userName}`)
    } catch (e) {
      Logger.warn(`Token revoke for ${this.bot.userName} errored: \n${e.response.statusText}`)
    }
  }

  async update () {
    this._authData = await SqlAuth.getAuthData(this.userId)
  }

  async init () {
    await this.update()
    // if this._authData is not {} --- update() will set it to {} if something failed. This should never happen!
    if (Object.keys(this._authData).length) {
      await this.validate()
    } else {
      Logger.error(`An account has no valid auth data in the database!\n${this.userId}`)
    }
  }
}

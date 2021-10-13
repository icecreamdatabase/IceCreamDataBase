"use strict"
const Logger = require('../helper/Logger')
const axios = require('axios')
const https = require("https")
const SqlAuth = require('../sql/main/SqlAuth')
//ENUMS
const TimeConversion = require('../../ENUMS/TimeConversion')

const VALIDATE_REFRESH_OFFSET = 120000 // 2 minutes
const VALIDATE_INTERVAL = 900000 // 15 minutes
const UPDATE_INTERVAL = 300000 // 5 minutes

class Authentication {
  /**
   * @param {Bot} bot
   * @param {number} userId
   */
  constructor (bot, userId) {
    this._bot = bot
    this._userId = userId
    this._authData = {}
    setInterval(this.validate.bind(this), VALIDATE_INTERVAL)
    setInterval(this.update.bind(this), UPDATE_INTERVAL)

    this.bot.on(this.bot.refreshEventName, this.update.bind(this))
  }

  /**
   * @return {Bot}
   */
  get bot () {
    return this._bot
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

  get enableWhisperLog () {
    return !!this._authData["enableWhisperLog"]
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
        },
        timeout: 60000,
        httpsAgent: new https.Agent({ keepAlive: true }),
      })
      //Logger.debug(`^^^ Validated token for: ${this.userId} (${this.userName})`)
      if (result.data["expires_in"] < (VALIDATE_INTERVAL + VALIDATE_REFRESH_OFFSET) / TimeConversion.SECONDSTOMILLISECONDS) {
        await this.refresh()
      }
    } catch (e) {
      if (Object.prototype.hasOwnProperty.call(e, "response")
        && e.response
        && Object.prototype.hasOwnProperty.call(e.response, "status")) {
        //if unauthorized (expired or wrong token) also this.refresh()
        if (e.response.status === 401) {
          Logger.info(`Unauthorized. Needs to refresh for ${this.bot.userName}`)
          await this.refresh()
        } else {
          Logger.warn(`Token validate for ${this.bot.userName} errored: ${e.response.status} \n${e.response.statusText}`)
        }
      } else {
        Logger.warn(`Token validate for ${this.bot.userName} errored: \n${e.message}`)
      }
    }
  }

  async refresh () {
    try {
      let result = await axios({
        method: 'post',
        url: 'https://id.twitch.tv/oauth2/token',
        params: {
          'client_id': this.clientId,
          'client_secret': this._authData["clientSecret"],
          'grant_type': 'refresh_token',
          'refresh_token': this._authData["refresh_token"]
        }
      })
      await SqlAuth.setAccessToken(this.userId, result.data["access_token"])
      await this.update()
      Logger.debug(`Token refreshed for ${this.bot.userName}`)
    } catch (e) {
      Logger.warn(`Token refresh failed for ${this.bot.userName} \n${e.message}`)
    }
  }

  async revoke () {
    try {
      await axios({
        method: 'post',
        url: 'https://id.twitch.tv/oauth2/revoke',
        params: {
          'client_id': this.clientId,
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

module.exports = Authentication

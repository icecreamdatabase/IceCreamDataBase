"use strict"
const util = require('util')
const Logger = require('../helper/Logger')
const axios = require('axios')
const SqlAuth = require('../sql/main/SqlAuth')

const UPDATE_INTERVAL = 300000 // 5 minutes

module.exports = class Authentication {
  constructor (bot, userId) {
    this.bot = bot
    this.userId = userId
    this.authData = {}
    setInterval(this.update.bind(this), UPDATE_INTERVAL)
  }

  get clientID () {
    return this.authData["clientID"]
  }

  get clientSecret () {
    return this.authData["clientSecret"]
  }

  async setAccessToken (accessToken) {
    await SqlAuth.setAccessToken(this.userId, accessToken)
  }

  get accessToken () {
    return this.authData["access_token"]
  }

  get refreshToken () {
    return this.authData["refresh_token"]
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
      Logger.info(util.inspect(result.data))
      if (result.data["expires_in"] < 3600) {
        this.refresh()
      }
    } catch (e) {
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
          'client_secret': this.clientSecret,
          'grant_type': 'refresh_token',
          'refresh_token': this.refreshToken
        }
      })
      Logger.info(util.inspect(result.data))
      this.setAccessToken(result.data["access_token"]).then()
    } catch (e) {
      Logger.error(e)
    }
  }

  async update () {
    this.authData = await SqlAuth.getAuthData(this.userId)
    if (Object.keys(this.authData).length) {
      await this.validate()
    } else {
      Logger.log(`An account has no valid auth data in the database!\n${this.userId}`)
    }
  }
}

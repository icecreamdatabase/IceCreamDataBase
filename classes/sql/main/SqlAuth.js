"use strict"
const sqlPool = require('../Sql').pool
const Logger = require('../../helper/Logger')

module.exports = class SqlBot {
  constructor () {

  }

  static async getAuthData (botId) {
    let results = await sqlPool.query(`SELECT *
                                       FROM auth
                                       WHERE ID = ?;`, [botId])

    return results.length > 0 ? results[0] : {}
  }

  static async setAccessToken (botId, accessToken) {
    await sqlPool.query(`UPDATE auth
                         SET access_token = ?
                         WHERE ID = ?`, [accessToken, botId])
  }
}

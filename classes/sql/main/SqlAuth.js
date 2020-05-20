"use strict"
const sqlPool = require('../Sql').pool

class SqlBot {
  constructor () {

  }

  static async getIdList () {
    let results = await sqlPool.query(`SELECT ID
                                       FROM auth
                                       WHERE enabled = b'1';`)
    return results.map(x => x["ID"])
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

module.exports = SqlBot

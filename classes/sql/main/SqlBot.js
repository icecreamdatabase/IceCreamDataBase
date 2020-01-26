"use strict"
const sqlPool = require('../Sql').pool

module.exports = class SqlBot {
  constructor () {

  }

  /**
   * Gets all data about all bots from the database
   * @return {{userId, username, token, clientID, chat: {isKnown, isVerified}, enabled}} botData Return object with all data
   */
  static async getBotData () {
    let results = await sqlPool.query("SELECT * FROM bots order by ID;")

    return results.map((row) => {
      let userId = row.ID || -1
      //get username through userIdLoginCache instead of storing in db
      let username = row.username || ""
      let token = row.password || ""
      let clientId = row.krakenClientId || ""
      let enabled = row.enabled || false
      let supinicAPIuser = row.supinicAPIuser || null
      let supinicAPIkey = row.supinicAPIkey || null

      return {userId, username, token, clientId, enabled, supinicAPIuser, supinicAPIkey}
    })
  }
}

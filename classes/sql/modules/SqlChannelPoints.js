"use strict"
const sqlPool = require('../Sql').pool

module.exports = class SqlChannelPoints {
  constructor () {

  }

  static async getChannelPointsData (botId, channelId) {
    let results = await sqlPool.query(`SELECT 
    FROM 
    WHERE bots.ID = botID
    AND channels.ID = channelID
    AND channels.enabled = B'1'
    AND bots.ID = ?`, [botId, channelId])
    //TODO

    let returnObj = {}
    results.forEach(x => {
      returnObj[x.channelID] = x
    })
    return returnObj
  }
}

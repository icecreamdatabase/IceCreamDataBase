"use strict"
const sqlPool = require('../Sql').pool
const SqlCommands = require('./SqlCommands')
const util = require('util')

module.exports = class SqlLocalCommands {
  constructor () {
  }

  static async getLocalCommands (botID) {
    let results = await sqlPool.query(`
      SELECT ID, channelID, command, response, userLevel, cooldown, timesUsed
      FROM localCommands
      WHERE enabled = b'1'
      AND isRegex = b'0'
      AND (botID = ?
        OR botID is NULL
          );`, botID)

    let resultsRegex = await sqlPool.query(`
      SELECT ID, channelID, command, response, userLevel, cooldown, timesUsed
      FROM localCommands
      WHERE enabled = b'1'
      AND isRegex = b'1'
      AND (botID = ?
        OR botID is NULL
          );`, botID)

    return SqlCommands.resultDataFromResults(results, resultsRegex)
  }

  static increaseTimesUsed (commandID) {
    sqlPool.query(`UPDATE localCommands 
      set timesUsed = timesUsed + 1 
      WHERE ID = ?;`, commandID)
  }
}

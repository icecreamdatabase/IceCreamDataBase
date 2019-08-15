"use strict"
const sqlPool = require('../Sql').pool
const SqlCommands = require('./SqlCommands')
const util = require('util')

module.exports = class SqlGlobalCommands {
  constructor () {

  }

  static async getGlobalCommandData () {
    let results = await sqlPool.query(`
        SELECT ID, command, response, userLevel, cooldown, timesUsed
        FROM globalCommands
        WHERE enabled = b'1'
          AND isRegex = b'0';`)

    let resultsRegex = await sqlPool.query(`
        SELECT ID, command, response, userLevel, cooldown, timesUsed
        FROM globalCommands
        WHERE enabled = b'1'
          AND isRegex = b'1';`)

    return SqlCommands.resultDataFromResults(results, resultsRegex)
  }

  static increaseTimesUsed (commandID) {
    sqlPool.query(`UPDATE globalCommands 
      set timesUsed = timesUsed + 1 
      WHERE ID = ?;`, commandID)
  }
}

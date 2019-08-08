"use strict"
const sqlPool = require('../Sql').pool
const util = require('util')


module.exports = class SqlSubNotifications {
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

    let returnData = {"normal": {}, "regex": {}}

    //TODO: is this even needed? ... only the regExp part is really .... I never access directly

    for (let index in results) {
      if (results.hasOwnProperty(index) && results[index].hasOwnProperty("command")) {
        returnData.normal[results[index].command] = results[index]
      }
    }

    for (let index in resultsRegex) {
      if (resultsRegex.hasOwnProperty(index) && resultsRegex[index].hasOwnProperty("command")) {
        resultsRegex[index].regExp = new RegExp(resultsRegex[index].command, "i")
        returnData.regex[resultsRegex[index].command] = resultsRegex[index]
      }
    }

    return returnData
  }
}

"use strict"
const sqlPool = require('../Sql').pool
const util = require('util')

module.exports = class SqlCommands {
  constructor () {
  }

  static resultDataFromResults (results, resultsRegex) {

    let returnData = {"normal": {}, "regex": {}}

    //TODO: is this even needed? ... only the regExp part is really .... I never access directly

    for (let index in results) {
      if (results.hasOwnProperty(index) && results[index].hasOwnProperty("command")) {
        results[index].command = results[index].command.toLowerCase()
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

  static async getCommandData () {
    let results = await sqlPool.query(`
        SELECT c.ID as 'commandID', 
               cG.ID as 'commandGroupID', 
               cG.name as 'commandGroupName', 
               cGL.channelID as 'channelID', 
               cGL.botID as 'botID',
               command, 
               response, 
               userLevel, 
               cooldown, 
               timesUsed
        FROM commands c, commandGroup cG, commandGroupLink cGL 
        WHERE c.isRegex = b'0'
          AND c.enabled = b'1'
          AND cG.enabled = b'1'
          AND cGL.enabled = b'1' 
          AND c.commandGroupID = cG.ID
        ;`)

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

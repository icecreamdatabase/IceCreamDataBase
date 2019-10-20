"use strict"
const sqlPool = require('../Sql').pool
const util = require('util')

module.exports = class SqlCommands {
  constructor () {
  }

  static resultDataFromResults (resultsNormal, resultsRegex) {

    let returnData = {"normal": {}, "regex": {}}

    for (let index in resultsNormal) {
      if (resultsNormal.hasOwnProperty(index) && resultsNormal[index].hasOwnProperty("command")) {
        resultsNormal[index].command = resultsNormal[index].command.toLowerCase()
        returnData.normal[resultsNormal[index].command] = resultsNormal[index]
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

  static async getCommandData (botID) {
    let results = await sqlPool.query(`
        SELECT distinct 
               c.ID as 'commandID', 
               cG.ID as 'commandGroupID', 
               cG.name as 'commandGroupName', 
               cGL.channelID as 'channelID', 
               isRegex,
               command, 
               response, 
               userLevel, 
               cooldown, 
               timesUsed
        FROM commands c, commandGroup cG, commandGroupLink cGL, connections con
        WHERE c.enabled = b'1'
          AND cG.enabled = b'1'
          AND cGL.enabled = b'1' 
          AND c.commandGroupID = cG.ID
          AND c.commandGroupID = cGL.commandGroupID
          AND cGL.channelID = con.channelID
          AND ( con.botID = ?
                AND (
                      cGL.botID = con.botID
                      OR cGL.botID IS NULL
                    )
              )
        ORDER BY cGL.botID desc, userLevel desc
        ;`, botID)

    let resultsNormal = results.filter((line) => { return !line.isRegex })
    let resultsRegex = results.filter((line) => { return line.isRegex })

    return SqlCommands.resultDataFromResults(resultsNormal, resultsRegex)
  }

  static increaseTimesUsed (commandID) {
    sqlPool.query(`UPDATE globalCommands 
      set timesUsed = timesUsed + 1 
      WHERE ID = ?;`, commandID)
  }
}

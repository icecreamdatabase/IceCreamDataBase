"use strict"
const sqlPool = require('../Sql').pool

class SqlCommands {
  constructor () {
  }

  /**
   * Makes commands lowercase and creates new RegEpx for all regex commands.
   * @param resultsNormal
   * @param resultsRegex
   * @returns {{normal: {ID, commandGroupID, commandGroupName, channelID, isRegex, command, response, userLevel, cooldown, timesUsed}[], regex: {ID, commandGroupID, commandGroupName, channelID, isRegex, command, response, userLevel, cooldown, timesUsed}[]}}
   */
  static resultDataFromResults (resultsNormal, resultsRegex) {
    for (let index in resultsNormal) {
      if (Object.prototype.hasOwnProperty.call(resultsNormal, index) && Object.prototype.hasOwnProperty.call(resultsNormal[index], "command")) {
        resultsNormal[index].command = resultsNormal[index].command.toLowerCase()
      }
    }
    for (let index in resultsRegex) {
      if (Object.prototype.hasOwnProperty.call(resultsRegex, index) && Object.prototype.hasOwnProperty.call(resultsRegex[index], "command")) {
        resultsRegex[index].regExp = new RegExp(resultsRegex[index].command, "i")
      }
    }
    return {"normal": resultsNormal, "regex": resultsRegex}
  }

  /**
   * Get all commandData for a bot
   * @param botID
   * @returns {Promise<{normal: {ID, commandGroupID, commandGroupName, channelID, isRegex, command, response, userLevel, cooldown, timesUsed}[], regex: {ID, commandGroupID, commandGroupName, channelID, isRegex, command, response, userLevel, cooldown, timesUsed}[]}>}
   */
  static async getCommandData (botID) {
    let results = await sqlPool.query(`
        SELECT distinct c.ID          as 'ID',
                        cG.ID         as 'commandGroupID',
                        cG.name       as 'commandGroupName',
                        cGL.channelID as 'channelID',
                        isRegex,
                        command,
                        response,
                        userLevel,
                        cooldown,
                        timesUsed
        FROM commands c,
             commandGroup cG,
             commandGroupLink cGL,
             connections con
        WHERE c.enabled = b'1'
          AND cG.enabled = b'1'
          AND cGL.enabled = b'1'
          AND c.commandGroupID = cG.ID
          AND c.commandGroupID = cGL.commandGroupID
          AND cGL.channelID = con.channelID
          AND (con.botID = ?
            AND (
                       cGL.botID = con.botID
                       OR cGL.botID IS NULL
                   )
            )
        ORDER BY cGL.botID desc, userLevel desc
        ;`, botID)

    let resultsNormal = results.filter((line) => {
      return !line.isRegex
    })
    let resultsRegex = results.filter((line) => {
      return line.isRegex
    })

    return SqlCommands.resultDataFromResults(resultsNormal, resultsRegex)
  }

  /**
   * Increase the times used counter by 1 for a command
   * @param commandID
   */
  static increaseTimesUsed (commandID) {
    sqlPool.query(`UPDATE commands
                   set timesUsed = timesUsed + 1
                   WHERE ID = ?;`, commandID)
  }
}

module.exports = SqlCommands

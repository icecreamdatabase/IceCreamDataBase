"use strict"
const util = require('util')
//CLASSES
const SqlLocalCommands = require('../../sql/modules/SqlLocalCommands')
const ApiFunctions = require('../../api/ApiFunctions.js')
const DiscordLog = require('./../DiscordLog')
const Helper = require('./Helper')

const UPDATE_COMMAND_INTERVAL = 15000 //ms

module.exports = class Local {
  // noinspection DuplicatedCode TODO: somehow remove the code duplication
  constructor (bot) {
    this.bot = bot
    this.commandDataNormal = {}
    this.commandDataRegex = {}
    this.lastCommandUsageObject = {}

    setInterval(this.updateCommandData.bind(this), UPDATE_COMMAND_INTERVAL)
    this.updateCommandData.bind(this)()
  }

  /**
   * Handles hardcoded commands
   * @param messageObj created in PrivMsg.createRawMessageObj
   * @returns {boolean} don't allow further commands
   */
  handle (messageObj) {

    // noinspection JSIgnoredPromiseFromCall
    this.handleNormal(messageObj)
    // noinspection JSIgnoredPromiseFromCall
    this.handleRegex(messageObj)

    return false
  }

  async handleNormal (messageObj) {
    let commandMatchIndex = Object.keys(this.commandDataNormal).find(key => messageObj.message.toLowerCase().startsWith(this.commandDataNormal[key].command))
    if (commandMatchIndex) {
      let commandMatch = this.commandDataNormal[commandMatchIndex]
      return this.sendGlobalMatch(messageObj, commandMatch)
    }
  }

  async handleRegex (messageObj) {
    let commandRegexMatchIndex = Object.keys(this.commandDataRegex).find(key => this.commandDataRegex[key].regExp.test(messageObj.message))
    if (commandRegexMatchIndex) {
      let commandRegexMatch = this.commandDataRegex[commandRegexMatchIndex]
      return this.sendGlobalMatch(messageObj, commandRegexMatch)
    }
  }

  sendGlobalMatch (messageObj, commandMatch) {
    if (commandMatch.channelID.toString() === messageObj.roomId.toString()) {
      if (commandMatch.userLevel <= messageObj.userLevel) {
        if (Helper.checkLastCommandUsage(commandMatch, this.lastCommandUsageObject, messageObj.roomId)) {

          Helper.fillParams(messageObj, commandMatch).then((response) => {
            this.bot.TwitchIRCConnection.queue.sayWithMsgObj(messageObj, response)
            if (commandMatch.hasOwnProperty("ID")) {
              SqlLocalCommands.increaseTimesUsed(commandMatch.ID)
            }
            if (commandMatch.hasOwnProperty("timesUsed")) {
              commandMatch.timesUsed++
            }
          })

          return true
        }
      }
    }
    return false
  }

  updateCommandData () {
    SqlLocalCommands.getLocalCommands(this.bot.TwitchIRCConnection.botData.userId).then((data) => {
      this.commandDataNormal = data.normal
      this.commandDataRegex = data.regex
    })
  }
}

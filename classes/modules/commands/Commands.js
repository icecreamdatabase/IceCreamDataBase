"use strict"
const util = require('util')
//CLASSES
const SqlLocalCommands = require('../../sql/modules/SqlCommands')
const ApiFunctions = require('../../api/ApiFunctions.js')
const DiscordLog = require('./../DiscordLog')
const Helper = require('./Helper')

const UPDATE_COMMAND_INTERVAL = 15000 //ms

module.exports = class Commands {
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
    let commandMatchIndices = Object.keys(this.commandDataNormal).filter(key => {
      return messageObj.roomId === this.commandDataNormal[key].channelID.toString()
          && messageObj.message.toLowerCase().startsWith(this.commandDataNormal[key].command)
    })
    let handledAnyCommand = false
    for (let commandMatchIndex of commandMatchIndices) {
      let commandMatch = this.commandDataNormal[commandMatchIndex]
      handledAnyCommand = this.sendGlobalMatch(messageObj, commandMatch) || handledAnyCommand
    }
    return handledAnyCommand
  }

  async handleRegex (messageObj) {
    let commandRegexMatchIndices = Object.keys(this.commandDataRegex).filter(key => {
      return messageObj.roomId === this.commandDataRegex[key].channelID.toString()
          && this.commandDataRegex[key].regExp.test(messageObj.message)
    })
    let handledAnyCommand = false
    for (let commandRegexMatchIndex of commandRegexMatchIndices) {
      let commandRegexMatch = this.commandDataRegex[commandRegexMatchIndex]
      handledAnyCommand = this.sendGlobalMatch(messageObj, commandRegexMatch) || handledAnyCommand
    }
    return handledAnyCommand
  }

  sendGlobalMatch (messageObj, commandMatch) {
    console.log("---- " + (commandMatch.commandID || -1))
    if (commandMatch.userLevel <= messageObj.userLevel) {
      console.log("^")
      if (Helper.checkLastCommandUsage(commandMatch, this.lastCommandUsageObject, messageObj.roomId, this.bot.channels[messageObj.roomId].minCooldown)) {

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
    return false
  }

  updateCommandData () {
    SqlLocalCommands.getCommandData(this.bot.TwitchIRCConnection.botData.userId).then((data) => {
      this.commandDataNormal = data.normal
      this.commandDataRegex = data.regex
    })
  }
}

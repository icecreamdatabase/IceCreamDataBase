"use strict"
const util = require('util')
//CLASSES
const SqlLocalCommands = require('../../sql/modules/SqlCommands')
const ApiFunctions = require('../../api/ApiFunctions.js')
const DiscordLog = require('./../DiscordLog')
const Helper = require('./Helper')
const UserLevels = require('./../../../ENUMS/UserLevels')

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
    if (messageObj.userLevel === UserLevels.BOTADMIN
      && messageObj.message.startsWith("<r ")) {

      this.updateCommandData.bind(this)()
      this.bot.TwitchIRCConnection.say(messageObj.channel, "Reloaded Commands FeelsGoodMan")
      return true
    }

    // noinspection JSIgnoredPromiseFromCall
    this.handleNormal(messageObj)
    // noinspection JSIgnoredPromiseFromCall
    this.handleRegex(messageObj)

    return false
  }

  async handleNormal (messageObj) {
    let commandMatchIndices = Object.keys(this.commandDataNormal).filter(key => {
      return messageObj.roomId === this.commandDataNormal[key].channelID.toString()
          && messageObj.message.toLowerCase().startsWith(this.commandDataNormal[key].command + " ")
    })
    return this.handleMatch(messageObj, commandMatchIndices.map(x => this.commandDataNormal[x]))
  }

  async handleRegex (messageObj) {
    let commandRegexMatchIndices = Object.keys(this.commandDataRegex).filter(key => {
      return messageObj.roomId === this.commandDataRegex[key].channelID.toString()
          && this.commandDataRegex[key].regExp.test(messageObj.message)
    })
    return this.handleMatch(messageObj, commandRegexMatchIndices.map(x => this.commandDataRegex[x]))
  }

  handleMatch (messageObj, commandArray) {
    if (commandArray.length > 0) {
      commandArray = commandArray.filter(x => x.userLevel <= messageObj.userLevel)
      if (commandArray.length > 0) {
        let commandMatch = commandArray[0]

        if (Helper.checkLastCommandUsage(commandMatch, this.lastCommandUsageObject, messageObj.roomId, this.bot.channels[messageObj.roomId].minCooldown, messageObj.userLevel)) {
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
    SqlLocalCommands.getCommandData(this.bot.TwitchIRCConnection.botData.userId).then((data) => {
      this.commandDataNormal = data.normal
      this.commandDataRegex = data.regex
    })
  }
}

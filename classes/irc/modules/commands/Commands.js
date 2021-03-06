"use strict"
//CLASSES
const SqlLocalCommands = require('../../../sql/modules/SqlCommands')
const Helper = require('./Helper')
const UserLevels = require('../../../../ENUMS/UserLevels')

const UPDATE_COMMAND_INTERVAL = 120000 // 2 minutes

class Commands {
  /**
   * @param {Bot} bot
   */
  constructor (bot) {
    this._bot = bot
    this.commandDataNormal = {}
    this.commandDataRegex = {}
    this.lastCommandUsageObject = {}

    setInterval(this.updateCommandData.bind(this), UPDATE_COMMAND_INTERVAL)
    this.updateCommandData.bind(this)()
    this.bot.on(this.bot.refreshEventName, this.updateCommandData.bind(this))
  }

  /**
   * @return {Bot}
   */
  get bot () {
    return this._bot
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

  /**
   * Check if the message starts with any of the commands
   * @param messageObj created in PrivMsg.createRawMessageObj
   * @returns {Promise<boolean>} Has handled a message
   */
  async handleNormal (messageObj) {
    let commandMatchIndices = Object.keys(this.commandDataNormal).filter(key => {
      return messageObj.roomId === this.commandDataNormal[key].channelID.toString()
        && messageObj.message.toLowerCase().startsWith(this.commandDataNormal[key].command + " ")
    })
    return this.handleMatch(messageObj, commandMatchIndices.map(x => this.commandDataNormal[x]))
  }

  /**
   * Test the message for any of the regex commands
   * @param messageObj created in PrivMsg.createRawMessageObj
   * @returns {Promise<boolean>} Has handled a message
   */
  async handleRegex (messageObj) {
    let commandRegexMatchIndices = Object.keys(this.commandDataRegex).filter(key => {
      return messageObj.roomId === this.commandDataRegex[key].channelID.toString()
        && this.commandDataRegex[key].regExp.test(messageObj.message)
    })
    return this.handleMatch(messageObj, commandRegexMatchIndices.map(x => this.commandDataRegex[x]))
  }

  /**
   * Handles an array of command objects.
   * Filters out too low userlevel and then handles the command with the lowest ID
   * @param messageObj created in PrivMsg.createRawMessageObj
   * @param commandArray Command Array
   * @returns {boolean} Has handled a message
   */
  handleMatch (messageObj, commandArray) {
    if (commandArray.length > 0) {
      commandArray = commandArray.filter(x => x.userLevel <= messageObj.userLevel)
      if (commandArray.length > 0) {
        // noinspection LoopStatementThatDoesntLoopJS
        for (let commandMatch of commandArray) {
          if (Helper.checkLastCommandUsage(commandMatch, this.lastCommandUsageObject, messageObj.roomId, this.bot.irc.channels[messageObj.roomId].minCooldown, messageObj.userLevel)) {
            this.bot.irc.privMsg.helper.handleParameter(messageObj, commandMatch).then((response) => {
              this.bot.irc.ircConnector.sayWithMsgObj(messageObj, response)
              if (Object.prototype.hasOwnProperty.call(commandMatch, "ID")) {
                SqlLocalCommands.increaseTimesUsed(commandMatch.ID)
              }
              if (Object.prototype.hasOwnProperty.call(commandMatch, "timesUsed")) {
                commandMatch.timesUsed++
              }
            })
            return true
          }
          return false //TODO: This is a quick fix. Needs a database variable if a command allows other commands to trigger if it fails.
        }
      }
    }
    return false
  }

  /**
   * Update Commands.commandDataNormal and Commands.commandDataRegex from the database
   */
  updateCommandData () {
    SqlLocalCommands.getCommandData(this.bot.userId).then((data) => {
      this.commandDataNormal = data.normal
      this.commandDataRegex = data.regex
    })
  }
}

module.exports = Commands

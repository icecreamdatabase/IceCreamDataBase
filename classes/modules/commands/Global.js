"use strict"
const util = require('util')
//CLASSES
const SqlGlobalCommands = require('../../sql/modules/SqlGlobalCommands')
const ApiFunctions = require('../../api/ApiFunctions.js')
const DiscordLog = require('./../DiscordLog')
const Helper = require('./Helper')


const UPDATE_COMMAND_INTERVAL = 15000 //ms

module.exports = class PrivMsg {
  constructor (bot) {
    this.bot = bot
    this.commandDataNormal = {}
    this.commandDataRegex = {}

    setInterval(this.updateCommandData.bind(this), UPDATE_COMMAND_INTERVAL)
    this.updateCommandData.bind(this)()
  }

  /**
   * Handles hardcoded commands
   * @param messageObj created in PrivMsg.createRawMessageObj
   * @returns {boolean} don't allow further commands
   */
  handle (messageObj) {

    //normal
    let commandMatchIndex = Object.keys(this.commandDataNormal).find(key => messageObj.message.startsWith(this.commandDataNormal[key].command))
    if (commandMatchIndex) {
      let commandMatch = this.commandDataNormal[commandMatchIndex]
      this.bot.TwitchIRCConnection.queue.sayWithBoth(messageObj.roomId, messageObj.channel,
        commandMatch.response, messageObj.userId)
      return true
    }

    //regex
    //TODO: use regExp.exec(string) instead?
    let commandRegexMatchIndex = Object.keys(this.commandDataRegex).find(key => messageObj.message.match(this.commandDataRegex[key].regExp))
    if (commandRegexMatchIndex) {
      let commandRegexMatch = this.commandDataRegex[commandRegexMatchIndex]
      this.bot.TwitchIRCConnection.queue.sayWithBoth(messageObj.roomId, messageObj.channel,
        commandRegexMatch.response, messageObj.userId)
      return true
    }

    return false
  }

  updateCommandData () {
    SqlGlobalCommands.getGlobalCommandData().then((data) => {
      this.commandDataNormal = data.normal
      this.commandDataRegex = data.regex
    })
  }
}

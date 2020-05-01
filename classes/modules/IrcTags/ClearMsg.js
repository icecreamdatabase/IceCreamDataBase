"use strict"
const util = require('util')
//CLASSES
const Logger = require('../../helper/Logger')
const DiscordLog = require('../DiscordLog')

// 5 minutes
const CLEAR_OLD_ENTIRES_INTERVAL = 30000
const KEEP_OLD_ENTRY_AMOUNT = 100
let deletedMsgIds = []

module.exports = class ClearMsg {
  constructor (bot) {
    this.bot = bot

    this.bot.irc.TwitchIRCConnection.on('CLEARMSG', this.onClearMsg.bind(this))

    setInterval(ClearMsg.clearOldEntries, CLEAR_OLD_ENTIRES_INTERVAL)
  }

  /**
   * Method from bot.TwitchIRCconnection event emitter 'CLEARMSG'.
   * @param clearMsgObj raw object from TwitchIRCconnection registerEvents
   * @returns {Promise<void>}
   */
  async onClearMsg (clearMsgObj) {
    deletedMsgIds.push(clearMsgObj.tags["target-msg-id"])
  }

  /**
   * Check if a user was timed out before in a channel
   * @returns {boolean} Was user timed out
   * @param msgId UUID of message
   */
  static wasDeleted (msgId) {
    return deletedMsgIds.includes(msgId)
  }

  /**
   * Clear the deletedMsgIds array but keep the last KEEP_OLD_ENTRY_AMOUNT of entries
   */
  static clearOldEntries () {
    deletedMsgIds = deletedMsgIds.slice(deletedMsgIds.length - KEEP_OLD_ENTRY_AMOUNT)
  }
}


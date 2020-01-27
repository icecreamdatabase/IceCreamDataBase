"use strict"
const util = require('util')
//CLASSES
const SqlCounters = require('../../sql/modules/SqlCounters')
const DiscordLog = require('./../DiscordLog')
const Helper = require('./Helper')
const UserLevels = require('./../../../ENUMS/UserLevels')

const counterRegExp = new RegExp(/\${counter(Inc|Get)?=([^}]+)}/, 'i')
const counterInc = "Inc"

module.exports = class Counters {
  constructor () {
  }

  /**
   * Handle and replace counter related parameters
   * @param msgObj created in PrivMsg.createRawMessageObj
   * @param message input string
   * @returns {Promise<string>}
   */
  static async replaceParameter (msgObj, message) {

    if (message.includes("${counter")) {
      if (counterRegExp.test(message)) {
        let match = message.match(counterRegExp)

        if (match[1] === counterInc) {
          await SqlCounters.increaseCounter(match[2])
        }
        let response = await SqlCounters.getCounter(match[2])
        message = message.replace(new RegExp(counterRegExp, 'g'), response)
      }
    }
    return message
  }

}

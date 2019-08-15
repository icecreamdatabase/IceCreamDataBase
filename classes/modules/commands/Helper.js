"use strict"
const https = require('https')
const util = require('util')
//CLASSES
const ApiFunctions = require('../../api/ApiFunctions.js')
const DiscordLog = require('./../DiscordLog')

const apiRegExp = new RegExp("\\${api=(.*?)}", 'i')

module.exports = class Helper {
  constructor () {

  }

  static splitMessageToParts (message) {

  }

  static async fillParams (msgObj, commandObj) {
    let message = commandObj.response
    //message = Helper.firstParameterOrUser(msgObj, message)
    message = Helper.user(msgObj, message)
    message = Helper.channel(msgObj, message)
    message = Helper.uptime(msgObj, message)
    if (commandObj.hasOwnProperty("timesUsed")) {
      message = Helper.timesUsed(msgObj, message, commandObj.timesUsed)
    }
    message = await Helper.api(msgObj, message)

    return message
  }

  static firstParameterOrUser (msgObj, message) {
    if (message.includes("${p1||user}")) { //TODO
      let replacement = data.userstate.username
      let firstParameter = data.input.firstParameter
      if (firstParameter !== null) {
        if (data.input.firstParameter.startsWith("@")) {
          firstParameter = firstParameter.substring(1)
        }
        if (isUserInChannel(firstParameter, data.channel)) {
          replacement = firstParameter
        }
      }
      return message.replace(new RegExp("\\${p1\\|\\|user}", 'g'), replacement)
    }
    return message
  }

  static user (msgObj, message) {
    if (message.includes("${user}")) {
      return message.replace(new RegExp("\\${user}", 'g'), msgObj.username)
    }
    return message
  }

  static channel (msgObj, message) {
    if (message.includes("${channel}")) {
      return message.replace(new RegExp("\\${channel}", 'g'), msgObj.channel)
    }
    return message
  }

  static uptime (msgObj, message) {
    if (message.includes("${uptime}")) {
      return message.replace(new RegExp("\\${uptime}", 'g'), this.msToDDHHMMSS(process.uptime()))
    }
    return message
  }

  static timesUsed (msgObj, message, timesUsed) {
    if (message.includes("${timesUsed}")) {
      return message.replace(new RegExp("\\${timesUsed}", 'g'), timesUsed)
    }
    return message
  }

  static async api (msgObj, message) {
    if (message.includes("${api") && apiRegExp.test(message)) {
      let apiUrl = message.match(apiRegExp)[1]

      return new Promise((resolve, reject) => {
        //Duplicate default request object
        let request = new URL(apiUrl)

        let req = https.request(request, (res) => {
          res.setEncoding('utf8')
          res.on('data', (response) => {
            message = message.replace(new RegExp(apiRegExp, 'g'), response)
            resolve(message)
          })
        })
        req.on('error', (err) => {
          message = message.replace(new RegExp(apiRegExp, 'g'), err)
          reject(message)
        })
        req.write('')
        req.end()
      })
    } else {
      return Promise.resolve(message)
    }
  }



  static msToDDHHMMSS (ms) {
    let secNum = parseInt(ms + "", 10) // don't forget the second param
    let days = Math.floor(secNum / 86400)
    let hours = Math.floor((secNum - (days * 86400)) / 3600)
    let minutes = Math.floor((secNum - (days * 86400) - (hours * 3600)) / 60)
    let seconds = secNum - (days * 86400) - (hours * 3600) - (minutes * 60)

    /*
    if (hours < 10) { hours = "0" + hours }
    if (minutes < 10) { minutes = "0" + minutes }
    if (seconds < 10) { seconds = "0" + seconds }
    */

    let time = seconds + 's'
    if (minutes > 0 || hours > 0) {
      time = minutes + 'm ' + time
    }
    if (hours > 0) {
      time = hours + 'h ' + time
    }
    if (days > 0) {
      time = days + 'd ' + time
    }
    return time
  }
}

"use strict"
const util = require('util')
//CLASSES
const Logger = require('./Logger')
const TimeConversion = require("../../ENUMS/TimeConversion")

module.exports = class TimeConversionHelper {
  constructor () {

  }

  /**
   * Converts seconds to formatted YY MM DD HH MM SS string
   * @param inputSeconds
   * @param fullUnit
   * @returns {string}
   */
  static secondsToYYMMDDHHMMSS (inputSeconds, fullUnit = false) {
    let secNum = parseInt(inputSeconds + "", 10) // don't forget the second param
    /* eslint-disable no-multi-spaces */
    let years = Math.floor(secNum / TimeConversion.YEARTOSECONDS)
    let months = Math.floor((secNum - years * TimeConversion.YEARTOSECONDS) / TimeConversion.MONTHTOSECONDS)
    let days = Math.floor((secNum - years * TimeConversion.YEARTOSECONDS - months * TimeConversion.MONTHTOSECONDS) / TimeConversion.DAYTOSECONDS)
    let hours = Math.floor((secNum - years * TimeConversion.YEARTOSECONDS - months * TimeConversion.MONTHTOSECONDS - days * TimeConversion.DAYTOSECONDS) / TimeConversion.HOURTOSECONDS)
    let minutes = Math.floor((secNum - years * TimeConversion.YEARTOSECONDS - months * TimeConversion.MONTHTOSECONDS - days * TimeConversion.DAYTOSECONDS - hours * TimeConversion.HOURTOSECONDS) / TimeConversion.MINUTETOSECONDS)
    let seconds = Math.floor(secNum - years * TimeConversion.YEARTOSECONDS - months * TimeConversion.MONTHTOSECONDS - days * TimeConversion.DAYTOSECONDS - hours * TimeConversion.HOURTOSECONDS - minutes * TimeConversion.MINUTETOSECONDS)
    /* eslint-enable no-multi-spaces */

    return this.valuesToString(fullUnit, seconds, minutes, hours, days, months, years)
  }

  /**
   * Converts seconds to formatted HH MM SS string
   * @param inputSeconds
   * @param fullUnit
   * @returns {string}
   */
  static secondsToHHMMSS (inputSeconds, fullUnit = false) {
    let secNum = parseInt(inputSeconds + "", 10) // don't forget the second param
    /* eslint-disable no-multi-spaces */
    let hours = Math.floor(secNum / TimeConversion.HOURTOSECONDS)
    let minutes = Math.floor((secNum - hours * TimeConversion.HOURTOSECONDS) / TimeConversion.MINUTETOSECONDS)
    let seconds = Math.floor(secNum - hours * TimeConversion.HOURTOSECONDS - minutes * TimeConversion.MINUTETOSECONDS)
    /* eslint-enable no-multi-spaces */

    return this.valuesToString(fullUnit, seconds, minutes, hours)
  }

  /**
   * converts seconds to formatted HH MM string
   * @param inputSeconds
   * @param fullUnit
   * @returns {string}
   */
  static secondsToHHMM (inputSeconds, fullUnit = false) {
    let secNum = parseInt(inputSeconds + "", 10) // don't forget the second param
    /* eslint-disable no-multi-spaces */
    let hours = Math.floor(secNum / TimeConversion.HOURTOSECONDS)
    let minutes = Math.floor((secNum - hours * TimeConversion.HOURTOSECONDS) / TimeConversion.MINUTETOSECONDS)
    let seconds = Math.floor(secNum - hours * TimeConversion.HOURTOSECONDS - minutes * TimeConversion.MINUTETOSECONDS)
    /* eslint-enable no-multi-spaces */

    return this.valuesToString(fullUnit, 0, minutes, hours)
  }

  /**
   * Creates a nicely formatted string for things like uptime
   * @param fullUnit E.g. hours instead of h
   * @param seconds
   * @param minutes
   * @param hours
   * @param days
   * @param months
   * @param years
   * @returns {string}
   */
  static valuesToString (fullUnit = false, seconds = 0, minutes = 0, hours = 0, days = 0, months = 0, years = 0) {
    let time = ""
    if (seconds > 0) {
      time = seconds + this.unitSecond(fullUnit, seconds > 1) + " " + time
    }
    if (minutes > 0 || hours > 0) {
      time = minutes + this.unitMinute(fullUnit, minutes > 1) + " " + time
    }
    if (hours > 0) {
      time = hours + this.unitHour(fullUnit, hours > 1) + " " + time
    }
    if (days > 0) {
      time = days + this.unitDay(fullUnit, days > 1) + " " + time
    }
    if (months > 0) {
      time = months + this.unitMonth(fullUnit, months > 1) + " " + time
    }
    if (years > 0) {
      time = years + this.unitYear(fullUnit, years > 1) + " " + time
    }
    return time
  }

  static unitSecond (fullUnit = false, plural = false) {
    return fullUnit ? " second" + (plural ? "s" : "") : "s"
  }

  static unitMinute (fullUnit = false, plural = false) {
    return fullUnit ? " minute" + (plural ? "s" : "") : "m"
  }

  static unitHour (fullUnit = false, plural = false) {
    return fullUnit ? " hour" + (plural ? "s" : "") : "h"
  }

  static unitDay (fullUnit = false, plural = false) {
    return fullUnit ? " day" + (plural ? "s" : "") : "d"
  }

  static unitMonth (fullUnit = false, plural = false) {
    return fullUnit ? " month" + (plural ? "s" : "") : "m"
  }

  static unitYear (fullUnit = false, plural = false) {
    return fullUnit ? " year" + (plural ? "s" : "") : "y"
  }

  /*
  if (hours < 10) { hours = "0" + hours }
  if (minutes < 10) { minutes = "0" + minutes }
  if (seconds < 10) { seconds = "0" + seconds }
  */
}

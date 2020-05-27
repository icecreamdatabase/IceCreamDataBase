"use strict"

class Logger {
  /**
   * @private
   */
  constructor () {
  }

  static error (message) {
    console.error(`${this.getTimestamp()} ${message}`)
  }

  static warn (message) {
    console.warn(`${this.getTimestamp()} ${message}`)
  }

  static info (message) {
    console.info(`${this.getTimestamp()} ${message}`)
  }

  static log (message) {
    console.log(`${this.getTimestamp()} ${message}`)
  }

  static debug (message) {
    console.debug(`${this.getTimestamp()} ${message}`)
  }

  static trace (message) {
    console.trace(`${this.getTimestamp()} ${message}`)
  }

  static getTimestamp () {
    return `[${new Date().toLocaleTimeString("de-DE", { hour12: false })}]`
  }
}

module.exports = Logger

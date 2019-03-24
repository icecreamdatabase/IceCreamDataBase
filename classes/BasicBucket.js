"use strict"
const Logger = require('consola')

const TICKET_RETURN_TIMEOUT = 30000

module.exports = class BasicBucket {
  constructor (limit) {
    this.usedTickets = 0
    this._limit = limit || 30
  }

  set limit (limit) {
    this._limit = limit
  }

  get limit () {
    return this._limit
  }

  get ticketsRemaining () {
    return Object.keys(this.bucket).length
  }

  takeTicket () {
    if (this.usedTickets < this.limit) {
      this.usedTickets++
      setTimeout(this.returnTicket.bind(this), TICKET_RETURN_TIMEOUT)
      return true
    } else {
      return false
    }
  }
}

/**
 * Returns one used ticket and therefor reduces the usedTickets amount by one.
 * don't forget to bind this. E.g.: `this.returnTicket.bind(this)`
 */
function returnTicket () {
  if (this.usedTickets > 0) {
    this.usedTickets--
  } else {
    Logger.error("Ticket returned when there where none given out!")
  }
}

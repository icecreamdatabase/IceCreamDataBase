"use strict"
const Logger = require('../helper/Logger')
const util = require('util')
const ApiKraken = require('./Kraken')
const ApiHelix = require('./Helix')
const ApiOther = require('./Other')

let apiFallbackObject

class Api {
  constructor (bot) {
    this.kraken = new ApiKraken(bot)
    this.helix = new ApiHelix(bot)
    this.other = ApiOther

    if (!apiFallbackObject) {
      apiFallbackObject = this
    }
  }

  static get apiFallbackObject () {
    return apiFallbackObject
  }
}

module.exports = Api

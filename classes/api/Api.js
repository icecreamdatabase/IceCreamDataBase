"use strict"
const Logger = require('../helper/Logger')
const util = require('util')
const ApiKraken = require('./Kraken')
const ApiHelix = require('./Kraken')
const ApiOther = require('./Kraken')

module.exports = class Api {
  constructor (bot) {
    this.kraken = new ApiKraken(bot)
    this.helix = new ApiHelix(bot)
    this.other = ApiOther
  }
}

"use strict"
const ApiKraken = require('./Kraken')
const ApiHelix = require('./Helix')
const ApiOther = require('./Other')

let apiFallbackObject

class Api {
  /**
   * @param {Bot} bot
   */
  constructor (bot) {
    this._kraken = new ApiKraken(bot)
    this._helix = new ApiHelix(bot)
    this._other = new ApiOther(bot)

    if (!apiFallbackObject) {
      apiFallbackObject = this
    }
  }

  /**
   * @return {Kraken}
   */
  get kraken () {
    return this._kraken
  }

  /**
   * @return {Helix}
   */
  get helix () {
    return this._helix
  }

  /**
   * @return {Other}
   */
  get other () {
    return this._other
  }

  /**
   * @return {Api}
   */
  static get apiFallbackObject () {
    return apiFallbackObject
  }
}

module.exports = Api

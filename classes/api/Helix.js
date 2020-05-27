"use strict"
const axios = require('axios')

//TODO: use custom axois instances https://www.npmjs.com/package/axios

class Helix {
  /**
   * @param {Bot} bot
   */
  constructor (bot) {
    this._bot = bot
  }

  /**
   * @return {Bot}
   */
  get bot () {
    return this._bot
  }

  async request (pathAppend, method = 'GET') {
    try {
      let result = await axios({
        url: `https://api.twitch.tv/helix/${pathAppend}`,
        method: method,
        headers: {
          'Accept': 'application/vnd.twitchtv.v5+json',
          'Client-ID': this.bot.authentication.clientId,
          'Authorization': this.bot.authentication.accessToken,
        }
      })
      return result.data
    } catch (e) {
      //ignore
    }
  }

}

module.exports = Helix

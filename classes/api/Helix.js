"use strict"
const Logger = require('../helper/Logger')
const axios = require('axios')
const util = require('util')
const configOption = require('../../config')
const TimeConversion = require("../../ENUMS/TimeConversion")

const BASEOBJECT_HELIX = {
  host: "api.twitch.tv",
  path: "/helix/",
  method: 'GET',
  headers: {}
}

//TODO: use custom axois instances https://www.npmjs.com/package/axios

module.exports = class Helix {
  constructor (bot) {
    this.bot = bot
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

    } catch (e) {

    }
  }

}

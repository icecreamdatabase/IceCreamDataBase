"use strict"
// noinspection JSUnresolvedVariable
const https = require('follow-redirects').https

const TWITCH_API_KRAKEN = {
  host: "api.twitch.tv",
  path: "/kraken/",
  method: 'GET',
  headers: {
    'Accept': 'application/vnd.twitchtv.v5+json',
  }
}

const TWITCH_API_HELIX = {
  host: "api.twitch.tv",
  path: "/helix/",
  method: 'GET',
  headers: {}
}


module.exports = class ApiFunctions {
  constructor () {

  }

  /**
   * Creates a basic https request which follows redirects
   * @param request https requestObj or new URL(url)
   * @returns {Promise<string|*>}
   */
  static async request (request) {
    return new Promise((resolve, reject) => {
      let req = https.request(request, (res) => {
        res.setEncoding('utf8')
        res.on('data', (response) => {
          resolve(response)
        })
      })
      req.on('error', (err) => {
        reject(err)
      })
      req.write('')
      req.end()
    })
  }

  /**
   * Creates an API request towards twitch API version 5 (kraken)
   * It's recommended to use await to call this function
   * @param clientID
   * @param pathAppend path after *api.twitch.tv/kraken/'
   * @returns {Promise<object>} return from the API parsed from string to json
   */
  static async apiRequestKraken (clientID, pathAppend) {
    return await this.apiRequestJson(clientID, TWITCH_API_KRAKEN, pathAppend)
  }

  /**
   * Creates an API request towards twitch API version ? (helix)
   * It's recommended to use await to call this function
   * @param clientID
   * @param pathAppend path after *api.twitch.tv/helix/'
   * @returns {Promise<object>} return from the API parsed from string to json
   */
  static async apiRequestHelix (clientID, pathAppend) {
    return await this.apiRequestJson(clientID, TWITCH_API_HELIX, pathAppend)
  }

  /**
   * Create an https request
   * @param clientID
   * @param requestBase Base object to clone to use for the request
   * @param pathAppend path appended to requestBase.path
   * @returns {Promise<*>} return body parsed to json
   */
  static async apiRequestJson (clientID, requestBase, pathAppend) {
    return JSON.parse(await this.apiRequestString(clientID, requestBase, pathAppend))
  }

  /**
   * Create an https request
   * @param clientID
   * @param requestBase Base object to clone to use for the request
   * @param pathAppend path appended to requestBase.path
   * @returns {Promise<*>} return body as string
   */
  static async apiRequestString (clientID, requestBase, pathAppend) {
    //Duplicate default request object
    let request = Object.assign({}, requestBase)
    request.headers["Client-ID"] = clientID
    request.path += pathAppend
    return await this.request(request)
  }

  /**
   * receive login name from a single userid
   * @param clientID
   * @param userId userid to check
   * @returns {Promise<string>} login name as string inside a promise
   */
  static async loginFromUserId (clientID, userId) {
    let response = await this.userInfo(clientID, userId)
    if (response.hasOwnProperty('login')) {
      return response['login']
    } else {
      return ""
    }
  }

  /**
   * Returns the userId from a single login
   * @param clientID
   * @param username login to check
   * @returns {Promise<string>} userId as string
   */
  static async userIdFromLogin (clientID, username) {
    let response = this.userInfosFromLogins(clientID, [username])

    if (response.total === 0) {
      return '-1'
    } else {
      return response.users[0].id
    }
  }

  /**
   * Return the userInfo from an array of usernames
   *
   * @param clientID
   * @param  {Array<String>} usernames The names to check for
   * @return {Object} return from users api
   */
  static async userInfosFromLogins (clientID, usernames) {
    usernames.map((entry) => {
      return entry.replace(/#/, '')
    })
    return await this.apiRequestKraken(clientID, 'users?login=' + usernames.join(','))
  }

  /**
   * Users object returned by
   * kraken/users/XXXXXX/chat and
   * kraken/users/XXXXXX/chat/channels/YYYYYY
   *
   * @typedef {Object} Users
   * @property {string} id
   * @property {string} login
   * @property {string} displayName
   * @property {string} color
   * @property {boolean} isVerifiedBot
   * @property {boolean} isKnownBot
   * @property {Object} Badges
   */

  /**
   * Accesses the kraken/users/:userID/chat
   * Example: https://api.twitch.tv/kraken/users/38949074/chat?api_version=5
   * Example return:
   * {
   *   "id":"38949074",
   *   "login":"icdb",
   *   "displayName":"icdb",
   *   "color":"#00FF00",
   *   "isVerifiedBot":false,
   *   "isKnownBot":false,
   *   "badges":[]
   * }
   * @param clientID
   * @param  {String|int} userId The userID to check for
   * @return {Users} [description]
   */
  static async userInfo (clientID, userId) {
    return await this.apiRequestKraken(clientID, 'users/' + userId + '/chat')
  }

  /**
   * Accesses the kraken/users/:userID/chat/channels/:roomID
   * Example: https://api.twitch.tv/kraken/users/38949074/chat/channels/38949074?api_version=5
   * Example return:
   * {
   *   "id":"38949074",
   *   "login":"icdb",
   *   "displayName":"icdb",
   *   "color":"#00FF00",
   *   "isVerifiedBot":false,
   *   "isKnownBot":false,
   *   "badges":[
   *     {
   *       "id":"moderator",
   *       "version":"1"
   *     }
   *   ]
   * }
   * @param clientID
   * @param  {String|int} userId The userID to check for
   * @param  {String|int} roomId The roomID to check in
   * @return {Users} [description]
   */
  static async userInChannelInfo (clientID, userId, roomId) {
    return await this.apiRequestKraken(clientID, 'users/' + userId + '/chat/channels/' + roomId)
  }
}

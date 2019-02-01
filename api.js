const Logger = require('consola')

module.exports = {
  userIdFromLogin,
  userInfo,
  userInChannelInfo,
  userStatus
}

/**
 * Return the UserID from a username
 * Example: https://api.twitch.tv/kraken/users?api_version=5&login=icdb
 * @param  {TwitchJs bot} bot    TwitchJs bot
 * @param  {String} username The name to check for
 * @return {String}        userID or -1 when no user found
 */
async function userIdFromLogin (bot, username) {
  return new Promise((resolve, reject) => {
    bot.api.get('users', {'version': 'kraken', search: {'api_version': '5', 'client_id': bot.chat.botData.clientID, 'login': username}}).then(response => {
      if (response.total === 0) {
        resolve("-1")
      } else {
        resolve(response.users[0].id)
      }
    }).catch((err) => {
      reject(err)
    })
  })
}

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
 * @param  {TwitchJs bot} bot    TwitchJs bot
 * @param  {String or number} userId The userID to check for
 * @return {Object}        [description]
 */
async function userInfo (bot, userId) {
  return new Promise((resolve, reject) => {
    bot.api.get('users/' + userId + '/chat', {'version': 'kraken', search: {'api_version': '5', 'client_id': bot.chat.botData.clientID}}).then(response => {
      resolve(response)
    }).catch((err) => {
      reject(err)
    })
  })
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
 * @param  {TwitchJs bot} bot    TwitchJs bot
 * @param  {String or number} userId The userID to check for
 * @param  {String or number} userId The roomID to check in
 * @return {Object}        [description]
 */
async function userInChannelInfo (bot, userId, roomId) {
  return new Promise((resolve, reject) => {
    bot.api.get('users/' + userId + '/chat/channels/' + roomId, {'version': 'kraken', search: {'api_version': '5', 'client_id': bot.chat.botData.clientID}}).then(response => {
      resolve(response)
    }).catch((err) => {
      reject(err)
    })
  })
}

async function userStatus (bot, userId, roomId) {
  let userData = await userInChannelInfo(bot, userId, roomId)
  let isBroadcaster = false
  let isMod = false
  let isVip = false

  for (badge of userData.badges) {
    if (badge.id === "broadcaster") {
      isBroadcaster = true
    }
    if (badge.id === "moderator") {
      isMod = true
    }
    if (badge.id === "vip") {
      isVip = true
    }
  }

  let isAny = isBroadcaster || isMod || isVip
  return {isBroadcaster, isMod, isVip, isAny}
}

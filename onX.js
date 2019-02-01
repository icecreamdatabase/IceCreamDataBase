const Logger = require('consola')
const Api = require('./api.js')

module.exports = {
  onChat,
  onSubscription,
  onResubscription,
  onSubscriptionGift,
  onSubscriptionGiftCommunity,
  onGiftPaidUpgrade,
  onAnonGiftPaidUpgrade,
  onRitual,
  onRaid,
}

async function onChat (msg) {
  Logger.info(msg.channel + " " + msg.username + ": " + msg.message)
  if (msg.message.startsWith("<")) {
    this.say(msg.channel, ">")
    Logger.info("dbID: " + this.botData.dbID)

    let clientId = await Api.userIdFromLogin(bots[this.botData.dbID], msg.username)
    Logger.info("clientId: " + clientId)

    let userInfo = await Api.userInfo(bots[this.botData.dbID], msg.tags.userId)
    Logger.info("userInfo: " + JSON.stringify(userInfo))

    let userInChannelInfo = await Api.userInChannelInfo(bots[this.botData.dbID], msg.tags.userId, msg.tags.roomId)
    Logger.info("userInChannelInfo: " + JSON.stringify(userInChannelInfo))

    //this.say("> " + userInfo)

  }
}

async function onSubscription (msg) {}
async function onResubscription (msg) {}
async function onSubscriptionGift (msg) {}
async function onSubscriptionGiftCommunity (msg) {}
async function onGiftPaidUpgrade (msg) {}
async function onAnonGiftPaidUpgrade (msg) {}
async function onRitual (msg) {}
async function onRaid (msg) {}

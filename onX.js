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

  if (msg.message.startsWith("<sd") && msg.tags.userId === "38949074") {
    this.sayQueue(this, msg.channel, "Shutting down FeelsBadMan")
    setTimeout(function () {
      for (index in bots) {
        bots[index].chat.disconnect()
        Logger.info("Disconnected bot: " + bots[index].chat.botData.username)
      }
      setTimeout(function () {
        process.exit(0)
      }, 200)
    }, 1300)
  }

  if (msg.message.startsWith("<")) {
    //this.say(msg.channel, ">")
    //this.say(msg.channel, "userdata: " + JSON.stringify(await Api.userStatus(bots[this.botData.dbID], msg.tags.userId, msg.tags.roomId)))

    this.sayQueue(this, msg.channel, ">")
    this.sayQueue(this, msg.channel, ">")
    this.sayQueue(this, msg.channel, ">")
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

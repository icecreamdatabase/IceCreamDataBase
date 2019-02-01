const Logger = require('consola')

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

function onChat (msg) {
  Logger.info(msg.channel + " " + msg.username + ": " + msg.message)
  if (msg.message.startsWith("<")) {
    this.say(msg.channel, ">")
    Logger.info("dbID: " + this.botData.dbID)
    /*
    bots[this.botData.dbID].api.get('users/' + msg.tags.userId + '/chat', {'version': 'kraken', search: {'client_id': this.botData.clientID}}).then(response => {
      Logger.info(response)
    }).catch((err) => {
      Logger.error(err)
    })
    */
  }
}

function onSubscription (msg) {}
function onResubscription (msg) {}
function onSubscriptionGift (msg) {}
function onSubscriptionGiftCommunity (msg) {}
function onGiftPaidUpgrade (msg) {}
function onAnonGiftPaidUpgrade (msg) {}
function onRitual (msg) {}
function onRaid (msg) {}

const TwitchJs = require('twitch-js').default
const Mysql = require('./sql.js')
const OnX = require('./onX.js')
const Logger = require('consola')

const channel = 'icdb'

global.bots = {}
const logSetting = {log: { level: 2 }}
/*
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  verbose: 3,
  debug: 4,
  silly: 5
};
*/

/*
global.VERSION.REVISION = require('child_process')
  .execSync('git rev-parse HEAD')
  .toString().trim()
*/

async function botSetup () {
  await Mysql.getBotData().then(async (allBotData) => {
    for (let botData of allBotData) {
      if (botData.enabled) {
        Logger.info("Setting up bot: " + botData.username + " (" + botData.dbID + ")")
        //add log settings
        Object.assign(botData, logSetting)
        //create bot
        let {api, chat, chatConstants} = new TwitchJs(botData)
        //save bot to object
        bots[botData.dbID] = {api, chat, chatConstants}
        //add botData
        bots[botData.dbID].chat.botData = botData
        //create empty channel array
        bots[botData.dbID].chat.channels = []
        //Connecting the bot to the twich servers
        Logger.info("Connecting...")
        await bots[botData.dbID].chat.connect().then(() => {
          Logger.info("Connected!")
        }).catch(() => {
          Logger.info("AAAAAAAAAAAAAAAAA Something went wrong")
        })
      }
    }
    return Promise.resolve(1)
  })
}

async function updateBotChannel (bot) {
  return new Promise((resolve) => {
    Mysql.getChannelData(bot.chat.botData.dbID).then(async (allChannelData) => {
      //remove unused channels
      for (let index in bot.chat.channels) {
        //check
        let contains = false
        for (let currentChannel of allChannelData) {
          if (currentChannel.channelID === bot.chat.channels[index].channelID) {
            contains = true
          }
        }
        //part
        if (!contains) {
          bot.chat.part(allChannelData[index].channelName)
          Logger.info(bot.chat.botData.username + " Parted: #" + allChannelData[index].channelName)
        }
      }
      //add new channels
      for (let index in allChannelData) {
        //check
        let contains = false
        for (let currentChannel of bot.chat.channels) {
          if (currentChannel.channelID === allChannelData[index].channelID) {
            contains = true
          }
        }
        //join
        if (!contains) {
          Logger.info(bot.chat.botData.username + " Joining: #" + allChannelData[index].channelName)
          await bot.chat.join(allChannelData[index].channelName).then(() => {
            Logger.info(bot.chat.botData.username + " Joined: #" + allChannelData[index].channelName)
            allChannelData[index].alreadyConnected = true
          }).catch((msg) => { Logger.error("JOIN: " + msg) })
          allChannelData[index].isVip = false
          allChannelData[index].isMod = false
        } else {
          allChannelData[index].isVip = bots[bot.chat.botData.dbID].chat.channels[index].isVip || false
          allChannelData[index].isMod = bots[bot.chat.botData.dbID].chat.channels[index].isMod || false
        }
      }
      //save changes to bot array
      bots[bot.chat.botData.dbID].chat.channels = allChannelData
      //resolve the Promise
      resolve()
    })
  })
}

async function updateAllChannels () {
  //run through bot object and update the bots channels
  return Promise.all(Object.values(bots).map(updateBotChannel))
}


/* MAIN START */

botSetup().then(() => {
  Logger.info("Bot setup done")
  updateAllChannels().then(() => {
    Logger.info("First time channel joining done")
    setInterval(updateAllChannels, 10000)
    for (i in bots) {
      bots[i].chat.on('PRIVMSG', OnX.onChat)
      bots[i].chat.on('USERNOTICE/SUBSCRIPTION', OnX.onSubscription)
      bots[i].chat.on('USERNOTICE/RESUBSCRIPTION', OnX.onResubscription)
      bots[i].chat.on('USERNOTICE/SUBSCRIPTION_GIFT', OnX.onSubscriptionGift)
      bots[i].chat.on('USERNOTICE/SUBSCRIPTION_GIFT_COMMUNITY', OnX.onSubscriptionGiftCommunity)
      bots[i].chat.on('USERNOTICE/GIFT_PAID_UPGRADE', OnX.onGiftPaidUpgrade)
      bots[i].chat.on('USERNOTICE/ANON_GIFT_PAID_UPGRADE', OnX.onAnonGiftPaidUpgrade)
      bots[i].chat.on('USERNOTICE/RITUAL', OnX.onRitual)
      bots[i].chat.on('USERNOTICE/RAID', OnX.onRaid)
      /*
      Logger.info(bots[i].chat.channels)
      for (var j in bots[i].chat.channels) {
        Logger.info(j)
      }
      */
    }
  })
})

"use strict"
const https = require('https')
const util = require('util')
//CLASSES
const ApiFunctions = require('../../api/ApiFunctions.js')
const DiscordLog = require('./../DiscordLog')

const apiRegExp = new RegExp("\\${api=(.*?)}", 'i')

const icecreamFacts = {
  "Magnum Mini Almond Ice Cream Bar": "Most tasters could agree that, while the ice cream was \"creamy,\" they enjoyed the chocolate coating more. \"The crunchy milk chocolate\" has a \"hint of nuts\" which gave it good texture, according to our volunteers. Overall, the 160-calorie bar tastes as delicious as it looks.",
  "Good Humor Mounds Ice Cream Bar": "This coconut ice cream bar covered in chocolate tasted \"unique\" and had a \"fluffy yet creamy texture.\" Many tasters also enjoyed the chocolate coating and its \"wonderful taste.\" It's no surprise this dessert was a hit: It has 190 calories, the most of all the treats in our taste test.",
  "Blue Bunny Sweet Freedom No Sugar Added Raspberry and Vanilla Swirl Bar": "Our volunteers had mixed opinions about the chocolate and berry flavors in these Blue Bunny bars. While some noted the \"smooth and creamy texture,\" other tasters only liked the \"crunchy chocolate shell\" of this 70-calorie bar. Either way, all could agree this treat looked absolutely scrumptious.",
  "Skinny Cow Oh Fudge Nuts Ice Cream Cone": "The nutty flavor and \"light sprinkling of peanuts\" on this ice cream come were enjoyable to tasters. On the other hand, most agreed the \"weird texture\" hinted to its light and low-cal nature. If indulging in the 150-calorie treat, eat quickly; our tasters found the cone \"breaks easily\" on the bottom.",
  "Stonyfield Farm Nonfat After Dark Chocolate Frozen Yogurt Novelty Bar": "The combination of textures in this novelty bar makes it something special. Our volunteers thought the chocolate had a \"good crackle\" and \"didn't seem like it would shatter and fall off,\" while the ice cream was \"smooth.\" Unfortunately, some tasters could tell it was low-cal and \"not in a good way,\" with ice cream they described as \"thin\" and \"watery.\"",
  "Blue Bunny Sweet Freedom No Sugar Added Vanilla Ice Cream Cone": "After you've enjoyed its chocolate-and-peanut-toppings and the ice cream within, Blue Bunny's cones offer an extra little treat: a \"hefty amount\" of chocolate lining the inside of the cone. Many volunteers complained that the vanilla was \"more icy than creamy,\" and \"not tasty.\" At the least, you get a \"huge portion\" with only 160 calories.",
  "Edy's/Dryer's Mango Fruit Bar Review": "A good summer treat, Edy's/Dryer's Mango Fruit Bars are \"refreshing and light.\" A \"simple, straightforward\" fruit bar, our volunteers thought they seemed \"healthy\" and \"fresh and summery.\" Unfortunately, some tasters found that sugariness cloying, while others complained that the bars did \"not offer enough flavor.\"",
  "Magnum Mini Classic Ice Cream Bar": "A good ratio of vanilla to chocolate makes this \"perfect sized\" ice cream bar delicious. Yet for some tasters, their evaluation might have been swayed by a price. Some complained that the vanilla ice cream was \"bland,\" but many still felt it was a \"cute modest size.\"",
  "Good Humor York Peppermint Pattie Ice Cream Bar": "Featuring the \"taste [of] a big peppermint patty,\" Good Humor's York Peppermint Pattie Ice Cream Bar had a \"strong\" flavor, according to our volunteers. Most approved of the \"delicious chocolate shell and light texture,\" but some felt the frozen treat was too messy because it had \"no stick or anything to hold it.\"",
  "Ciao Bella Blueberry Passion Sorbet Bar": "Often referred to as \"refreshing\" by tasters, this fruit bar seemed to be a hit among most. Featuring a real fruit flavor that packed a punch, volunteers thought it \"tasted like a fruit smoothie.\" The downsides: Some tasters described the color as \"not appetizing\" and the bars melted quickly.",
  "Weight Watchers Divine Triple Chocolate Dessert Bar": "Our tasters loved the \"great flavor\" of this triple chocolate treat. With its chocolate bar filled with chocolate swirls and then coated in a chocolate shell, one volunteer declared this 110-calorie treat \"any chocolate lover's dream!\" Make sure you have napkins handy though; we found that it melts quickly and \"falls apart.\"",
  "Cadbury Vanilla Chocolate Ice Cream Bar": "Most tasters agreed that the Cadbury's chocolate coating passed the taste test but the ice cream did not. With a \"Cadbury Egg-tasting exterior\", the chocolate outside was \"rich and delicious\" and \"not fake like other products.\" The ice cream, though, had \"no distinctive flavor\" and left a \"funny aftertaste.\"",
  "Champ Snack Size Ice Cream Cones in Vanilla": "The chocolate and nuts are the real stars of these snack-size cones. Our volunteers loved the combination of textures and the \"crunchy\" cone. Unfortunately, many complained that the ice cream within was \"bland\" and \"extremely icy.\"",
  "H\u00E4agen-Dazs Snack Sized Vanilla Chocolate Cones": "Our tasters thought the nuts and chocolate of this cone were the \"perfect combination.\" Many loved the taste and \"good portion size,\" too. Volunteers were mixed on the overall sweetness however, with some loving the flavor and others calling it \"overpowering.\"",
  "Blue Bunny Premium All Natural Vanilla Ice Cream": "The \"thick and creamy\" texture of Blue Bunny All Natural Vanilla Ice Cream was well received by our volunteers. \"Sweet and milky,\" the \"good French vanilla flavor\" of this ice cream caused one taster to joke, \"Bring on the cone!\""
}

module.exports = class Helper {
  constructor () {

  }

  static splitMessageToParts (message) {
    let messageSplit = message.split(" ")
    return {command: messageSplit[0] || "", first: messageSplit[1] || "", params: messageSplit.splice(1), split: messageSplit}
  }

  static async fillParams (msgObj, commandObj) {
    let message = commandObj.response
    //message = Helper.firstParameterOrUser(msgObj, message)
    message = Helper.user(msgObj, message)
    message = Helper.channel(msgObj, message)
    message = Helper.uptime(msgObj, message)
    if (commandObj.hasOwnProperty("timesUsed")) {
      message = Helper.timesUsed(msgObj, message, commandObj.timesUsed)
    }
    message = Helper.icecream(msgObj, message)
    message = await Helper.api(msgObj, message)

    return message
  }

  static firstParameterOrUser (msgObj, message) {
    if (message.includes("${p1||user}")) { //TODO
      let replacement = msgObj.username
      let firstParameter = message.split(" ")[1]
      if (firstParameter !== null) {
        if (firstParameter.startsWith("@")) {
          firstParameter = firstParameter.substring(1)
        }
        if (isUserInChannel(firstParameter, msgObj.channel)) {
          replacement = firstParameter
        }
      }
      return message.replace(new RegExp("\\${p1\\|\\|user}", 'g'), replacement)
    }
    return message
  }

  static user (msgObj, message) {
    if (message.includes("${user}")) {
      return message.replace(new RegExp("\\${user}", 'g'), msgObj.username)
    }
    return message
  }

  static channel (msgObj, message) {
    if (message.includes("${channel}")) {
      return message.replace(new RegExp("\\${channel}", 'g'), msgObj.channel)
    }
    return message
  }

  static uptime (msgObj, message) {
    if (message.includes("${uptime}")) {
      return message.replace(new RegExp("\\${uptime}", 'g'), this.msToDDHHMMSS(process.uptime()))
    }
    return message
  }

  static timesUsed (msgObj, message, timesUsed) {
    if (message.includes("${timesUsed}")) {
      return message.replace(new RegExp("\\${timesUsed}", 'g'), timesUsed)
    }
    return message
  }

  static icecream (msgObj, message) {
    if (message.includes("${icecream}")) {
      let keys = Object.keys(icecreamFacts)
      let icecreamFactKey = keys[Math.floor(Math.random() * keys.length)]
      let icecreamFactContent = icecreamFacts[icecreamFactKey]
      return message.replace(new RegExp("\\${icecream}", 'g'), icecreamFactKey + " 🍨: " + icecreamFactContent)
    }
    return message
  }

  static async api (msgObj, message) {
    if (message.includes("${api") && apiRegExp.test(message)) {
      let apiUrl = message.match(apiRegExp)[1]

      return new Promise((resolve, reject) => {
        //Duplicate default request object
        let request = new URL(apiUrl)

        let req = https.request(request, (res) => {
          res.setEncoding('utf8')
          res.on('data', (response) => {
            message = message.replace(new RegExp(apiRegExp, 'g'), response)
            resolve(message)
          })
        })
        req.on('error', (err) => {
          message = message.replace(new RegExp(apiRegExp, 'g'), err)
          reject(message)
        })
        req.write('')
        req.end()
      })
    } else {
      return Promise.resolve(message)
    }
  }

  static checkLastCommandUsage (commandMatch, lastCommandUsageObject, roomId) {
    if (commandMatch.hasOwnProperty("cooldown") && commandMatch.hasOwnProperty("ID")) {
      let lastUsage = 0
      if (!lastCommandUsageObject.hasOwnProperty(roomId)) {
        lastCommandUsageObject[roomId] = {}
      }
      if (lastCommandUsageObject[roomId].hasOwnProperty(commandMatch.ID)) {
        lastUsage = lastCommandUsageObject[roomId][commandMatch.ID]
      }
      let cooldownPassed = commandMatch.cooldown * 1000 + lastUsage < Date.now()
      if (cooldownPassed) {
        lastCommandUsageObject[roomId][commandMatch.ID] = Date.now()
      }
      return cooldownPassed
    }
    return false
  }

  static msToDDHHMMSS (ms) {
    let secNum = parseInt(ms + "", 10) // don't forget the second param
    let days = Math.floor(secNum / 86400)
    let hours = Math.floor((secNum - (days * 86400)) / 3600)
    let minutes = Math.floor((secNum - (days * 86400) - (hours * 3600)) / 60)
    let seconds = secNum - (days * 86400) - (hours * 3600) - (minutes * 60)

    /*
    if (hours < 10) { hours = "0" + hours }
    if (minutes < 10) { minutes = "0" + minutes }
    if (seconds < 10) { seconds = "0" + seconds }
    */

    let time = seconds + 's'
    if (minutes > 0 || hours > 0) {
      time = minutes + 'm ' + time
    }
    if (hours > 0) {
      time = hours + 'h ' + time
    }
    if (days > 0) {
      time = days + 'd ' + time
    }
    return time
  }
}

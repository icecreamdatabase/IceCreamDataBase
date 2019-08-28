"use strict"
const https = require('follow-redirects').https

const DiscordLog = require('./DiscordLog')

const ChatLimit = require('./../../ENUMS/ChatLimit.js')

const nameRegex = /^.* \W*icdb\W* .*$/i

module.exports = class Firehose {
  constructor (bots) {
    this.lastLine = 0
    this.req = null
    this.bots = bots
    //TODO: don't use timeouts ...
    setTimeout(this.checkFirehose.bind(this), 5000)
  }

  checkFirehose () {
    if (this.lastLine + 5000 < new Date()) {
      if (this.req) {
        this.req.abort()
        this.req = null
      }
      this.startFirehose()
    }
    setTimeout(this.checkFirehose.bind(this), 10000)
  }

  startFirehose () {
    let verifiedBot = (Object.values(this.bots)).find(x => x.rateLimitUser === ChatLimit.VERIFIED)
    if (verifiedBot) {
      let request = new URL("https://tmi.twitch.tv/firehose?oauth_token="
        + verifiedBot.TwitchIRCConnection.botData.token.substring(6))

      console.log("Starting firehose")
      this.req = https.request(request, (res) => {
        res.setEncoding('utf8')
        res.on('data', (response) => {
          try {
            this.lastLine = Date.now()

            let obj = JSON.parse(response.split("\n")[1].substring(6))
            //obj.event = split[0].substring(7)
            //TODO: move the parameters somewhere else
            if (nameRegex.test(obj.body)) {
              /*
              let tags = obj.tags.split(";")
              let parsedtags = {}
              for (let tag of tags) {
                let split = tag.split("=")
                parsedtags[split[0]] = split[1]
              }
              */
              if (obj.room) {
                DiscordLog.custom("firehose-notify",
                  obj.room + " " + obj.nick + ":",
                  obj.body)
              } else {
                DiscordLog.custom("firehose-notify",
                  response.split("\n")[0].substring(7),
                  util.inspect(obj))
              }
            }

            //req.abort()
            // eslint-disable-next-line no-empty
          } catch (e) {
          }
        })
      })
      this.req.on('error', (err) => {
        console.error(err)
      })
      this.req.write('')
      this.req.end()
    }
  }
}


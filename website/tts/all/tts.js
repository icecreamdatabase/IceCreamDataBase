//default parameter
const defaultVoice = "Brian"
const defaultTtsRateLimit = 1000
const seVoiceFile = '../se-voices.json'
let voices = null

//get parameters out of url
let channels = (findGetParameter("channels") || "").split(",").filter(Boolean)
let singleChannel = findGetParameter("channel")
if (singleChannel) {
  channels.push(singleChannel)
}
let sayNames = !!findGetParameter("names")
let voice = findGetParameter("voice") || defaultVoice
let ttsRatelimit = parseInt(findGetParameter("ttsRateLimit")) || defaultTtsRateLimit
let alwaysFullPlayback = !!findGetParameter("alwaysFullPlayback")
let volume = parseFloat(findGetParameter("volume") || "1")
let interactive = !!findGetParameter("interactive")

//needed variables
let shouldSend = true
let audioPlaying = false
buttonApplyVoice(voice)
fillVoiceDropDown(getVoices())

//apply values
document.getElementById("player").volume = volume
document.getElementById("interactive").style.display = interactive ? "block" : "none"
document.getElementById("tts-saynames-checkbox").checked = sayNames
document.getElementById("tts-alwaysfullplayback-checkbox").checked = alwaysFullPlayback
document.getElementById("tts-ratelimit-numberfield").value = ttsRatelimit

//Eventlistener for TTS audio done playing
document.getElementById("player").addEventListener("ended", () => audioPlaying = false)


/* twitch-js part */
// noinspection JSUnresolvedFunction
const {api, chat} = new TwitchJs({token: "randomstring", username: "justinfan47", log: {level: "warn"}})

chat.connect().then(() => {
  channels.forEach(channel => chat.join(channel))
})

chat.on("PRIVMSG", (msgObj) => {
  if (shouldSend && (!interactive || document.getElementById("tts-enabled-checkbox").checked)) {
    shouldSend = false
    let ttsMessage = msgObj.message
    if (sayNames) {
      ttsMessage = msgObj.username + " says " + ttsMessage
    }
    console.log("TTS: " + msgObj.username + ": " + msgObj.message)
    setTimeout(() => shouldSend = true, ttsRatelimit)
    speak(ttsMessage, voice)
  }
})

async function speak (text, voice = "Brian") {
  if (audioPlaying && alwaysFullPlayback) {
    return
  }
  audioPlaying = true
  setVoice(voice, true)
  let speak = await fetch("https://api.streamelements.com/kappa/v2/speech?voice=" +
    voice +
    "&text=" +
    encodeURIComponent(text.trim()))
  if (speak.status !== 200) {
    console.warn(await speak.text())
    return
  }
  let mp3 = await speak.blob()
  let blobUrl = URL.createObjectURL(mp3)
  document.getElementById("source").setAttribute("src", blobUrl)
  let player = document.getElementById("player")
  player.pause()
  player.load()
  player.play()
}

function findGetParameter (parameterName) {
  let result = null
  let tmp = []
  location.search
    .substr(1)
    .split("&")
    .forEach(function (item) {
      tmp = item.split("=")
      if (tmp[0].toLowerCase() === parameterName.toLowerCase()) {
        result = decodeURIComponent(tmp[1])
      }
    })
  return result
}

async function setVoice (value, noCase = false) {
  let voiceID = defaultVoice

  getVoices().some(langElem => {
    return langElem.voices.some(voiceElem => {
      let match = ( noCase ? (voiceElem.id.toLowerCase() === value.toLowerCase()) : (voiceElem.id === value) )

      if (match) {
        voiceID = voiceElem.id
      }

      return match
    })
  })

  voice = voiceID
}

function getVoiceLang (value, noCase = false) {
  let voiceLang = null

  getVoices().some(langElem => {
    let hasElem = langElem.voices.some(voiceElem => {
      if (noCase) {
        return (voiceElem.id.toLowerCase() === value.toLowerCase() || voiceElem.name.toLowerCase() === value.toLowerCase())
      } else {
        return (voiceElem.id === value || voiceElem.name === value)
      }
    })

    if (hasElem) {
      voicelang = langElem.lang
    }

    return hasElem
  })

  return voiceLang
}

function getVoiceID (value, noCase = false) {
  let voiceID = null

  getVoices().some(langElem => {
    return langElem.voices.some(voiceElem => {
      let match = ( noCase ?
        (voiceElem.id.toLowerCase() === value.toLowerCase() || voiceElem.name.toLowerCase() === value.toLowerCase()) :
        (voiceElem.id === value || voiceElem.name === value) )

      if (match) { voiceID = voiceElem.id }

      return match
    })
  })

  return voiceID
}

function createTTSObject (message, defaultVoice = defaultVoice) {
  let output = [{voice: defaultVoice, text: ""}]
  let outputIndex = 0
  for (let word of message.split(" ")) {
    if (word.endsWith(":") && voices.includes(word.substr(0, word.length - 1))) {
      output[++outputIndex] = {}
      output[outputIndex]["voice"] = word.substr(0, word.length - 1)
      output[outputIndex]["text"] = ""
    } else {
      output[outputIndex]["text"] += " " + word
    }
  }
  output.map(x => x.text = x.text.trim())
  return output.filter(x => x.text)
}

// TODO: Load asynchronously
function getVoices () {
  if (voices === null) {
    voices = loadJSON(seVoiceFile)
    //TODO: sorting
  }

  return voices
}

// Load JSON text from server hosted file and return JSON parsed object
function loadJSON (filePath) {
  let json = loadTextFileAjaxSync(filePath, "application/json")
  return JSON.parse(json)
}

// Load text with Ajax synchronously: takes path to file and optional MIME type
function loadTextFileAjaxSync (filePath, mimeType) {
  var xmlHttp = new XMLHttpRequest()
  xmlHttp.open("GET", filePath, false)
  if (mimeType != null) {
    if (xmlHttp.overrideMimeType) {
      xmlHttp.overrideMimeType(mimeType)
    }
  }
  xmlHttp.send()
  if (xmlHttp.status === 200) {
    return xmlHttp.responseText
  } else {
    // TODO: Throw exception
    return null
  }
}

//default parameter
const voices = ["Aditi", "Amy", "Astrid", "Bianca", "Brian", "Carla", "Carmen", "Celine", "Chantal", "Conchita", "Cristiano", "Dora", "Emma", "Enrique", "Ewa", "Filiz", "Geraint", "Giorgio", "Gwyneth", "Hans", "Ines", "Ivy", "Jacek", "Jan", "Joanna", "Joey", "Justin", "Karl", "Kendra", "Kimberly", "Liv", "Lotte", "Mads", "Maja", "Marlene", "Mathieu", "Matthew", "Maxim", "Mia", "Miguel", "Mizuki", "Naja", "Nicole", "Penelope", "Raveena", "Ricardo", "Ruben", "Russell", "Salli", "Seoyeon", "Takumi", "Tatyana", "Vicki", "Vitoria", "Zhiyu", /* Less refinded ones */ "An", "Andika", "Asaf", "Danny", "Filip", "Guillaume", "HanHan", "Heather", "Heidi", "Hemant", "Herena", "Hoda", "Huihui", "Ivan", "Jakub", "Kalpana", "Kangkang", "Karsten", "Lado", "Linda", "Matej", "Michael", "Naayf", "Pattara", "Rizwan", "Sean", "Stefanos", "Szabolcs", "Tracy", "Valluvar", "Yaoyao", "Zhiwei"]
const defaultVoice = "Brian"
const defaultTtsRateLimit = 1000


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
fillVoiceDropDown(voices)

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
  setVoice(voice)
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
function setVoice (value) {
  voice = voices.find(x => x.toLowerCase() === value.toLowerCase()) || defaultVoice
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

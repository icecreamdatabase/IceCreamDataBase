function onEnableChange (checked) {
  if (!checked) {
    document.getElementById("player").pause()
  }
}

function onVolumechange (value) {
  document.getElementById("player").volume = value
}

function onRatelimitChange (value) {
  ttsRatelimit = value
}

function onSayNamesChange (value) {
  sayNames = value
}

function onAlwaysFullPlaybackChange (value) {
  alwaysFullPlayback = value
}

function fillVoiceDropDown (voices) {
  voices.forEach(langElem => {
    let langNode = document.createElement("div")
    let langLabel = document.createElement("label")
    langLabel.appendChild(document.createTextNode(langElem.lang))
    langNode.appendChild(langLabel)
    langElem.voices.forEach(voiceElem => {
      let buttonNode = document.createElement("button")
      buttonNode.setAttribute("onclick", "buttonApplyVoice('" + voiceElem.id + "', this.firstChild.nodeValue)")
      buttonNode.appendChild(document.createTextNode(voiceElem.name))
      langNode.appendChild(buttonNode)
    })
    document.getElementById("tts-voice-dropdowndiv").appendChild(langNode)
  })
}

function buttonApplyVoice (id, name = null) {
  setVoice(id, true)
  document.getElementById('tts-voice-dropdownbutton').textContent = name || id
  document.getElementById('tts-voice-dropdownbutton').click()
  document.getElementById("tts-voice-dropdowndiv").classList.toggle("show", false)
}

function toggleVoiceDropdown () {
  document.getElementById("tts-voice-dropdowndiv").classList.toggle("show")
}

// TODO: Search by language
function filterFunction (dropDownSearch, dropDownDiv) {
  let input = document.getElementById(dropDownSearch)
  let filter = input.value.toLowerCase()
  let div = document.getElementById(dropDownDiv)
  let langDivs = div.children
  for (let i = 0; i < langDivs.length; i++) {
    if (langDivs[i].tagName.toLowerCase() != "div")
      continue

    let a = langDivs[i].children
    let buttonNum = 0
    let hiddenItems = 0
    for (let j = 0; j < a.length; j++) {
      if (a[j].tagName.toLowerCase() != "button")
        continue

      buttonNum++
      let txtValue = a[j].textContent || a[j].innerText
      if (txtValue.toLowerCase().indexOf(filter) > -1) {
        a[j].style.display = ""
      } else {
        a[j].style.display = "none"
        hiddenItems++
      }
    }
    if (buttonNum == hiddenItems)
      langDivs[i].style.display = "none"
    else
      langDivs[i].style.display = ""
  }
}


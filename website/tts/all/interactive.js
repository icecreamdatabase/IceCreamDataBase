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
  voices.forEach(voice => {
    let node = document.createElement("button")
    node.setAttribute("onclick", "buttonApplyVoice(this.firstChild.nodeValue)")
    let textnode = document.createTextNode(voice)
    node.appendChild(textnode)
    document.getElementById("tts-voice-dropdowndiv").appendChild(node)
  })
}

function buttonApplyVoice (value) {
  setVoice(value)
  document.getElementById('tts-voice-dropdownbutton').textContent = value
  document.getElementById('tts-voice-dropdownbutton').click()
  document.getElementById("tts-voice-dropdowndiv").classList.toggle("show", false)
}

function toggleVoiceDropdown () {
  document.getElementById("tts-voice-dropdowndiv").classList.toggle("show")
}

function filterFunction (dropDownSearch, dropDownDiv) {
  let input = document.getElementById(dropDownSearch)
  let filter = input.value.toUpperCase()
  let div = document.getElementById(dropDownDiv)
  let a = div.getElementsByTagName("button")
  for (let i = 0; i < a.length; i++) {
    let txtValue = a[i].textContent || a[i].innerText
    if (txtValue.toUpperCase().indexOf(filter) > -1) {
      a[i].style.display = ""
    } else {
      a[i].style.display = "none"
    }
  }
}


"use strict";
const Logger = require('consola')
//CLASSES
const Api = require('../classes/ApiFunctions.js')

module.exports = {
  idToName,
  nameToId,
  clearMaps
}

var mapIdToName = {}
var mapNameToId

function idToName(id) {
  if (!mapIdToName.hasOwnProperty(id)) {
    //DO IT

    syncIdToNameMap()
  }

  return mapIdToName[id].name
}

function nameToId(name) {
  if (!mapNameToId.hasOwnProperty(name)) {
    //DO IT

    syncNameToIdMap()
  }

  return mapNameToId[id].name
}

function clearMaps(){

}

function syncIdToNameMap(){

}

function syncNameToIdMap(){

}

"use strict";
const Logger = require('consola')
//CLASSES
const Api = require('../classes/ApiFunctions.js')

var mapIdToName = {}
var mapNameToId = {}

module.exports = class UserIdLoginCache {
  constructor() {

  }

  static idToName(id) {
    if (!mapIdToName.hasOwnProperty(id)) {
      //DO IT

      syncIdToNameMap()
    }

    return mapIdToName[id].name
  }

  static nameToId(name) {
    if (!mapNameToId.hasOwnProperty(name)) {
      //DO IT

      syncNameToIdMap()
    }

    return mapNameToId[id].name
  }

  static clearMaps(){

  }

  static syncIdToNameMap(){

  }

  static syncNameToIdMap(){

  }
}

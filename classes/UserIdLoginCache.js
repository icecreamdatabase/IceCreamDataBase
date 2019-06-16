"use strict"
const Logger = require('consola')
//CLASSES
const Api = require('../classes/Api.js')

let mapIdToName = {}
let mapNameToId = {}

module.exports = class UserIdLoginCache {
  constructor () {

  }

  static async idToName (id) {
    return await Api.loginFromUserId(global.clientIdFallback, id)
    /*
    if (!mapIdToName.hasOwnProperty(id)) {
      //DO IT

      this.syncIdToNameMap()
    }

    return mapIdToName[id].name
    */
  }

  static async nameToId (name) {
    return await Api.userIdFromLogin(global.clientIdFallback, name)
    /*
    if (!mapNameToId.hasOwnProperty(name)) {
      //DO IT

      this.syncNameToIdMap()
    }

    return mapNameToId[id].name
    */
  }

  static clearMaps () {

  }

  static syncIdToNameMap () {

  }

  static syncNameToIdMap () {

  }
}

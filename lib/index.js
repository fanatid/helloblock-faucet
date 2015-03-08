require('setimmediate')
var bs58check = require('bs58check')
var request = require('request')

/**
 * @callback helloblockRequestCallback
 * @param {?Error} error
 * @param {Object} data

/**
 * @param {Object} opts
 * @param {helloblockRequestCallback} callback
 */
function helloblockRequest (opts, callback) {
  opts.json = opts.json || true
  opts.zip = true

  request(opts, function (error, response, body) {
    if (error !== null) {
      return callback(error)
    }

    if (response.statusCode !== 200) {
      var msg = 'Code: ' + response.statusCode + ', ' + response.statusMessage
      return callback(new Error(msg))
    }

    if (body.status !== 'success') {
      return callback(new Error('Status: ' + body.status))
    }

    callback(null, body.data)
  })
}

/**
 * @typedef {Object} UnspentObject
 * @property {number} confirmations
 * @property {number} blockHeight
 * @property {string} txHash
 * @property {number} index
 * @property {string} scriptPubKey
 * @property {string} type
 * @property {number} value
 * @property {string} hash160
 * @property {string} address
 */

/**
 * @callback getUnspentsCallback
 * @param {?Error} error
 * @param {Object} data
 * @param {string} data.privateKeyWIF
 * @param {string} data.privateKeyHex
 * @param {string} data.address
 * @param {string} data.hash160
 * @param {number} data.faucetType
 * @param {UnspentObject[]} data.unspents
 */

/**
 * @param {number} type Preload unspents type
 * @param {getUnspentsCallback} callback
 */
function getUnspents (type, callback) {
  if ([1, 2, 3].indexOf(type) === -1) {
    var msg = 'Unknow preload unspent type (expected 1, 2 or 3), got: ' + type
    return setImmediate(callback, new Error(msg))
  }

  helloblockRequest({
    uri: 'https://testnet.helloblock.io/v1/faucet?type=' + type
  }, callback)
}

/**
 * @callback withdrawalCallback
 * @param {?Error} error
 * @param {Object} data
 * @param {number} data.value
 * @param {string} data.fromAddress
 * @param {string} data.toAddress
 * @param {string} data.txHash
 */

/**
 * @param {string} toAddress
 * @param {number} value
 * @param {withdrawalCallback} callback
 */
function withdrawal (toAddress, value, callback) {
  try {
    var decoded = bs58check.decode(toAddress)
    if (decoded.length !== 21) {
      throw new Error('Invalid hash length')
    }
    if (decoded[0] !== 111) {
      throw new Error(toAddress + ' is not testnet address')
    }
  } catch (error) {
    var err = new Error()
    err.stack = error.stack
    err.message = error.message
    return setImmediate(callback, err)
  }

  if (value <= 0 || value > 1000000) {
    var msg = 'Value must be within the range from 1 to 1000000'
    return setImmediate(callback, new RangeError(msg))
  }

  helloblockRequest({
    uri: 'https://testnet.helloblock.io/v1/faucet/withdrawal',
    method: 'POST',
    json: {toAddress: toAddress, value: value}
  }, callback)
}

module.exports = {
  getUnspents: getUnspents,
  withdrawal: withdrawal
}

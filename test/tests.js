/* global describe, it, afterEach */

var bitcoin = require('bitcoinjs-lib')
var bs58check = require('bs58check')
var expect = require('chai').expect
var request = require('request')
var faucet = require('../lib')

var ADDR_TARGET = 'n1UtejpgvfFh9SKGzyyigkjnJZMixtDdTX'

/**
 * Send unspents to yet faucet one faucet.xeno-genesis.com
 *
 * @param {Object} data
 * @param {function} done
 */
function sendUnspents (data, done) {
  var privKey = bitcoin.ECKey.fromWIF(data.privateKeyWIF)
  var total = 0
  var txb = new bitcoin.TransactionBuilder()
  data.unspents.forEach(function (unspent) {
    total += unspent.value
    txb.addInput(unspent.txHash, unspent.index)
  })
  txb.addOutput(ADDR_TARGET, total - 10000)
  data.unspents.forEach(function (_, index) {
    txb.sign(index, privKey)
  })

  var opts = {
    uri: 'https://testnet.helloblock.io/v1/transactions',
    method: 'POST',
    json: {rawTxHex: txb.build().toHex()}
  }
  request(opts, function (error, response) {
    expect(error).to.be.null
    done()
  })
}

/**
 * @param {string} addr
 */
function isTestnetAddress (addr) {
  var decoded = bs58check.decode(addr)
  expect(decoded.length).to.equal(21)
  expect(decoded[0]).to.equal(111)
}

/**
 * @param {string} str
 * @param {number} length
 */
function isHexString (str, length) {
  expect(str.length).to.equal(length)
  for (var pos = 0; pos < length; pos++) {
    var index = '0123456789abcdefABCDEF'.indexOf(str[pos])
    expect(index).to.not.equal(-1)
  }
}

/**
 * @param {Object} data
 * @param {number} faucetType
 */
function unspentsTest (data, faucetType) {
  bitcoin.ECKey.fromWIF(data.privateKeyWIF)
  isTestnetAddress(data.address)
  isHexString(data.hash160, 40)
  expect(data.faucetType).to.equal(faucetType)
  expect(data.unspents).to.be.an('Array')
  expect(data.unspents.length).to.equal(faucetType)
  var sum = 0
  data.unspents.forEach(function (unspent, index) {
    expect(unspent.confirmations).to.be.a('number')
    expect(unspent.blockHeight).to.be.a('number')
    isHexString(unspent.txHash, 64)
    expect(unspent.index).to.be.a('number')
    bitcoin.Script.fromHex(unspent.scriptPubKey)
    expect(unspent.type).to.equal('pubkeyhash')
    expect(unspent.value).to.be.an('number')
    sum += unspent.value
    isHexString(unspent.hash160, 40)
    expect(unspent.address).to.equal(data.address)
  })
  switch (faucetType) {
    case 1:
      expect(sum).to.equal(100000)
      break
    case 2:
      expect(sum).to.equal(50000)
      break
    case 3:
      expect(sum).to.equal(160000)
      break
  }
}

describe('helloblockRequest', function () {
  var Request = require('request').Request

  afterEach(function () {
    request.Request = Request
  })

  it('request return error', function (done) {
    if (typeof window !== 'undefined') {
      return done()
    }

    request.Request = function (opts) {
      setTimeout(function () {
        opts.callback(new Error('CustomError'))
      }, 0)
    }

    faucet.getUnspents(1, function (error, data) {
      expect(error).to.be.instanceof(Error)
        .and.to.have.property('message', 'CustomError')
      expect(data).to.be.undefined
      done()
    })
  })

  it('response.statusCode not 200', function (done) {
    if (typeof window !== 'undefined') {
      return done()
    }

    request.Request = function (opts) {
      setTimeout(function () {
        opts.callback(null, {statusCode: 404, statusMessage: 'NotFound'})
      }, 0)
    }

    faucet.getUnspents(1, function (error, data) {
      expect(error).to.be.instanceof(Error)
        .and.to.have.property('message', 'Code: 404, NotFound')
      expect(data).to.be.undefined
      done()
    })
  })

  it('data.status is not success', function (done) {
    if (typeof window !== 'undefined') {
      return done()
    }

    request.Request = function (opts) {
      setTimeout(function () {
        opts.callback(null, {statusCode: 200}, {status: 'error'})
      }, 0)
    }

    faucet.getUnspents(1, function (error, data) {
      expect(error).to.be.instanceof(Error)
        .and.to.have.property('message', 'Status: error')
      expect(data).to.be.undefined
      done()
    })
  })
})

describe('getUnspents', function () {
  this.timeout(10000)

  it('bad type', function (done) {
    faucet.getUnspents(0, function (error, data) {
      expect(error).to.be.instanceof(Error)
      expect(data).to.be.undefined
      done()
    })
  })

  it('type 1', function (done) {
    faucet.getUnspents(1, function (error, data) {
      expect(error).to.be.null
      unspentsTest(data, 1)
      sendUnspents(data, done)
    })
  })

  it('type 2', function (done) {
    faucet.getUnspents(2, function (error, data) {
      expect(error).to.be.null
      unspentsTest(data, 2)
      sendUnspents(data, done)
    })
  })

  it('type 3', function (done) {
    faucet.getUnspents(3, function (error, data) {
      expect(error).to.be.null
      unspentsTest(data, 3)
      sendUnspents(data, done)
    })
  })
})

describe('withdrawal', function () {
  this.timeout(10000)

  it('bad address (non-base58 character)', function (done) {
    faucet.withdrawal('il', 100000, function (error, data) {
      expect(error).to.be.instanceof(Error)
        .and.to.have.property('message', 'Non-base58 character')
      expect(data).to.be.undefined
      done()
    })
  })

  it('bad address (invalid checksum)', function (done) {
    var toAddress = ADDR_TARGET.slice(0, -1)
    faucet.withdrawal(toAddress, 100000, function (error, data) {
      expect(error).to.be.instanceof(Error)
        .and.to.have.property('message', 'Invalid checksum')
      expect(data).to.be.undefined
      done()
    })
  })

  it('bad address (invalid hash length)', function (done) {
    var toAddress = bs58check.encode(new Buffer(10))
    faucet.withdrawal(toAddress, 100000, function (error, data) {
      expect(error).to.be.instanceof(Error)
        .and.to.have.property('message', 'Invalid hash length')
      expect(data).to.be.undefined
      done()
    })
  })

  it('bad address (not testnet)', function (done) {
    var toAddress = '1Av3CeiqZNBq6bNpycrQANTYpFfcYxxBPv'
    faucet.withdrawal(toAddress, 100000, function (error, data) {
      expect(error).to.be.instanceof(Error)
        .and.to.have.property('message', toAddress + ' is not testnet address')
      expect(data).to.be.undefined
      done()
    })
  })

  it('bad value (less than 1)', function (done) {
    faucet.withdrawal(ADDR_TARGET, 0, function (error, data) {
      expect(error).to.be.instanceof(Error)
        .and.to.have.property('message', 'Value must be within the range from 1 to 1000000')
      expect(data).to.be.undefined
      done()
    })
  })

  it('bad value (more than 1000000)', function (done) {
    faucet.withdrawal(ADDR_TARGET, 1000001, function (error, data) {
      expect(error).to.be.instanceof(Error)
        .and.to.have.property('message', 'Value must be within the range from 1 to 1000000')
      expect(data).to.be.undefined
      done()
    })
  })

  it('request 50000 satoshi', function (done) {
    faucet.withdrawal(ADDR_TARGET, 50000, function (error, data) {
      expect(error).to.be.null
      expect(data).to.have.property('value', 50000)
      isTestnetAddress(data.fromAddress)
      expect(data).to.have.property('toAddress', ADDR_TARGET)
      isHexString(data.txHash, 64)
      done()
    })
  })
})

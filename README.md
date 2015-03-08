# helloblock-faucet

[![Version](http://img.shields.io/npm/v/helloblock-faucet.svg?style=flat-square)](https://www.npmjs.org/package/helloblock-faucet)
[![build status](https://img.shields.io/travis/fanatid/helloblock-faucet.svg?branch=master&style=flat-square)](http://travis-ci.org/fanatid/helloblock-faucet)
[![Coverage Status](https://img.shields.io/coveralls/fanatid/helloblock-faucet.svg?style=flat-square)](https://coveralls.io/r/fanatid/helloblock-faucet)

Need coins for testing your bitcoin software? Welcome!

## API

### getUnspents

**arguments**

  * `number` type Faucet type, could be 1, 2 or 3
  * `function` callback Node-style callback

**callback arguments**

  * `?Error` error
  * `Object` data
    * `string` data.privateKeyWIF
    * `string` data.privateKeyHex
    * `string` data.address
    * `string` data.hash160
    * `number` data.faucetType
    * `Object[]` data.unspents
      * `number` confrimations
      * `number` blockHeight
      * `string` txHash
      * `number` index
      * `string` scriptPubKey
      * `string` type
      * `number` value
      * `string` hash160
      * `string` address

### withdrawal

**arguments**

  * `string` toAddress Address for satoshi
  * `number` value Coin size (max: 1,000,000)
  * `function` callback Node-style callback

**callback arguments**

  * `?Error` error
  * `Object` data
    * `number` data.value
    * `string` data.fromAddress
    * `string` data.toAddress
    * `string` data.txHash

## Examples

### Create new transaction
```js
var faucet = require('helloblock-faucet')
var bitcoin = require('bitcoinjs-lib')
var request = require('request')

faucet.getUnspents(1, function (error, data) {
  if (error !== null) {
    return console.log(error)
  }

  var privKey = bitcoin.ECKey.fromWIF(data.privateKeyWIF)
  var total = 0
  var txb = new bitcoin.TransactionBuilder()
  data.unspents.forEach(function (unspent) {
    total += unspent.value
    txb.addInput(unspent.txHash, unspent.index)
  })
  txb.addOutput('testnet_address', total - 10000)
  data.unspents.forEach(function (_, index) {
    txb.sign(index, privKey)
  })

  var opts = {
    uri: 'https://testnet.helloblock.io/v1/transactions',
    method: 'POST',
    json: {rawTxHex: txb.build().toHex()}
  }
  request(opts, function (error, response) {
    if (error !== null) {
      return console.log(error)
    }

    console.log('Create new tx! TxHash: ' + response.body.data.transaction.txHash)
  })
})
```

## License

Code released under [the MIT license](https://github.com/fanatid/helloblock-faucet/blob/master/LICENSE).

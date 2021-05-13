'use strict';
const braintree = require("braintree");
const config = require('./config');

const gateway = new braintree.BraintreeGateway({
    environment: braintree.Environment.Sandbox,
    merchantId: config.app.braintree.merchantId,
    publicKey: config.app.braintree.publicKey,
    privateKey: config.app.braintree.privateKey
});

module.exports = gateway;

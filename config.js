'use strict';

const app = {
    publicUrl: 'http://3.131.42.170:3000',
    stripeSecretKey: 'sk_test_sHMVRkkGop1ciYEYhJ3GOC4a',
    braintree: {
        merchantId: 'nqqftmb3d2msqqvc',
        publicKey: '8q55tgwpbgg7999f',
        privateKey: '05401c1bca4c56f3cea691015c8ef800'
    },
    mailgun: {
        apiKey: 'c5383082ea3175846dfd0b8c0866ca6b-c8e745ec-9d65ac89',
        domain: 'sandboxcab7c252eef946c4b1a60a950233df6d.mailgun.org',
        from: 'RLUX Sandbox <postmaster@sandboxcab7c252eef946c4b1a60a950233df6d.mailgun.org>'
    }
};

module.exports = {
    app: app
};

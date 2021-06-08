'use strict';

const app = {
    serverVersion: 1.2,
    publicUrl: 'http://3.131.42.170:3000',
    stripeSecretKey: 'sk_test_sHMVRkkGop1ciYEYhJ3GOC4a',
    paypal: {
        clientId: 'AVChMS8BvW2LLgwSdTkXIFgGqDkN6d5Lba6of7VvJBvKC-Imf41oq4M5JewrslwetXn19jYUYlSp0TMT',
        secret: 'EFMZ-fVPMnEnjvZlQdv7ptXgss3KAuDfuArm9H7GzaEDyq7nNnSUsKvrayFcF_labhzA9mtkelKXfiHr'
    },
    braintree: {
        merchantId: 'nqqftmb3d2msqqvc',
        publicKey: '8q55tgwpbgg7999f',
        privateKey: '05401c1bca4c56f3cea691015c8ef800'
    },
    mailgun: {
        apiKey: 'f42ebc4b0ca9fdc79399e00aba3f8bef-2d27312c-485695af',
        domain: 'mg.rlux.uk',
        from: 'info@rlux.uk'
    }
};

module.exports = {
    app: app
};

'use strict';
const express = require('express');
const router = express.Router();
const config = require('../config');
const auth = require('../middleware/auth');
const { User } = require('../models/user');
const { Raffle } = require('../models/raffle');
const gateway = require('../braintree');
var request = require('request');
var paypal = require('paypal-rest-sdk');
const { v4: uuidv4 } = require('uuid');
var lodash = require('lodash');

var bodyParser = require('body-parser')
var parser = bodyParser.urlencoded({ extended: false });

var payments = [];

paypal.configure({
    'mode': 'live', //sandbox or live
    'client_id': config.app.paypal.clientId,
    'client_secret': config.app.paypal.secret
});

// Get purchase information from client and create a payment object
router.post('/purchase', auth, async (req, res) => {
    /*
    let raffle = await Raffle.findOne({ _id: req.body.raffleId });

    var payment = {
        raffleName: raffle.title + ' ' + raffle.subtitle,
        imgSrc: raffle.pictures[0],
        paymentId: uuidv4(),
        uid: req.user.uid,
        cost: req.body.cost,
        ticketCount: req.body.ticketCount,
        raffleId: req.body.raffleId
    }

    console.log(payment);

    payments.push(payment);

    res.status(200).json({ success: true, payment });
    */
   let user = await User.findOne({ uid: req.user.uid });
   const tickets = [];
   for (let index = 0; index < req.body.ticketCount; index++) {
       tickets.push(user._id);       
   }

   Raffle.findOneAndUpdate(
       { _id: req.body.raffleId },
       { $push: {tickets: { $each: tickets }}},
       { new: true },
       function ( error, doc ) {
           if (error ) {
            console.log(error);
            res.status(400).json({ success: false, error });
           }
           else {
            res.status(200).json({ success: true });
           }           
       }
    )

});

router.get('/payment/:id', (req, res) => {
    try {
        let data = lodash.filter(payments, x => x.paymentId === req.params.id);
        if (payments.length != 0 && data[0].paymentId != undefined) {
            res.render('payment', data[0]);
        } else {
            res.send('Unauthorized request.');
        }
    } catch (error) {
        console.log(error);
    }
});

router.post('/create-payment', parser, async (req, res) => {
    let data = lodash.filter(payments, x => x.paymentId === req.body.paymentId);
    let raffle = await Raffle.findOne({ _id: data[0].raffleId });

    const create_payment_json = {
        "intent": "sale",
        "payer": {
            "payment_method": "paypal",
        },
        "redirect_urls": {
            "return_url": "https://rluxappservices.com/api/payment/success",
            "cancel_url": "https://rluxappservices.com/api/payment/cancel"
        },
        "transactions": [{
            "item_list": {
                "items": [{
                    "name": data[0].raffleName,
                    "sku": "item",
                    "price": data[0].cost,
                    "currency": "GBP",
                    "quantity": 1
                }]
            },
            "amount": {
                "currency": "GBP",
                "total": data[0].cost
            },
            "description": "Tickets for " + data[0].raffleName
        }]
    };


    paypal.payment.create(create_payment_json, function (error, payment) {
        data[0].payerId = payment.id;

        if (error) {
            throw error;
        } else {
            for (let i = 0; i < payment.links.length; i++) {
                if (payment.links[i].rel === 'approval_url') {
                    res.redirect(payment.links[i].href);
                }
            }
        }
    });
});

router.get('/success', async (req, res) => {
    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;

    let data = lodash.filter(payments, x => x.payerId === req.query.paymentId);
    console.log('1')
    let user = await User.findOne({ uid: data[0].uid });
    console.log('2')

    const execute_payment_json = {
        "payer_id": payerId,
        "transactions": [{
            "amount": {
                "currency": "GBP",
                "total": data[0].cost
            }
        }]
    };


    paypal.payment.execute(paymentId, execute_payment_json, async function (error, payment) {
        if (error) {
            console.log(error.response);
            throw error;
        } else {
            var pos = payments.indexOf(data[0]);
            payments.splice(pos, 1);

            console.log(`User: ${user._id} purchase successful.`);

            const tickets = [];

            for (let index = 0; index < data[0].ticketCount; index++) {
                tickets.push(user._id);
            }

            Raffle.findOneAndUpdate(
                { _id: data[0].raffleId },
                { $push: { tickets: { $each: tickets } } },
                { new: true },
                function (err, doc) {
                    if (err) {
                        console.log(err);
                    }
                });

            res.render('success');
        }
    });
});

router.get('/cancel', (req, res) => res.send('Cancelled'));

module.exports = router;

'use strict';
const express = require('express');
const router = express.Router();
const config = require('../config');
const auth = require('../middleware/auth');
const { User } = require('../models/user');
const { Raffle } = require('../models/raffle');
const gateway = require('../braintree');

// router.post('/payment/stripe', auth,
//     async function (req, res) {
//         let user = await User.findOne({ uid: req.user.uid });

//         stripe.charges
//             .create({
//                 amount: req.body.cost * 100, // Unit: cents
//                 currency: 'gbp',
//                 source: req.body.token,
//                 description: `${req.body.ticketCount} x ${req.body.raffleId} ticket purchased by ${user.name.first} ${user.name.last}.`,
//             })
//             .then(result => {
//                 console.log(`User: ${user._id} purchase successful.`);

//                 const tickets = [];

//                 for (let index = 0; index < req.body.ticketCount; index++) {
//                     tickets.push(user._id);
//                 }

//                 Raffle.findOneAndUpdate(
//                     { _id: req.body.raffleId },
//                     { $push: { tickets: { $each: tickets } } },
//                     { new: true },
//                     function (err, doc) {
//                         if (err) {
//                             console.log(err);
//                         }

//                         res.status(200).json({ success: true, result });
//                     });
//             })
//             .catch(err => {
//                 console.log(`User: ${user._id} purchase failed: ${err}`);
//                 res.status(400).json({ success: false, err });
//             });
//     });

router.post('/payment/braintree/checkout', auth,
    async function (req, res) {
        let user = await User.findOne({ uid: req.user.uid });
        console.log(req.body);

        gateway.transaction.sale({
            amount: req.body.cost,
            paymentMethodNonce: req.body.nonce,
            options: {
                submitForSettlement: true
            }
        }, async function (err, result) {
            if (err || result.errors) {

                console.log(err);

                res.status(400).json({ success: result.success, err });
            } else {
                console.log(`User: ${user._id} purchase successful.`);

                const tickets = [];

                for (let index = 0; index < req.body.ticketCount; index++) {
                    tickets.push(user._id);
                }

                Raffle.findOneAndUpdate(
                    { _id: req.body.raffleId },
                    { $push: { tickets: { $each: tickets } } },
                    { new: true },
                    function (err, doc) {
                        if (err) {
                            console.log(err);
                        }

                        res.status(200).json({ success: result.success, result });
                    });
            }
        });
    });

module.exports = router;

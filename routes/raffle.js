'use strict';
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Raffle } = require('../models/raffle');
const { User } = require('../models/user');
var mongoose = require('mongoose');
const admin = require('firebase-admin');
const ejs = require('ejs');
var path = require('path');
var fs = require('fs');
const config = require('../config');

var api_key = config.app.mailgun.apiKey;
var domain = config.app.mailgun.domain;
var mailgun = require('mailgun-js')({ apiKey: api_key, domain: domain });

let allRaffles = [];
let scheduledRaffles = [];
let liveRaffles = [];
let endedRaffles = [];

setInterval(async function () {
    const dbRaffles = await Raffle.find({});

    allRaffles = [];
    scheduledRaffles = [];
    liveRaffles = [];
    endedRaffles = [];

    for (const raffle of dbRaffles) {
        const {
            _id,
            status,
            title,
            subtitle,
            description,
            availableSizes,
            ticketPrice,
            minParticipants,
            question,
            startedAt,
            startDate,
            duration,
            isEnded,
            winner,
            winnerMessage,
            isClaimed,
            tickets
        } = raffle;

        const newRaffle = {
            _id,
            status,
            title,
            subtitle,
            description,
            availableSizes,
            ticketPrice,
            minParticipants,
            question,
            requiredParticipantsLeft: raffle.getRequiredParticipantsLeft(),
            startedAt,
            startDate,
            duration,
            isEnded,
            winner,
            winnerMessage,
            tickets,
            isClaimed,
            myTickets: 0,
            participants: raffle.getParticipants(),
            pictures: raffle.getThumbnails(),
            endsAt: -1
        };

        const lastThreeParticipantsId = raffle.getLastThreeParticipants();
        const lastThreeParticipants = [];

        for (const participantId in lastThreeParticipantsId) {
            let user = await User.findOne({ '_id': lastThreeParticipantsId[participantId] });
            let profilePicture = user.getProfilePictureUri();

            lastThreeParticipants.push(profilePicture);
        }

        newRaffle.lastThreeParticipants = lastThreeParticipants;

        if (newRaffle.status === 'Ended') {
            let user = await User.findOne({ '_id': newRaffle.winner });
            newRaffle.winner = {
                name: user.name,
                picture: user.getProfilePictureUri(),
                _id: newRaffle.winner
            };

            endedRaffles.push(newRaffle);
        } else if (newRaffle.status === 'Ongoing') {
            const startedAtMs = new Date(startedAt).getTime();
            const durationMs = (duration * 60 * 60 * 1000);
            const endDate = startedAtMs + durationMs;

            if (endDate <= Date.now()) {

                const participants = newRaffle.participants;

                const winner = participants[Math.floor(Math.random() * participants.length)];

                console.log(`Raffle: ${newRaffle.title} ${newRaffle.subtitle} ended. Winner: ${winner}`);
                Raffle.findOneAndUpdate(
                    { _id: newRaffle._id },
                    { $set: { status: 'Ended', winner: mongoose.Types.ObjectId(winner) } },
                    { new: true },
                    function (err, doc) {
                        if (err) console.log(err);
                    });

                endedRaffles.push(newRaffle);

                let winnerUser = await User.findOne({ '_id': winner });

                console.log('Winner user: ', winnerUser);

                let winnerFcmToken = winnerUser.fcm_token;

                console.log('Winner FCM token: ', winnerFcmToken);

                if (winnerFcmToken !== null && winnerFcmToken !== undefined) {

                    var message = {
                        notification: {
                            title: 'You have won!',
                            body: `You have won the "${newRaffle.title} ${newRaffle.subtitle}" raffle!`
                        },
                        token: winnerFcmToken
                    };

                    admin.messaging().send(message)
                        .then((response) => {
                            console.log('Successfully sent message:', response);
                        })
                        .catch((error) => {
                            console.log('Error sending message:', error);
                        });
                }

            } else {
                newRaffle.endsAt = endDate;
                liveRaffles.push(newRaffle);
            }

        } else if (newRaffle.status === 'Starting') {
            if (newRaffle.participants.length >= newRaffle.minParticipants) {
                console.log(`Starting raffle: ${newRaffle.title} ${newRaffle.subtitle}.`);

                Raffle.findOneAndUpdate(
                    { _id: newRaffle._id },
                    { $set: { status: 'Ongoing', startedAt: Date.now() } },
                    { new: true },
                    function (err, doc) {
                        if (err) console.log(err);
                    });
            }
            liveRaffles.push(newRaffle);
        } else if (newRaffle.status === 'Scheduled') {
            // If current date > Raffle Date

            let startDateISO = new Date(newRaffle.startDate).toISOString();
            let currentDateISO = new Date(Date.now()).toISOString();

            if (startDateISO <= currentDateISO) {
                // Change draw status to Starting
                Raffle.findOneAndUpdate(
                    { _id: newRaffle._id },
                    { $set: { status: 'Starting' } },
                    { new: true },
                    function (err, doc) {
                        if (err) console.log(err);
                    });

                var message = {
                    notification: {
                        title: 'New Draw Alert',
                        body: `Win the ${title} ${subtitle} now!`
                    },
                    topic: '/topics/all'
                };

                admin.messaging().send(message)
                    .then((response) => {
                        console.log('Successfully sent message:', response);
                    })
                    .catch((error) => {
                        console.log('Error sending message:', error);
                    });
            }
            scheduledRaffles.push(newRaffle);
        }

        if (newRaffle.status !== 'Scheduled') {
            allRaffles.push(newRaffle);
        }
    }
}, 1000);

router.post('/fetchAll', auth,
    async function (req, res) {
        try {
            let rafflesResponse;
            rafflesResponse = await JSON.parse(JSON.stringify(allRaffles));

            let scheduledRafflesResponse;
            scheduledRafflesResponse = await JSON.parse(JSON.stringify(scheduledRaffles));

            let user = await User.findOne({ uid: req.user.uid });

            for (const raffle in rafflesResponse) {
                if (rafflesResponse[raffle].tickets !== undefined) {
                    rafflesResponse[raffle].myTickets = getUserTicketCount(rafflesResponse[raffle].tickets, user._id);
                }
            }

            res.status(200).json({
                raffles: rafflesResponse,
                scheduledRaffles: scheduledRafflesResponse
            });
        } catch (err) {
            console.log('Error fetching raffles: ', err);
            res.status(400).json({ error: 'Error fetching raffles.' });
        }
    }
);

router.post('/fetchAllGuest',
    async function (req, res) {
        try {
            let rafflesResponse;
            rafflesResponse = await JSON.parse(JSON.stringify(allRaffles));

            let scheduledRafflesResponse;
            scheduledRafflesResponse = await JSON.parse(JSON.stringify(scheduledRaffles));

            for (const raffle in rafflesResponse) {
                if (rafflesResponse[raffle].tickets !== undefined) {
                    rafflesResponse[raffle].myTickets = getUserTicketCount(rafflesResponse[raffle].tickets, 'guestUser');
                }
            }

            res.status(200).json({
                raffles: rafflesResponse,
                scheduledRaffles: scheduledRafflesResponse
            });
        } catch (err) {
            console.log('Error fetching raffles: ', err);
            res.status(400).json({ error: 'Error fetching raffles.' });
        }
    }
);

router.post('/editWinnerMessage', auth,
    async function (req, res) {
        try {
            let raffle = await Raffle.findOne({ _id: req.body.raffleId });
            let user = await User.findOne({ uid: req.user.uid });

            console.log('Claiming reward');

            if (user._id.toString() === raffle.winner.toString()) {
                raffle.winnerMessage = req.body.message;

                await raffle.save();

                res.status(200).json({
                    success: true
                });
            } else {
                console.log('Winner is not matching.')
                res.status(401).json({ error: 'Invalid request.', success: false });
            }
        } catch (err) {
            console.log(err);
            res.status(400).json({ error: 'Failed claiming reward.', success: false });
        }
    }
);

router.post('/claimReward', auth,
    async function (req, res) {
        try {
            let raffle = await Raffle.findOne({ _id: req.body.raffleId });
            let user = await User.findOne({ uid: req.user.uid });

            console.log('Claiming reward');

            if (user._id.toString() === raffle.winner.toString()) {
                raffle.isClaimed = true;
                raffle.winnerShoeSize = req.body.shoeSize;
                raffle.winnerMessage = req.body.message;

                await raffle.save();

                let winnerUser = await User.findOne({ '_id': raffle.winner });

                // var data = {
                //     from: `RLUX Support <${config.app.mailgun.from}>`,
                //     cc: `RLUX Support <${config.app.mailgun.from}>`,
                //     to: `${winnerUser.email}`,
                //     subject: 'Raffle Notification',
                //     text:
                //         `
                //     Congratulations ${winnerUser.name.first} ${winnerUser.name.last}! You have successfully claimed your prize. An RLUX representative will contact you shortly!

                //     Your details:

                //     Requested shoe size: ${raffle.winnerShoeSize}

                //     State: ${winnerUser.shipping_details.state}
                //     Postal code: ${winnerUser.shipping_details.postal_code}
                //     City: ${winnerUser.shipping_details.city}
                //     Street: ${winnerUser.shipping_details.street}
                //     House number: ${winnerUser.shipping_details.house_number}
                //     Phone number: ${winnerUser.shipping_details.phone_number}
                //     `,
                //     html: '<h1>Testing some Mailgun awesomness!</h1>'
                // };

                // mailgun.messages().send(data, function (error, body) {
                //     console.log(body);
                // });

                var textData =
                    `
                    Congratulations ${winnerUser.name.first} ${winnerUser.name.last}! You have successfully claimed your prize. An RLUX representative will contact you shortly!
                    
                    Your details:
                    
                    Requested shoe size: ${raffle.winnerShoeSize}

                    State: ${winnerUser.shipping_details.state}
                    Postal code: ${winnerUser.shipping_details.postal_code}
                    City: ${winnerUser.shipping_details.city}
                    Street: ${winnerUser.shipping_details.street}
                    House/flat number: ${winnerUser.shipping_details.house_number}
                    Phone number: ${winnerUser.shipping_details.phone_number}
                    `;

                var ejsData = {
                    shoeImgSource: raffle.getThumbnails()[0],
                    shoeName: `${raffle.title} ${raffle.subtitle}`,
                    name: `${winnerUser.name.first} ${winnerUser.name.last}`,
                    size: `${raffle.winnerShoeSize}`,
                    state: `${winnerUser.shipping_details.state}`,
                    postalCode: `${winnerUser.shipping_details.postal_code}`,
                    city: `${winnerUser.shipping_details.city}`,
                    street: `${winnerUser.shipping_details.street}`,
                    houseNumber: `${winnerUser.shipping_details.house_number}`,
                    phoneNumber: `${winnerUser.shipping_details.phone_number}`
                }

                var emailTemplatePath = path.join(__dirname, '../', 'mail_template.ejs');

                ejs.renderFile(emailTemplatePath, { ejsData }, (err, htmlString) => {
                    if (err) console.error(err);

                    var data = {
                        from: `RLUX Support <${config.app.mailgun.from}>`,
                        cc: `RLUX Support <${config.app.mailgun.from}>`,
                        to: `${winnerUser.email}`,
                        subject: 'Congratulations',
                        text: textData,
                        html: htmlString
                    };

                    mailgun.messages().send(data, function (error, body) {
                        console.log(body);
                    });
                });

                res.status(200).json({
                    success: true
                });
            } else {
                console.log('Winner is not matching.')
                res.status(401).json({ error: 'Invalid request.', success: false });
            }
        } catch (err) {
            console.log(err);
            res.status(400).json({ error: 'Failed claiming reward.', success: false });
        }
    }
);

router.post('/submitRaffle', auth,
    async function (req, res) {
        try {
            let user = await User.findOne({ uid: req.user.uid });
            const { raffleId } = req.body;

            if (user.isAdmin) {
                const {
                    title,
                    subtitle,
                    description,
                    availableSizes,
                    ticketPrice,
                    minParticipants,
                    question,
                    duration
                } = req.body;

                let raffle = await Raffle.findOne({ _id: raffleId });

                if (raffle) {
                    // Edit existing raffle
                    raffle.title = title;
                    raffle.subtitle = subtitle;
                    raffle.description = description;
                    raffle.availableSizes = availableSizes;
                    raffle.ticketPrice = ticketPrice;
                    raffle.minParticipants = minParticipants;
                    raffle.question = question;
                    raffle.duration = duration;
                    await raffle.save();
                } else {
                    // Create new raffle
                    raffle = new Raffle({
                        title,
                        subtitle,
                        description,
                        availableSizes,
                        ticketPrice,
                        minParticipants,
                        question,
                        duration
                    });

                    await raffle.save();
                }
            } else {
                res.status(401).json({
                    success: false,
                    message: 'Unauthorized request.'
                });
            }

            res.status(200).json({
                success: true
            });

        } catch (err) {
            console.log(err);
            res.status(400).json({ error: 'Failed submitting raffle.', success: false });
        }
    }
);

router.get('/currentTime', (req, res) => {
    res.status(200).json({
        time: Date.now()
    })
});

router.get('/serverVersion', (req, res) => {
    res.status(200).json({
        version: config.app.serverVersion
    })
});

const getUserTicketCount = function (array, value) {
    var count = 0;
    for (var i = 0; i < array.length; ++i) {
        if (array[i] == value)
            count++;
    }
    return count;
};

module.exports = router;

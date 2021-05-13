'use strict';
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Raffle } = require('../models/raffle');
const { User } = require('../models/user');
var mongoose = require('mongoose');

var api_key = 'c5383082ea3175846dfd0b8c0866ca6b-c8e745ec-9d65ac89';
var domain = 'sandboxcab7c252eef946c4b1a60a950233df6d.mailgun.org';
var mailgun = require('mailgun-js')({ apiKey: api_key, domain: domain });

let allRaffles = [];
let liveRaffles = [];
let endedRaffles = [];

setInterval(async function () {
    const dbRaffles = await Raffle.find({});

    allRaffles = [];
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
            duration,
            isEnded,
            winner,
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
            duration,
            isEnded,
            winner,
            tickets,
            isClaimed,
            myTickets: 0,
            participants: raffle.getParticipants(),
            pictureUrl: raffle.getThumbnail(),
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
        }

        allRaffles.push(newRaffle);
    }
}, 1000);

router.post('/fetchAll', auth,
    async function (req, res) {
        try {
            let rafflesResponse;
            let user = await User.findOne({ uid: req.user.uid });
            rafflesResponse = await JSON.parse(JSON.stringify(allRaffles));

            for (const raffle in rafflesResponse) {
                if (rafflesResponse[raffle].tickets !== undefined) {
                    rafflesResponse[raffle].myTickets = getUserTicketCount(rafflesResponse[raffle].tickets, user._id);
                }
            }

            res.status(200).json({
                raffles: rafflesResponse
            });
        } catch (err) {
            console.log('Error fetching raffles: ', err);
            res.status(400).json({ error: 'Error fetching raffles.' });
        }
    }
);

router.post('/claimReward', auth,
    async function (req, res) {
        try {
            let raffle = await Raffle.findOne({ _id: req.body.raffleId });
            let user = await User.findOne({ uid: req.user.uid });

            console.log('Claiming reward');
            console.log(user._id)
            console.log(raffle.winner)


            if (user._id.toString() === raffle.winner.toString()) {
                raffle.isClaimed = true;
                raffle.winnerShoeSize = req.body.shoeSize;
                raffle.winnerMessage = req.body.message;

                await raffle.save();

                var data = {
                    from: 'RLUX Sandbox <fmartin999b@gmail.com>',
                    to: user.email,
                    subject: 'Hello TEST',
                    text: 'Testing some Mailgun awesomeness!'
                };

                mailgun.messages().send(data, function (error, body) {
                    console.log(body);
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

const getUserTicketCount = function (array, value) {
    var count = 0;
    for (var i = 0; i < array.length; ++i) {
        if (array[i] == value)
            count++;
    }
    return count;
};

module.exports = router;

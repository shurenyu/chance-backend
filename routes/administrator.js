'use strict';
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Raffle } = require('../models/raffle');
const { User } = require('../models/user');
var mongoose = require('mongoose');
const multer = require('multer');
const admin = require('firebase-admin');

const upload = multer({ dest: 'uploads/raffles/', limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/submitRaffle', auth, upload.array('images', 99),
    async function (req, res) {
        try {
            let user = await User.findOne({ uid: req.user.uid });

            if (user.isAdmin) {
                const {
                    title,
                    subtitle,
                    description,
                    shoeSizes,
                    ticketPrice,
                    minParticipants,
                    question,
                    duration,
                    startDate,
                    raffleId
                } = req.body;

                let raffle = await Raffle.findOne({ _id: raffleId });

                if (raffle) {
                    // Edit existing raffle
                    raffle.title = title;
                    raffle.subtitle = subtitle;
                    raffle.description = description;
                    raffle.availableSizes = JSON.parse(shoeSizes);
                    raffle.ticketPrice = ticketPrice;
                    raffle.minParticipants = minParticipants;
                    raffle.question = {
                        questionLine: req.body.question,
                        answers: getAnswersArrayFromRequest(req.body),
                        correctAnswerIndex: 0
                    },
                        raffle.duration = duration;
                    raffle.startDate = new Date(startDate);
                    raffle.pictures = getPicturesFromFiles(req.files)

                    await raffle.save();
                    console.log('Edited raffle with ID: ', raffle._id);
                } else {
                    // Create new raffle
                    raffle = new Raffle({
                        title,
                        subtitle,
                        description,
                        availableSizes: JSON.parse(shoeSizes),
                        ticketPrice,
                        minParticipants,
                        question: {
                            questionLine: req.body.question,
                            answers: getAnswersArrayFromRequest(req.body),
                            correctAnswerIndex: 0
                        },
                        startDate: new Date(startDate),
                        duration,
                        pictures: getPicturesFromFiles(req.files)
                    });

                    await raffle.save();
                    console.log('Submitted new raffle with ID: ', raffle._id);
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

router.post('/deleteRaffle', auth, upload.array('images', 99),
    async function (req, res) {
        try {
            let user = await User.findOne({ uid: req.user.uid });
            const {
                raffleId
            } = req.body;

            if (user.isAdmin) {
                await Raffle.findByIdAndRemove(raffleId, (err) => {
                    if (!err) {
                        console.log('Raffle deleted.');
                        res.status(200).json({
                            success: true
                        });
                    }
                });
            } else {
                res.status(401).json({
                    success: false,
                    message: 'Unauthorized request.'
                });
            }

        } catch (err) {
            console.log(err);
            res.status(400).json({ error: 'Failed deleting raffle.', success: false });
        }
    }
);

function getPicturesFromFiles(files) {
    let pictures = [];
    for (let index = 0; index < files.length; index++) {
        let file = files[index];
        let image = '/static/raffles/' + file.filename;
        pictures.push(image);
    }

    return pictures;
}

function getAnswersArrayFromRequest(body) {
    let arr = [];
    arr.push(body.answer0);
    arr.push(body.answer1);
    if (body.answer2 !== undefined) {
        arr.push(body.answer2);
    }
    return arr;
}

module.exports = router;

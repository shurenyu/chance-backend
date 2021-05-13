'use strict';
var path = require('path');
const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const app = express();
const admin = require('firebase-admin');

const auth = require('./routes/auth');
const user = require('./routes/user');
const raffle = require('./routes/raffle');
const payment = require('./routes/payment');
const { Raffle } = require('./models/raffle');

// Init Firebase
const serviceAccount = require('./firebase_service_account_key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// Connect to DB
const mongoUser = 'admin';
const mongoPw = '63e4S9BpbpxH5z9';
// const url = `mongodb://${mongoUser}:${mongoPw}@localhost:27017/rlux`;
const url = `mongodb://localhost/rlux`;
mongoose.connect(url, { useNewUrlParser: true })
    .then(() => {
        console.log('Connected to MongoDB.');
    }).catch((err) => {
        console.log('Failed to connect to MongoDB: ', err);
    })

// Routes
app.use('/api/static', express.static(path.join(__dirname + '/uploads')));
app.use('/api/auth', auth);
app.use('/api/user', user);
app.use('/api/raffle', bodyParser.json(), raffle);
app.use('/api/', bodyParser.json(), payment);

const serverHttp = http.createServer(app);

serverHttp.listen(3000, function () {
    console.log('HTTP server running at http://localhost:3000/');
});

// TEST

// const raffleOne = new Raffle({
//     title: 'NIKE',
//     subtitle: 'Lunar Force 1 x Acronym',
//     description: 'Errolson Hugh’s connection to the Air Force 1 runs deep. Having worked on the Bruce Kilgore design in past collaborative projects, Hugh’s love for the 1 is true, understanding what it takes to maximize everyday benefits In the design. Staying true to the white-on-white while ensuring his product is beneficial, Errolson’s new AF-1 Low harkens back to his first-ever collaborative design. A side-zip allows for easy on-and-off without ever untying your laces, while the premium leather upper arrives in the unmistakable white-on-white finish.',
//     availableSizes: ['UK4', 'UK5', 'UK6'],
//     pictureUrl: '/static/raffles/sample_shoe.png',
//     startedAt: Date.now(),
//     status: 'Starting',
//     ticketPrice: 0.99,
//     minParticipants: 5,
//     duration: 24,
//     question: {
//         questionLine: 'How much is 5+5?',
//           answers: [
//               '3',
//               '19',
//               '10'
//           ],
//           correctAnswerIndex: 2
//     }
// });

// const raffleTwo = new Raffle({
//     title: 'CONVERSE',
//     subtitle: 'Custom Chuck 70',
//     description: 'Errolson Hugh’s connection to the Air Force 1 runs deep. Having worked on the Bruce Kilgore design in past collaborative projects, Hugh’s love for the 1 is true, understanding what it takes to maximize everyday benefits In the design. Staying true to the white-on-white while ensuring his product is beneficial, Errolson’s new AF-1 Low harkens back to his first-ever collaborative design. A side-zip allows for easy on-and-off without ever untying your laces, while the premium leather upper arrives in the unmistakable white-on-white finish.',
//     availableSizes: ['UK4', 'UK5', 'UK6'],
//     pictureUrl: '/static/raffles/sample_shoe_3.png',
//     status: 'Starting',
//     ticketPrice: 2.25,
//     minParticipants: 10,
//     duration: 24,
//     question: {
//         questionLine: 'Are dolphins fish or mammals?',
//           answers: [
//               'Fish',
//               'Mammals'
//           ],
//           correctAnswerIndex: 1
//     }
// });

// const raffleThree = new Raffle({
//     title: 'CONVERSE',
//     subtitle: 'One Star Suede',
//     description: 'Errolson Hugh’s connection to the Air Force 1 runs deep. Having worked on the Bruce Kilgore design in past collaborative projects, Hugh’s love for the 1 is true, understanding what it takes to maximize everyday benefits In the design. Staying true to the white-on-white while ensuring his product is beneficial, Errolson’s new AF-1 Low harkens back to his first-ever collaborative design. A side-zip allows for easy on-and-off without ever untying your laces, while the premium leather upper arrives in the unmistakable white-on-white finish.',
//     availableSizes: ['UK4', 'UK5', 'UK6'],
//     pictureUrl: '/static/raffles/sample_shoe_2.png',
//     ticketPrice: 1.75,
//     status: 'Starting',
//     minParticipants: 5,
//     duration: 24,
//     question: {
//         questionLine: 'Is blue a warm or a cold color?',
//           answers: [
//               'WARM',
//               'COLD'
//           ],
//           correctAnswerIndex: 1
//     }
// });

// raffleOne.save();
// raffleTwo.save();
// raffleThree.save();

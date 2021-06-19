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
const administrator = require('./routes/administrator');
const { Raffle } = require('./models/raffle');

// Init Firebase
const serviceAccount = require('./firebase_service_account_key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// Connect to DB
const mongoUser = 'chance';
const mongoPw = '49K87jd454s90aE4dx6m7';
const url = `mongodb://${mongoUser}:${mongoPw}@3.131.42.170:27017/chance?authSource=admin`;
//const url = `mongodb://localhost:27017/chance`;
mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Connected to MongoDB.');
    }).catch((err) => {
        console.log('Failed to connect to MongoDB: ', err);
    })

// Routes
app.use('/api/static', express.static(path.join(__dirname + '/uploads')));
app.use(express.static(__dirname + '/public'));
app.use('/api/auth', auth);
app.use('/api/administrator', administrator);
app.use('/api/user', user);
app.use('/api/raffle', bodyParser.json(), raffle);
app.use('/api/payment', bodyParser.json(), payment);
// app.get('/payment', function (req, res) {
//     res.sendFile(path.join(__dirname + '/payment.html'));
// });

app.set('views', path.join(__dirname + '/views'));
app.set('view engine', 'ejs');

const serverHttp = http.createServer(app);

serverHttp.listen(3000, function () {
    console.log('HTTP server running at http://localhost:3000/');
});
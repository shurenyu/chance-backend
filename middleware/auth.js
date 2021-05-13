'use strict';
const admin = require('firebase-admin');

module.exports = function (req, res, next) {
    const firebaseToken = req.header('x-auth-token');
    if (!firebaseToken) return res.status(401).send('Access denied. No token provided.');

    admin.auth().verifyIdToken(firebaseToken)
        .then((decodedToken) => {
            req.user = decodedToken;
            next();
        }).catch((error) => {
            res.status(400).json({ error: 'Firebase authentication failed.' });
            console.log(error);
        });
};

'use strict';
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { User } = require('../models/user');
const bodyParser = require('body-parser');
const gateway = require('../braintree');

router.post('/', bodyParser.json(), auth,
    async function (req, res) {
        try {
            let user = await User.findOne({ uid: req.user.uid });
            let clientToken;

            if (!user) {
                try {
                    user = await createUserModel(req.user, req.body);
                } catch (error) {
                    res.status(400).json({ success: false, message: 'User creation failed. Please contact the developer.' });
                    console.log('Error creating user: ', error);
                }
            } else {
                user.email = req.body.facebookEmail || req.user.email;
                await user.save();
            }

            user.profile_picture_uri = user.getProfilePictureUri();

            const newUser = user.toObject();

            gateway.clientToken.generate(null, async function (err, response) {
                newUser.clientToken = response.clientToken;

                res.status(200).json({
                    success: true,
                    message: 'Success',
                    user: newUser
                });
            });

        } catch (error) {
            console.log(error);
            res.status(400).json({ success: false, message: 'Authentication failed. Please contact the developer.' });
        }
    }
);

async function createUserModel(firebaseUser, body) {
    let user = new User({
        uid: firebaseUser.uid,
        email: body.facebookEmail || firebaseUser.email,
        name: {
            first: body.first_name,
            last: body.last_name
        },
        facebook_picture_uri: body.facebook_user_id !== undefined ? `https://graph.facebook.com/${body.facebook_user_id}/picture?height=220` : undefined,
        isFacebookUser: body.facebook_user_id !== undefined
    });

    await user.save();
    return user;
}

module.exports = router;

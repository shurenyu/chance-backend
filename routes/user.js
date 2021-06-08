'use strict';
const express = require('express');
const multer = require('multer');
const router = express.Router();
const auth = require('../middleware/auth');
const { User } = require('../models/user');

const upload = multer({ dest: 'uploads/avatars/' });

function formatName(string) {
    const lowerCase = string.toLowerCase();
    return lowerCase.charAt(0).toUpperCase() + lowerCase.slice(1);
}

router.post('/edit', auth, upload.single('avatar'),
    async function (req, res) {
        try {
            let user = await User.findOne({ uid: req.user.uid });

            if (!user) {
                res.status(401).json({ success: false, message: 'User not found.' });
            }

            if (req.file) {
                user.profile_picture_uri = '/static/avatars/' + req.file.filename;
            }

            if (req.body.first_name) {
                user.name.first = formatName(req.body.first_name);
            }

            if (req.body.last_name) {
                user.name.last = formatName(req.body.last_name);
            }

            if (req.body.shipping_first_name) {
                user.shipping_details.first_name = formatName(req.body.shipping_first_name);
            }

            if (req.body.shipping_last_name) {
                user.shipping_details.last_name = formatName(req.body.shipping_last_name);
            }

            if (req.body.street) {
                user.shipping_details.street = formatName(req.body.street);
            }

            if (req.body.house_number) {
                user.shipping_details.house_number = req.body.house_number;
            }

            if (req.body.city) {
                user.shipping_details.city = formatName(req.body.city);
            }

            if (req.body.state) {
                user.shipping_details.state = formatName(req.body.state);
            }

            if (req.body.postal_code) {
                user.shipping_details.postal_code = req.body.postal_code;
            }

            if (req.body.phone_number) {
                user.shipping_details.phone_number = req.body.phone_number;
            }

            if (req.body.fcmToken) {
                user.fcm_token = req.body.fcmToken;
            }

            console.log('BODY:', req.body);

            await user.save();

            user.profile_picture_uri = user.getProfilePictureUri();

            res.status(200).json({
                success: true,
                message: 'Success',
                user
            });
        } catch (error) {
            console.log(error);
            res.status(400).json({ success: false, message: 'Authentication failed. Please contact the developer.' });
        }
    }
);

module.exports = router;

'use strict';
const mongoose = require('mongoose');
const config = require('../config');

const userSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  isFacebookUser: {
    type: Boolean,
    required: true
  },
  name: {
    first: {
      type: String
    },
    last: {
      type: String
    }
  },
  profile_picture_uri: {
    type: String
  },
  facebook_picture_uri: {
    type: String
  },
  shipping_details: {
    first_name: {
      type: String
    },
    last_name: {
      type: String
    },
    street: {
      type: String
    },
    house_number: {
      type: String
    },
    city: {
      type: String
    },
    state: {
      type: String
    },
    postal_code: {
      type: String
    },
    phone_number: {
      type: String
    }
  }
});

userSchema.methods.getProfilePictureUri = function () {
  if (this.profile_picture_uri !== undefined && this.profile_picture_uri) {
    return config.app.publicUrl + '/api' + this.profile_picture_uri;
  } else if (this.facebook_picture_uri !== undefined && this.facebook_picture_uri) {
    return this.facebook_picture_uri;
  }

  return undefined;
};

const User = mongoose.model('User', userSchema);
exports.User = User;

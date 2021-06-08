'use strict';
const mongoose = require('mongoose');
const config = require('../config');

const raffleSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ['Scheduled', 'Starting', 'Ongoing', 'Ended'],
        default: 'Scheduled'
    },
    title: {
        type: String,
        required: true
    },
    subtitle: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    availableSizes: {
        type: [String],
        required: true
    },
    pictures: {
        type: [String],
        required: true
    },
    ticketPrice: {
        type: Number,
        required: true
    },
    minParticipants: {
        type: Number,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    question: {
        questionLine: {
            type: String
        },
        answers: [String],
        correctAnswerIndex: {
            type: Number
        }
    },
    startedAt: {
        type: Date
    },
    duration: {
        type: Number,
        required: true
    },
    tickets: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'User'
    },
    winner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    winnerMessage: {
        type: String
    },
    winnerShoeSize: {
        type: String
    },
    isClaimed: {
        type: Boolean,
        default: false
    }
});

raffleSchema.methods.getThumbnails = function () {
    let images = [];

    for (let index = 0; index < this.pictures.length; index++) {
        let image = this.pictures[index];
        image = config.app.publicUrl + '/api' + image;
        images.push(image);
    }

    return images;
};

raffleSchema.methods.getParticipants = function () {
    const participants = [];

    // Remove toString calls to return required tickets instead
    for (const ticket of this.tickets) {
        if (!participants.includes(ticket.toString())) {
            participants.push(ticket.toString());
        }
    }

    return participants;
};

raffleSchema.methods.getLastThreeParticipants = function () {
    const participants = [];
    let lastThreeParticipants = [];

    for (const ticket of this.tickets) {
        if (!participants.includes(ticket.toString())) {
            participants.push(ticket.toString());
        }
    }

    for (let i = participants.length - 1; i >= 0; i--) {
        lastThreeParticipants.push(participants[i]);
    }

    lastThreeParticipants = lastThreeParticipants.slice(0, 3);

    return lastThreeParticipants;
};

raffleSchema.methods.getRequiredParticipantsLeft = function () {
    let required = this.minParticipants - this.getParticipants().length;
    required = required < 0 ? 0 : required;

    return required;
};

const Raffle = mongoose.model('Raffle', raffleSchema);
exports.Raffle = Raffle;

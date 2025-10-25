const mongoose = require('mongoose');

const stateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, unique: true },
  country: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true }
});

module.exports = mongoose.model('State', stateSchema); 
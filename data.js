const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/mydatabase')

const PilotInfo = mongoose.Schema({
  img: String,
  number: String,
  date: String,
  description: String
});

module.exports = mongoose.model('Pilot' , PilotInfo);
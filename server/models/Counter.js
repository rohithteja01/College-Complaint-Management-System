const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  seq: {
    type: Number,
    default: 0,
  },
});

/**
 * Get next sequence number atomically for a given counter key
 * @param {string} counterName
 * @returns {Promise<number>}
 */
counterSchema.statics.getNextSequence = async function (counterName) {
  const counter = await this.findOneAndUpdate(
    { id: counterName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return counter.seq;
};

const Counter = mongoose.model('Counter', counterSchema);

module.exports = Counter;

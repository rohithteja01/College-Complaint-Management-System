const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Department name must be at least 2 characters long'],
      maxlength: [100, 'Department name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Initial default institutional departments list
const DEFAULT_DEPARTMENTS = [
  { name: 'IT Support', description: 'Campus Wi-Fi, lab computers, servers, network hardware and portal accounts' },
  { name: 'Hostel Administration', description: 'Hostel room allocations, furniture, plumbing, and warden grievances' },
  { name: 'Infrastructure', description: 'Building repairs, painting, civil works, roads, and campus facilities' },
  { name: 'Electrical Maintenance', description: 'Lighting, power sockets, fans, air conditioning, and electrical distribution' },
  { name: 'Transport', description: 'College buses, shuttle routes, vehicle parking, and transit scheduling' },
  { name: 'Housekeeping', description: 'Sanitation, washrooms, classroom cleaning, and waste management' },
  { name: 'Academic Administration', description: 'Classrooms, timetable coordination, and lecture hall equipment' },
  { name: 'Laboratory', description: 'Scientific instruments, lab equipment, chemical supplies, and workshop tools' },
  { name: 'Library', description: 'Reading halls, book issuance, digital catalog, and study environments' },
  { name: 'Canteen Management', description: 'Food quality, cafeteria hygiene, pricing compliance, and dining facility upkeep' },
];

/**
 * Seed initial departments if database is empty
 */
departmentSchema.statics.seedDefaultsIfEmpty = async function () {
  const count = await this.countDocuments();
  if (count === 0) {
    console.log('[Department] Seeding default institutional departments...');
    await this.insertMany(DEFAULT_DEPARTMENTS);
  }
};

const Department = mongoose.model('Department', departmentSchema);

module.exports = {
  Department,
  DEFAULT_DEPARTMENTS,
};

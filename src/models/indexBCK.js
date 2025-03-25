const sequelize = require('../config/database');
const User = require('./user');
const State = require('./state');
const District = require('./district');
const Profile = require('./profile');
const UserBank = require('./userBank');
const UserAddress = require('./userAddress');
const VertexKey = require('./vertexKey');
const VertexPin = require('./vertexPin');

// Initialize models
const models = {
  User,
  State,
  District,
  Profile,
  UserBank,
  UserAddress,
  VertexKey,
  VertexPin
};

// Define associations
User.hasOne(Profile, { foreignKey: 'user_id', as: 'profile' });
Profile.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(UserBank, { foreignKey: 'user_id', as: 'userBank' });
UserBank.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(UserAddress, { foreignKey: 'user_id', as: 'userAddress' });
UserAddress.belongsTo(User, { foreignKey: 'user_id' });

// Pin associations
VertexPin.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignedUser' });
VertexPin.belongsTo(User, { foreignKey: 'used_by', as: 'usedUser' });
User.hasMany(VertexPin, { foreignKey: 'assigned_to', as: 'assignedPins' });
User.hasMany(VertexPin, { foreignKey: 'used_by', as: 'usedPins' });

// Sync models with database
sequelize.sync()
  .then(() => {
    console.log('Models synchronized with database');
  })
  .catch(err => {
    console.error('Error synchronizing models:', err);
  });

module.exports = {
  sequelize,
  ...models
};

const sequelize = require('../config/database');
const User = require('./user');
const State = require('./state');
const District = require('./district');
const Profile = require('./profile');
const UserBank = require('./userBank');
const UserAddress = require('./userAddress');
const VertexPin = require('./vertexPin');
const VertexMessage = require('./vertexMessage');
const Card = require('./card');
const VertexMessageUser = require('./vertexMessageUser');
const Agent = require('./agent');
const Gift = require('./gift');
const GiftDistributor = require('./giftDistributor');
const GiftReceived = require('./giftReceived');
const GeneralSetting = require('./generalSetting');
const ReferralSetting = require('./referralSetting');
const UserReferralMoney = require('./userReferralMoney');
const UserTransaction = require('./userTransaction');
const UserPaymentRequest = require('./userPaymentRequest');
const AdminTransaction = require('./adminTransaction');
const CompulsoryDeposit = require('./compulsoryDeposit');
const CompulsoryDepositSetting = require('./compulsoryDepositSetting');
const OverdraftDeposit = require('./OverdraftDeposit');
const RecurringDeposit = require('./recurringDeposit');
const RecurringDepositSetting = require('./recurringDepositSetting');


// Initialize models
const models = {
  User,
  State,
  District,
  Profile,
  UserBank,
  UserAddress,
  VertexPin,
  VertexMessage,
  Card,
  VertexMessageUser,
  Agent,
  Gift,
  GiftDistributor,
  GiftReceived,
  GeneralSetting,
  ReferralSetting,
  UserReferralMoney,
  UserTransaction,
  UserPaymentRequest,
  AdminTransaction,
  CompulsoryDeposit,
  CompulsoryDepositSetting,
  OverdraftDeposit,
  RecurringDeposit,
  RecurringDepositSetting
};

// Run associations if they exist
Object.values(models)
  .filter(model => typeof model.associate === "function")
  .forEach(model => model.associate(models));

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

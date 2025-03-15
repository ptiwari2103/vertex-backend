'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // First modify kyc_status to be ENUM type
      await queryInterface.changeColumn('users', 'kyc_status', {
        type: Sequelize.ENUM('Pending', 'Submitted', 'Approved', 'Rejected'),
        allowNull: false,
        defaultValue: 'Pending'
      }, { transaction });

      // Add new KYC fields
      await queryInterface.addColumn('users', 'aadhar_number', {
        type: Sequelize.STRING(12),
        allowNull: true,
        unique: true,
        validate: {
          is: /^\d{12}$/
        }
      }, { transaction });

      await queryInterface.addColumn('users', 'pan_number', {
        type: Sequelize.STRING(10),
        allowNull: true,
        unique: true,
        validate: {
          is: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
        }
      }, { transaction });

      await queryInterface.addColumn('users', 'aadhar_front_path', {
        type: Sequelize.STRING(255),
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('users', 'aadhar_back_path', {
        type: Sequelize.STRING(255),
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('users', 'pan_front_path', {
        type: Sequelize.STRING(255),
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('users', 'kyc_submitted_at', {
        type: Sequelize.DATE,
        allowNull: true
      }, { transaction });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Remove KYC fields
      await queryInterface.removeColumn('users', 'aadhar_number', { transaction });
      await queryInterface.removeColumn('users', 'pan_number', { transaction });
      await queryInterface.removeColumn('users', 'aadhar_front_path', { transaction });
      await queryInterface.removeColumn('users', 'aadhar_back_path', { transaction });
      await queryInterface.removeColumn('users', 'pan_front_path', { transaction });
      await queryInterface.removeColumn('users', 'kyc_submitted_at', { transaction });

      // Revert kyc_status back to TINYINT
      await queryInterface.changeColumn('users', 'kyc_status', {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 0
      }, { transaction });
    });
  }
};

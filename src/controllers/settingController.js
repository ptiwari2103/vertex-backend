const { GeneralSetting, ReferralSetting } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');


const renderGeneralSetting = async (req, res) => {
    try {
        // Find the first settings record or create a default one
        let settings = await GeneralSetting.findOne();
        
        if (!settings) {
            settings = await GeneralSetting.create({
                compulsory_deposit: 6.0,
                recurring_deposit: 6.0,
                fixed_deposit: 6.0,
                loan_against_gold: 6.0,
                loan_against_mortgage_property: 6.0,
                loan_for_livelihood: 6.0,
                loan_for_women_livelihood: 6.0,
                emergency_loan: 6.0,
                credit_card_loan: 6.0,
                shared_money: 6.0
            });
        }
        
        res.render('settings/general', {
            title: 'General Settings',
            currentPage: 'general',
            settings,
            success: '',
            error: ''
        });
    } catch (error) {
        console.error('Error rendering general settings:', error);
        res.status(500).render('settings/general', {
            title: 'General Settings',
            currentPage: 'general',
            settings: null,
            success: '',
            error: 'Failed to load settings. Please try again.'
        });
    }
};

const updateGeneralSettings = async (req, res) => {
    try {
        const {
            compulsory_deposit,
            recurring_deposit,
            fixed_deposit,
            loan_against_gold,
            loan_against_mortgage_property,
            loan_for_livelihood,
            loan_for_women_livelihood,
            emergency_loan,
            credit_card_loan,
            shared_money
        } = req.body;
        
        // Validate all fields
        const fields = [
            compulsory_deposit,
            recurring_deposit,
            fixed_deposit,
            loan_against_gold,
            loan_against_mortgage_property,
            loan_for_livelihood,
            loan_for_women_livelihood,
            emergency_loan,
            credit_card_loan,
            shared_money
        ];
        
        // Check if all fields are valid numbers between 0 and 100
        const isValid = fields.every(field => {
            const value = parseFloat(field);
            return !isNaN(value) && value >= 0 && value <= 100;
        });
        
        if (!isValid) {
            return res.render('settings/general', {
                title: 'General Settings',
                currentPage: 'general',
                settings: null,
                success: '',
                error: 'All percentage values must be between 0 and 100'
            });
        }
        
        // Find the settings record or create one if it doesn't exist
        let settings = await GeneralSetting.findOne();
        
        if (settings) {
            // Update existing settings
            await settings.update({
                compulsory_deposit: parseFloat(compulsory_deposit),
                recurring_deposit: parseFloat(recurring_deposit),
                fixed_deposit: parseFloat(fixed_deposit),
                loan_against_gold: parseFloat(loan_against_gold),
                loan_against_mortgage_property: parseFloat(loan_against_mortgage_property),
                loan_for_livelihood: parseFloat(loan_for_livelihood),
                loan_for_women_livelihood: parseFloat(loan_for_women_livelihood),
                emergency_loan: parseFloat(emergency_loan),
                credit_card_loan: parseFloat(credit_card_loan),
                shared_money: parseFloat(shared_money)
            });
        } else {
            // Create new settings
            settings = await GeneralSetting.create({
                compulsory_deposit: parseFloat(compulsory_deposit),
                recurring_deposit: parseFloat(recurring_deposit),
                fixed_deposit: parseFloat(fixed_deposit),
                loan_against_gold: parseFloat(loan_against_gold),
                loan_against_mortgage_property: parseFloat(loan_against_mortgage_property),
                loan_for_livelihood: parseFloat(loan_for_livelihood),
                loan_for_women_livelihood: parseFloat(loan_for_women_livelihood),
                emergency_loan: parseFloat(emergency_loan),
                credit_card_loan: parseFloat(credit_card_loan),
                shared_money: parseFloat(shared_money)
            });
        }
        
        // Redirect with success message
        return res.render('settings/general', {
            title: 'General Settings',
            currentPage: 'general',
            settings,
            success: 'Settings updated successfully',
            error: ''
        });
    } catch (error) {
        console.error('Error updating general settings:', error);
        return res.render('settings/general', {
            title: 'General Settings',
            currentPage: 'general',
            settings: null,
            success: '',
            error: 'Failed to update settings. Please try again.'
        });
    }
};


const renderReferralSetting = async (req, res) => {
    try {
        // Find the first settings record or create a default one
        let settings = await ReferralSetting.findOne();
        
        if (!settings) {
            settings = await ReferralSetting.create({
                shared_money: 500,
                compulsory_deposit: 300,
                admission_fee: 200,
                building_fund: 100,
                welfare_fund: 100,
                other_deposit: 400
            });
        }
        
        res.render('settings/referral', {
            title: 'Referral Settings',
            currentPage: 'referral',
            settings,
            success: '',
            error: ''
        });
    } catch (error) {
        console.error('Error rendering referral settings:', error);
        res.status(500).render('settings/referral', {
            title: 'Referral Settings',
            currentPage: 'referral',
            settings: null,
            success: '',
            error: 'Failed to load settings. Please try again.'
        });
    }
};

const updateReferralSettings = async (req, res) => {
    try {
        const {
            shared_money,
            compulsory_deposit,
            admission_fee,
            building_fund,
            welfare_fund,
            other_deposit
        } = req.body;
        
        // Validate all fields
        const fields = [
            shared_money,
            compulsory_deposit,
            admission_fee,
            building_fund,
            welfare_fund,
            other_deposit
        ];
        
        // Check if all fields are valid positive numbers
        const isValid = fields.every(field => {
            const value = parseFloat(field);
            return !isNaN(value) && value >= 0;
        });
        
        if (!isValid) {
            return res.render('settings/referral', {
                title: 'Referral Settings',
                currentPage: 'referral',
                settings: null,
                success: '',
                error: 'All values must be valid positive numbers'
            });
        }
        
        // Find the settings record or create one if it doesn't exist
        let settings = await ReferralSetting.findOne();
        
        if (settings) {
            // Update existing settings
            await settings.update({
                shared_money: parseFloat(shared_money),
                compulsory_deposit: parseFloat(compulsory_deposit),
                admission_fee: parseFloat(admission_fee),
                building_fund: parseFloat(building_fund),
                welfare_fund: parseFloat(welfare_fund),
                other_deposit: parseFloat(other_deposit)
            });
        } else {
            // Create new settings
            settings = await ReferralSetting.create({
                shared_money: parseFloat(shared_money),
                compulsory_deposit: parseFloat(compulsory_deposit),
                admission_fee: parseFloat(admission_fee),
                building_fund: parseFloat(building_fund),
                welfare_fund: parseFloat(welfare_fund),
                other_deposit: parseFloat(other_deposit)
            });
        }
        
        // Redirect with success message
        return res.render('settings/referral', {
            title: 'Referral Settings',
            currentPage: 'referral',
            settings,
            success: 'Settings updated successfully',
            error: ''
        });
    } catch (error) {
        console.error('Error updating referral settings:', error);
        return res.render('settings/referral', {
            title: 'Referral Settings',
            currentPage: 'referral',
            settings: null,
            success: '',
            error: 'Failed to update settings. Please try again.'
        });
    }
};


module.exports = {
    renderGeneralSetting,
    updateGeneralSettings,
    renderReferralSetting,
    updateReferralSettings
};

const { User, Profile } = require("../models");
const jwt = require('jsonwebtoken');

const generateUserId = async (districtId) => {
    const DD = String(districtId).padStart(2, '0'); // Ensure 2-digit district ID

    let userId;
    let isUnique = false;

    while (!isUnique) {
        const randomPart = String(Math.floor(1000 + Math.random() * 9000)); // Always 4 digits
        userId = `${DD}${randomPart}`;
        // Check if this userId already exists
        const existingUser = await User.findOne({ where: { user_id: userId } });        
        if (!existingUser) {
            isUnique = true;
        }
    }

    return userId; // Returns a 6-digit unique integer
};



// Generate unique 10-digit account number
const generateAccountNumber = async () => {
    let accountNumber;
    let isUnique = false;
    
    while (!isUnique) {
        // Generate a random 10-digit number that doesn't start with 0
        accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        
        // Check if this account number already exists
        const existingUser = await User.findOne({ where: { account_number: accountNumber } });
        if (!existingUser) {
            isUnique = true;
        }
    }
    
    return accountNumber;
};


// Get all users
const getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] },
            include: [{
                model: Profile,
                as: 'profile',
                attributes: ['email_id', 'state', 'district', 'profile_image']
            }]
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Register a new user
const registerUser = async (req, res) => {
    try {
        const {
            name,
            guardian_name,
            date_of_birth,
            gender,
            mobile_number,
            email_id,
            state_id,
            district_id,
            password,
            terms_accepted
        } = req.body;

        // Validate required fields
        const requiredFields = ['name', 'guardian_name', 'password', 
            'date_of_birth', 'gender', 'mobile_number', 'state_id', 'district_id'];
        
        const missingFields = requiredFields.filter(field => !req.body[field]);
        if (missingFields.length > 0) {
            return res.status(400).json({ 
                error: `Missing required fields: ${missingFields.join(', ')}` 
            });
        }

        // Generate account number and user ID
        const accountNumber = await generateAccountNumber();
        const userId = await generateUserId(district_id);

        // Create user
        const user = await User.create({
            name,
            guardian_name,
            password: password,
            date_of_birth: date_of_birth,
            gender,
            mobile_number,
            email_id,
            state_id,
            district_id,
            terms_accepted,
            user_type: 'member',
            user_id: userId,
            account_number: accountNumber,
            status: 'Pending'
        });

        // Remove password from response
        const userResponse = user.toJSON();
        delete userResponse.id;
        delete userResponse.guardian_name;         
        delete userResponse.user_type;        
        delete userResponse.status;
        delete userResponse.terms_accepted;
        delete userResponse.date_of_birth;
        delete userResponse.gender;
        delete userResponse.mobile_number;
        delete userResponse.email_id;
        delete userResponse.state_id;
        delete userResponse.district_id;
        delete userResponse.kyc_status;
        delete userResponse.created_date;
        delete userResponse.updated_date;
        userResponse.password=password;

        res.status(201).json({
            message: 'User registered successfully',
            user: userResponse
        });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                error: "Duplicate entry found",
                details: Object.keys(error.fields).map(field => 
                    `${field} already exists`
                )
            });
        }
        res.status(500).json({ error: error.message });
    }
};


const login = async (req, res) => {
    try {
        const { user_id, password } = req.body;

        const user = await User.findOne({ where: { user_id: user_id, user_type: 'member' } });

        // Check if user exists and verify password
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid User ID'
            });
        }

        // Validate password
        const isValidPass = await user.validatePassword(password);
        if (!isValidPass) {
            return res.status(401).json({
                success: false,
                message: 'Invalid password'
            });
        }

        // Check user status
        if (user.status !== 'Active') {
            return res.status(401).json({
                success: false,
                message: `Your account is currently ${user.status.toLowerCase()}. Please contact support.`
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                user_id: user.user_id,
                account_number: user.account_number,
                user_type: user.user_type
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Remove password from response
        const userResponse = user.toJSON();
        delete userResponse.id;
        delete userResponse.password;
        delete userResponse.user_type;
        delete userResponse.district;
        delete userResponse.state;
        delete userResponse.created_date;
        delete userResponse.updated_date;
        
        // Return user details and token
        res.json({
            success: true,
            data: {
                user: userResponse,
                token
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error
        });
    }
};


const prelogin = async (req, res) => {
    try {
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const user = await User.findOne({ where: { user_id, user_type: 'member' } });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid User ID'
            });
        }

        if (user.status === 'Active') {
            return res.status(200).json({
                success: true,
                message: `Hello ${user.name}, Your account is currently ${user.status.toLowerCase()}.`
            });           
        }else{
            return res.status(401).json({
                success: false,
                message: `Hello ${user.name}, Your account is currently ${user.status.toLowerCase()}. Please contact support.`
            });
        }

    } catch (error) {
        console.error('Pre-login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};



module.exports = {
    getAllUsers,
    registerUser,
    login,
    prelogin
};

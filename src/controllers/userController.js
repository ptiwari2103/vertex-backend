const bcrypt = require('bcryptjs');
const { User, Profile } = require("../models");


const generateUserId = async (districtId, db) => {
    const DD = String(districtId).padStart(2, '0'); // Ensure 2-digit district ID

    let userId;
    let isUnique = false;

    while (!isUnique) {
        const randomPart = String(Math.floor(1000 + Math.random() * 9000)); // Always 4 digits
        
        //userId = parseInt(`${DD}${randomPart}`, 10); // Convert to integer
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

// Convert date from dd-mm-yyyy to yyyy-mm-dd format
const convertDateFormat = (dateStr) => {
    const [day, month, year] = dateStr.split('-');
    return `${year}-${month}-${day}`;
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
            password,
            date_of_birth,
            gender,
            mobile_number,
            state,
            district,
            terms_accepted
        } = req.body;

        // Validate required fields
        const requiredFields = ['name', 'guardian_name', 'password', 
            'date_of_birth', 'gender', 'mobile_number', 'state', 'district'];
        
        const missingFields = requiredFields.filter(field => !req.body[field]);
        if (missingFields.length > 0) {
            return res.status(400).json({ 
                error: `Missing required fields: ${missingFields.join(', ')}` 
            });
        }

        // Generate account number and user ID
        const accountNumber = await generateAccountNumber();
        const userId = await generateUserId(state, district, mobile_number);

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Format date of birth from dd-mm-yyyy to yyyy-mm-dd for database
        const formattedDOB = convertDateFormat(date_of_birth);

        // Create user
        const user = await User.create({
            name,
            guardian_name,
            password: hashedPassword,
            date_of_birth: formattedDOB,
            gender,
            mobile_number,
            state,
            district,
            terms_accepted,
            user_type: 'member',
            user_id: userId,
            account_number: accountNumber,
            status: 'Pending'
        });

        // Remove password from response
        const userResponse = user.toJSON();
        delete userResponse.password;

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

module.exports = {
    getAllUsers,
    registerUser
};

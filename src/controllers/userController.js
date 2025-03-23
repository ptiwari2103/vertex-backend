const { User, Profile, UserBank } = require("../models");
const jwt = require('jsonwebtoken');
const multer = require('multer');

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
            parent_id= null,
            pay_key,
            pay_type= 'pay_key',
            name,
            guardian_name,
            date_of_birth,
            gender,
            mobile_number,
            email_id,
            state_id,
            district_id,
            password,
            terms_accepted,
            is_email_verified = false,
            is_mobile_verified = false
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
            parent_id,
            pay_key,
            pay_type: 'pay_key',
            name,
            guardian_name,
            password: password,
            date_of_birth: date_of_birth,
            gender,
            mobile_number,
            is_mobile_verified,
            email_id,
            is_email_verified,
            state_id,
            district_id,
            terms_accepted,
            user_type: 'member',
            user_id: userId,
            account_number: accountNumber,
            status: 'Pending'
        });

        // Create profile
        await Profile.create({
            user_id: user.id,
            kyc_status: 'Pending',            
        });

        // Create user bank
        // await UserBank.create({
        //     user_id: user.id,
        //     account_number: accountNumber,
        //     bank_name: 'ICICI',
        //     branch_name: 'ICICI',
        //     ifsc_code: 'ICICI',
        //     account_type: 'Saving'
        // });

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

        // const user = await User.findOne({ where: { user_id: user_id, user_type: 'member' } });
        const user = await User.findOne({
            where: { user_id: user_id, user_type: 'member' },
            include: [
                {
                    model: Profile,
                    as: 'profile'
                },
                {
                    model: UserBank,
                    as: 'userBank'  
                }
            ]
        });
        // console.log(user);
        // Check if user exists and verify password
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Your user id is invalid.'
            });
        }

        // Validate password
        const isValidPass = await user.validatePassword(password);
        if (!isValidPass) {
            return res.status(401).json({
                success: false,
                message: 'Your password is invalid.'
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
            { expiresIn: '1h' }
        );

        // Remove password from response
        const userResponse = user.toJSON();
        delete userResponse.id;
        // delete userResponse.parent_id;
        // delete userResponse.pay_key;
        // delete userResponse.pay_type;
        delete userResponse.password;
        delete userResponse.user_type;
        //delete userResponse.userBank.id;
        //delete userResponse.userBank.user_id;        
        delete userResponse.profile.id;
        delete userResponse.profile.user_id;        
        
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

        const user = await User.findOne({ 
            where: { user_id, user_type: 'member' }
        });

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


const getAllMembers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // Items per page
        const offset = (page - 1) * limit;

        const { count, rows: members } = await User.findAndCountAll({
            attributes: { exclude: ['password'] },
            include: [
                {
                    model: Profile,
                    as: 'profile',
                    attributes: ['id', 'pan_number', 'aadhar_number', 'kyc_status']
                },
                {
                    model: UserBank,
                    as: 'userBank',
                    attributes: ['id']
                }
            ],
            where: { user_type: 'member' },
            limit,
            offset,
            order: [['created_date', 'DESC']]
        });

        const totalPages = Math.ceil(count / limit);

        res.render('members/list', {
            title: 'Members - Vertex Admin',
            style: '',
            script: '',
            currentPage: 'members',
            user: members,
            pagination: {
                current: page,
                total: totalPages,
                count: count
            }
        });
    } catch (error) {
        console.error('Members error:', error);
        res.render('error', { 
            title: 'Error - Vertex Admin',
            message: 'Error loading members',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while loading the members.',
            style: '',
            script: '',
            user: null
        });
    }
};

const updateMemberStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const member = await User.findOne({ 
            where: { id, user_type: 'member' }
        });

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        await member.update({ status });

        res.json({
            success: true,
            message: 'Member status updated successfully'
        });
    } catch (error) {
        console.error('Update member status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update member status'
        });
    }
};

const updatekycStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { kyc_status } = req.body;

        const profile = await Profile.findOne({ 
            where: { id }
        });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found in my database.'
            });
        }

        await profile.update({ kyc_status });

        res.json({
            success: true,
            message: 'Profile kyc status updated successfully'
        });
    } catch (error) {
        console.error('Update profile kyc status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile kyc status'
        });
    }
};  

const viewMember = async (req, res) => {
    try {
        const { id } = req.params;
        const member = await User.findOne({
            where: { id, user_type: 'member' },
            attributes: { exclude: ['password'] }
        });

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        res.json({
            success: true,
            member
        });
    } catch (error) {
        console.error('View member error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch member details'
        });
    }
};

const deleteMember = async (req, res) => {
    try {
        const { id } = req.params;
        const member = await User.findOne({
            where: { id, user_type: 'member' }
        });

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        await member.destroy();

        res.json({
            success: true,
            message: 'Member deleted successfully'
        });
    } catch (error) {
        console.error('Delete member error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete member'
        });
    }
};


const verifyToken = (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized'
        });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }
        req.user = decoded;
        next();
    });
};


const kycform = async (req, res) => {
    try {
        const { user_id, pan_number, aadhar_number } = req.body;
        const { pan_number_image, aadhar_number_image_front, aadhar_number_image_back } = req.files;
        console.log(pan_number_image, aadhar_number_image_front, aadhar_number_image_back);
        console.log("==========================");
        console.log(req.files);
        console.log("-----------------------------------");
        // console.log(req.body);
        // Validate input
        if (!user_id || !pan_number || !aadhar_number) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Check if user exists
        // const user = await User.findOne({ where: { user_id } });

        const user = await User.findOne({
            where: { user_id: user_id, user_type: 'member' },
            include: [
                {
                    model: Profile,
                    as: 'profile'
                },
                {
                    model: UserBank,
                    as: 'userBank'  
                }
            ]
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found in my records.'
            });
        }

        // Ensure files are uploaded
        if (!pan_number_image || !aadhar_number_image_front || !aadhar_number_image_back) {
            return res.status(400).json({
                success: false,
                message: 'Missing required image files'
            });
        }

        // Get uploaded file paths
        const panImagePath = pan_number_image[0]?.path || null;
        const aadharFrontPath = aadhar_number_image_front[0]?.path || null;
        const aadharBackPath = aadhar_number_image_back[0]?.path || null;

        console.log(panImagePath, aadharFrontPath, aadharBackPath);
        // Update or create profile with KYC details
        if (user?.profile?.id) {
            // Update existing profile
            const updatedProfile = await user.profile.update({
                pan_number,
                aadhar_number,
                pan_number_image: panImagePath,
                aadhar_number_image_front: aadharFrontPath,
                aadhar_number_image_back: aadharBackPath,
                kyc_status: 'Submitted'
            });
            
            const message = 'KYC details updated successfully';
            const userdetails = await User.findOne({
                where: { user_id: user_id, user_type: 'member' },
                include: [
                    {
                        model: Profile,
                        as: 'profile'
                    },
                    {
                        model: UserBank,
                        as: 'userBank'  
                    }
                ]
            });
    
            const userResponse = userdetails.toJSON();
            delete userResponse.id;
            delete userResponse.password;
            delete userResponse.user_type;
            // delete userResponse.userBank.id;
            // delete userResponse.userBank.user_id;        
            // delete userResponse.profile.id;
            // delete userResponse.profile.user_id; 
            
            return res.json({
                success: true,
                message: "KYC details updated successfully",
                data: userResponse
            });
        
        } else {            
            // Create new profile
            const newProfile = await Profile.create({
                user_id: user.id,
                pan_number,
                aadhar_number,
                pan_number_image: panImagePath,
                aadhar_number_image_front: aadharFrontPath,
                aadhar_number_image_back: aadharBackPath,
                kyc_status: 'Submitted'
            });
            
            const userdetails = await User.findOne({
                where: { user_id: user_id, user_type: 'member' },
                include: [
                    {
                        model: Profile,
                        as: 'profile'
                    },
                    {
                        model: UserBank,
                        as: 'userBank'  
                    }
                ]
            });
    
            const userResponse = userdetails.toJSON();
            delete userResponse.id;
            delete userResponse.password;
            delete userResponse.user_type;
            // delete userResponse.userBank.id;
            // delete userResponse.userBank.user_id;        
            // delete userResponse.profile.id;
            // delete userResponse.profile.user_id; 
            
            return res.json({
                success: true,
                message: "KYC details added successfully",
                data: userResponse
            });
        }

        
        
    } catch (error) {
        console.error('KYC form error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save KYC details',
            error: error.message
        });
    }
};



module.exports = {
    getAllMembers,
    registerUser,
    login,
    prelogin,
    updateMemberStatus,
    updatekycStatus,
    viewMember,
    deleteMember,
    kycform
};

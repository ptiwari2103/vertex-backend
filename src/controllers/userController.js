const { User, Profile, UserBank, UserAddress } = require("../models");
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

        const user = await User.findOne({ where: { user_id: user_id, user_type: 'member' } });
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
        if (!['Active', 'Approved'].includes(user.status)) {
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

        const userdetails = await getUserDetails(user_id);      
        
        // Return user details and token
        res.json({
            success: true,
            data: {
                user: userdetails,
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

        if (user.status === 'Active' || user.status === 'Approved') {
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
        const user = await User.findOne({
            where: { user_id: user_id, user_type: 'member' },
            include: [
                {
                    model: Profile,
                    as: 'profile'
                }                
            ]
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found in my records.'
            });
        }

        const panImagePath = Array.isArray(pan_number_image) && pan_number_image.length > 0 
            ? pan_number_image[0]?.path 
            : user?.profile?.pan_number_image || null;
        const aadharFrontPath = Array.isArray(aadhar_number_image_front) && aadhar_number_image_front.length > 0 
            ? aadhar_number_image_front[0]?.path 
            : user?.profile?.aadhar_number_image_front || null;
        const aadharBackPath = Array.isArray(aadhar_number_image_back) && aadhar_number_image_back.length > 0 
            ? aadhar_number_image_back[0]?.path 
            : user?.profile?.aadhar_number_image_back || null;

        if (!panImagePath || !aadharFrontPath || !aadharBackPath) {
            return res.status(400).json({
                success: false,
                message: 'Missing required image files'
            });
        } 

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
            const userdetails = await getUserDetails(user_id);
    
            return res.json({
                success: true,
                message: "KYC details updated successfully",
                data: userdetails
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
            
            const userdetails = await getUserDetails(user_id);
    
            return res.json({
                success: true,
                message: "KYC details added successfully",
                data: userdetails
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



const profileform = async (req, res) => {
    try {
        const { user_id, email, nominee_name, nominee_relation, nominee_contact, nominee_email, is_divyang, is_senior_citizen, guardian_relation } = req.body;
        const { profile_image, divyang_certificate } = req.files;
        console.log(profile_image, divyang_certificate);
        console.log("===========profile form==============");
        console.log(req.files);
        console.log("-----------------------------------");
        // console.log(req.body);
        // Validate input
        if (!user_id || !nominee_name || !nominee_relation || !guardian_relation) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Check if user exists
        const user = await User.findOne({
            where: { user_id: user_id, user_type: 'member' },
            include: [
                {
                    model: Profile,
                    as: 'profile'
                }
            ]
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found in my records.'
            });
        }

        
        // Get uploaded file paths
        const profileImagePath = Array.isArray(profile_image) && profile_image.length > 0 
            ? profile_image[0]?.path 
            : user?.profile?.profile_image || null;

        const divyangCertificatePath = Array.isArray(divyang_certificate) && divyang_certificate.length > 0 
            ? divyang_certificate[0]?.path 
            : user?.profile?.divyang_certificate || null;

        console.log(profileImagePath, divyangCertificatePath);

        // Ensure files are uploaded
        if (!profileImagePath) {
            return res.status(400).json({
                success: false,
                message: 'Missing required profile image.'
            });
        }

        if((email && email !== user.email_id) || (guardian_relation && guardian_relation !== user.guardian_relation)) {
            user.email_id = email;
            user.guardian_relation = guardian_relation;
            await user.save();
        }
        // Update or create profile with KYC details
        if (user?.profile?.id) {
            // Update existing profile
            const updatedProfile = await user.profile.update({
                profile_image: profileImagePath,
                divyang_certificate: divyangCertificatePath,
                nominee_name,
                nominee_relation,
                nominee_contact,
                nominee_email,
                is_divyang,
                is_senior_citizen,
                guardian_relation
            });
            
            const message = 'Profile details updated successfully';
            const userdetails = await getUserDetails(user_id);
    
            return res.json({
                success: true,
                message: "Profile details updated successfully",
                data: userdetails
            });
        
        } else {            
            // Create new profile
            const newProfile = await Profile.create({
                user_id: user.id,
                profile_image: profileImagePath,
                divyang_certificate: divyangCertificatePath,
                nominee_name,
                nominee_relation,
                nominee_contact,
                nominee_email,
                is_divyang,
                is_senior_citizen,
                guardian_relation
            });
            
            const userdetails = await getUserDetails(user_id);
    
            return res.json({
                success: true,
                message: "Profile details added successfully",
                data: userdetails
            });
        }
    } catch (error) {
        console.error('Profile form error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save profile details',
            error: error.message
        });
    }
};


const addUpdateAddress = async (req, res) => {
    try {
        const { user_id, correspondence_address,correspondence_city,correspondence_district,correspondence_state,correspondence_pincode,permanent_address,permanent_city,permanent_district,permanent_state,permanent_pincode, is_same_address } = req.body;
        
        // Validate input
        if (!user_id || !correspondence_address || !correspondence_city || !correspondence_district || !correspondence_state || !correspondence_pincode || !permanent_address || !permanent_city || !permanent_district || !permanent_state || !permanent_pincode) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields.'
            });
        }

        // Check if user exists
        const user = await User.findOne({
            where: { user_id: user_id, user_type: 'member' }
        });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found in my records.'
            });
        }

        // Fetch the latest inactive address separately
        const userAddress = await UserAddress.findOne({
            where: { user_id: user.id, status: 'Inactive' },
            order: [['updated_date', 'DESC']]
        });

        // Update or create profile with KYC details
        if (userAddress) {
            // Update existing profile
            const updatedProfile = await userAddress.update({
                correspondence_address,
                correspondence_city,
                correspondence_district,
                correspondence_state,
                correspondence_pincode,
                permanent_address,
                permanent_city,
                permanent_district,
                permanent_state,
                permanent_pincode,
                is_same_address
            });
            
            const userdetails = await getUserDetails(user_id);
    
            return res.json({
                success: true,
                message: "Address details updated successfully",
                data: userdetails
            });
        
        } else {            
            // Create new profile
            const newProfile = await UserAddress.create({
                user_id: user.id,
                correspondence_address,
                correspondence_city,
                correspondence_district,
                correspondence_state,
                correspondence_pincode,
                permanent_address,
                permanent_city,
                permanent_district,
                permanent_state,
                permanent_pincode,
                is_same_address
            });
            
            const userdetails = await getUserDetails(user_id);
    
            return res.json({
                success: true,
                message: "Address details added successfully",
                data: userdetails
            });
        }
        
        
    } catch (error) {
        console.error('Profile form error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save profile details',
            error: error.message
        });
    }
};


const addUpdateBank = async (req, res) => {
    try {
        const { user_id, account_holder, account_number, bank_name, branch_name, ifsc_number } = req.body;
        
        console.log(req.body);
        // Validate input
        if (!user_id || !account_holder || !account_number || !bank_name || !branch_name || !ifsc_number) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields.'
            });
        }

        // Check if user exists
        const user = await User.findOne({
            where: { user_id: user_id, user_type: 'member' }
        });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found in my records.'
            });
        }

        // Fetch the latest inactive bank separately
        const userBank = await UserBank.findOne({
            where: { user_id: user.id, status: 'Inactive' },
            order: [['updated_date', 'DESC']]
        });

        // Update or create profile with bank details
        if (userBank) {
            // Update existing profile
            const updatedProfile = await userBank.update({
                account_holder,
                account_number,
                bank_name,
                branch_name,
                ifsc_number
            });
            
            const userdetails = await getUserDetails(user_id);
    
            return res.json({
                success: true,
                message: "Bank details updated successfully",
                data: userdetails
            });
        } else {            
            // Create new profile
            const newProfile = await UserBank.create({
                user_id: user.id,
                account_holder,
                account_number,
                bank_name,
                branch_name,
                ifsc_number
            });
            
            const userdetails = await getUserDetails(user_id);
    
            return res.json({
                success: true,
                message: "Bank details added successfully",
                data: userdetails
            });
        }
        
    } catch (error) {
        console.error('Profile form error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save profile details',
            error: error.message
        });
    }
};


// Utility function to fetch user details with associated models
const getUserDetails = async (userId) => {
    const userDetails = await User.findOne({
        where: { user_id: userId, user_type: 'member' },
        include: [
            { model: Profile, as: 'profile' }
        ]
    });

    if (!userDetails) {
        return null;
    }

    const userResponse = userDetails.toJSON();

    // Fetch active address
    const activeAddress = await UserAddress.findOne({
        where: { user_id: userDetails.id, status: 'Active' }
    });
    
    console.log('Searching for inactive address with user_id:', userDetails.id);
    // Fetch latest inactive address with proper ordering
    const latestInactiveAddress = await UserAddress.findOne({
        where: { 
            user_id: userDetails.id, 
            status: 'Inactive' 
        },
        order: [['created_date', 'DESC']]  // Changed to created_date since it's defined in model
    });

    console.log('Active Address:', activeAddress);
    console.log('Latest Inactive Address:', latestInactiveAddress);
    
       
    // Attach structured address data
    userResponse.userAddress = {
        activeAddress: activeAddress ? activeAddress.toJSON() : null,
        latestAddress: latestInactiveAddress ? latestInactiveAddress.toJSON() : null
    };



    // Fetch active bank
    const activeBank = await UserBank.findOne({
        where: { user_id: userDetails.id, status: 'Active' }
    });
    
    console.log('Searching for inactive bank with user_id:', userDetails.id);
    // Fetch latest inactive bank with proper ordering
    const latestInactiveBank = await UserBank.findOne({
        where: { 
            user_id: userDetails.id, 
            status: 'Inactive' 
        },
        order: [['created_date', 'DESC']]  // Changed to created_date since it's defined in model
    });

    console.log('Active Bank:', activeBank);
    console.log('Latest Inactive Bank:', latestInactiveBank);
    
    // Attach structured bank data
    userResponse.userBank = {
        activeBank: activeBank ? activeBank.toJSON() : null,
        latestBank: latestInactiveBank ? latestInactiveBank.toJSON() : null
    };

    // Remove sensitive fields
    // delete userResponse.id;
    // delete userResponse.password;
    // delete userResponse.user_type;

    return userResponse;
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
    kycform,
    profileform,
    addUpdateAddress,
    addUpdateBank
};

const { User, Profile, UserBank, UserAddress, VertexPin, Agent, State, District, UserReferralMoney, ReferralSetting } = require("../models");
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');


const addMember = async (req, res) => {
    const user = JSON.stringify(req.session.user, null, 2);
    try {
        const { id } = req.params;

        // Fetch states and districts
        const states = await State.findAll({
            attributes: ['id', 'name'],
            order: [['name', 'ASC']]
        });

        res.render('members/add', {
            title: 'Add Member - Vertex Admin',
            style: '',
            script: '',
            currentPage: 'members',
            user: user,
            parentId: id,
            states: states
        });
    } catch (error) {
        console.error('Add member error:', error);
        res.render('error', {
            title: 'Error - Vertex Admin',
            message: 'Error adding member',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while adding the member.',
            style: '',
            script: '',
            user: null
        });
    }
}

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
            parent_id,
            pay_key,
            pay_type = 'pay_key',
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
        // console.log("request body", req.body);

        // Validate required fields
        const requiredFields = ['name', 'guardian_name', 'password',
            'date_of_birth', 'gender', 'mobile_number', 'state_id', 'district_id'];

        const missingFields = requiredFields.filter(field => !req.body[field]);
        if (missingFields.length > 0) {
            return res.status(400).json({
                error: `Missing required fields11: ${missingFields.join(', ')}`
            });
        }

        // Validate pay key
        if (pay_key) {
            const pin = await VertexPin.findOne({
                where: {
                    pin: pay_key,
                    assigned_to: {
                        [Op.gt]: 0  // assigned_to greater than 0
                    },
                    used_by: null,  // not used yet
                    used_date: null // no used date
                }
            });
            if (!pin) {
                return res.status(400).json({
                    error: 'Invalid pay key.'
                });
            }
        }


        // Agent Account test
        if (parent_id>0) {
            const agent = await Agent.findOne({
                where: {
                    user_id: parent_id
                }
            });
            const parentdetail = await User.findOne({
                include: [{
                    model: Profile,
                    as: 'profile'
                }],
                where:{
                    id: parent_id
                }
            })
            if(parentdetail?.profile?.is_agent==='Inactive' && agent?.status==='Approved'){
                return res.status(400).json({
                    error: 'Parent agent is inactive or not approved.'
                });
            }
            
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
            plain_password: password,
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

        // Update pin
        await VertexPin.update({
            used_by: user.id,
            used_date: new Date()
        }, {
            where: {
                pin: pay_key
            }
        });


        // Create user referral money
        const referralSetting = await ReferralSetting.findOne(); 
        await UserReferralMoney.create({
            user_id: user.id,
            referral_id: pay_key,
            shared_money: referralSetting.shared_money,
            compulsory_deposit: referralSetting.compulsory_deposit,
            admission_fee: referralSetting.admission_fee,
            building_fund: referralSetting.building_fund,
            welfare_fund: referralSetting.welfare_fund,
            other_deposit: referralSetting.other_deposit
        });

        if (user.parent_id) {
            // console.log("parent id",user.parent_id);
            // const userparent = await User.findOne({
            //     where: { id: user.parent_id }
            // });
            // //console.log("parent details",userparent);

            // const userdata = await getUserDetails(userparent.user_id);
            // console.log("parent details",userdata);

            const agentMemberCount = await User.count({
                where: {
                    parent_id: user.parent_id
                }
            });

            if (agentMemberCount == 3) {
                // Update the parent user's profile to set is_agent to Active
                await Profile.update(
                    { is_agent: 'Active' },
                    { where: { user_id: user.parent_id } }
                );

                // Update the agent status to Approved
                await Agent.update(
                    {
                        status: 'Approved',
                        approved_date: new Date(),
                        updated_at: new Date()
                    },
                    { where: { user_id: user.parent_id } }
                );

                console.log(`User ID ${user.parent_id} has been automatically approved as an agent after registering 3 members`);
            }
        } else {
            console.log("parent id not found");
        }

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
        //userResponse.password=password;

        // if(user.parent_id){ 
        //     const userparent = await User.findOne({
        //         where: { id: user.parent_id }
        //     });
        //     console.log("parent details",userparent);            
        //     const userdata = await getUserDetails(userparent.user_id);
        //     console.log("parent details",userdata);
        //     res.status(201).json({
        //         message: 'User registered successfully',
        //         user: userResponse,
        //         data: userdata
        //     });
        // }else{
        //     res.status(201).json({
        //         message: 'User registered successfully',
        //         user: userResponse,
        //         data: null
        //     });
        // }

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
        if (!['Active'].includes(user.status)) {
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
            { expiresIn: process.env.JWT_EXPIRATION }
        );

        const userdetails = await getUserDetails(user.user_id);

        // Return user details and token
        res.json({
            success: true,
            data: {
                user: userdetails,
                token: token,
                token_type: 'Bearer',
                expires_in: 5 // 5 minutes in seconds
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
        } else {
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

        // Build filter conditions
        const whereClause = {
            user_type: 'member'
        };

        if (req.query.name) {
            whereClause.name = { [Op.like]: `${req.query.name}%` };
        }

        if (req.query.status) {
            whereClause.status = req.query.status;
        }

        if (req.query.user_id) {
            whereClause.user_id = req.query.user_id;
        }

        // Create the include array for the query
        const includeModels = [
            {
                model: Profile,
                as: 'profile',
                attributes: ['id', 'pan_number', 'aadhar_number', 'kyc_status', 'is_agent', 'is_fanchise'],
                // Only add the where condition if aadhar_number is in the query
                ...(req.query.aadhar_number ? {
                    where: {
                        aadhar_number: { [Op.like]: `${req.query.aadhar_number}%` }
                    }
                } : {})
            },
            {
                model: UserBank,
                as: 'userBank',
                attributes: ['id']
            }
        ];

        const { count, rows: members } = await User.findAndCountAll({
            where: whereClause,
            attributes: { exclude: ['password'] },
            include: includeModels,
            limit,
            offset,
            order: [['created_date', 'DESC']]
        });

        // Get admin user_id for members without parent
        const adminUser = await User.findOne({
            where: { user_type: 'admin' },
            attributes: ['user_id']
        });

        const defaultReferralId = adminUser ? adminUser.user_id : 'ADMIN';

        // Add referral_id to each member
        for (const member of members) {
            if (member.parent_id) {
                // Find parent's user_id
                const parent = await User.findOne({
                    where: { id: member.parent_id },
                    attributes: ['user_id']
                });
                member.referral_id = parent ? parent.user_id : defaultReferralId;
            } else {
                member.referral_id = defaultReferralId;
            }
        }

        // console.log("count and limit = ", count, limit);

        const totalPages = Math.ceil(count / limit);

        // console.log("totalPages", totalPages);  

        res.render('members/list', {
            members,
            user: JSON.stringify(req.session.user, null, 2),
            currentPage: 'members',
            query: req.query,
            title: 'Members - Vertex Admin',
            style: '',
            script: '',
            pagination: {
                currentPage: page,
                totalPages: totalPages,
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


const updateIsAgent = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_agent } = req.body;

        const profile = await Profile.findOne({
            where: { id }
        });

        if (is_agent === 'Active') {
            const agentmembercount = await User.count({
                where: {
                    parent_id: profile.user_id
                }
            });

            if (agentmembercount < 3) {
                return res.status(400).json({
                    success: false,
                    message: 'Make active agent required 3 members added first.'
                });
            }
        }

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found in my database.'
            });
        }

        await profile.update({ is_agent });

        res.json({
            success: true,
            message: 'Profile is_agent status updated successfully'
        });
    } catch (error) {
        console.error('Update profile is_agent status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile is_agent status'
        });
    }
};


const updateIsFranchise = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_fanchise } = req.body;

        const profile = await Profile.findOne({
            where: { id }
        });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found in my database.'
            });
        }

        await profile.update({ is_fanchise });

        res.json({
            success: true,
            message: 'Profile franchise status updated successfully'
        });
    } catch (error) {
        console.error('Update profile franchise status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile franchise status'
        });
    }
};


const updateIsEdit = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_edit } = req.body;

        // Validate input
        if (!is_edit || !['Pending', 'Approved'].includes(is_edit)) {
            return res.status(400).json({ success: false, message: 'Invalid is_edit status' });
        }

        // Find the member
        const member = await User.findOne({
            where: { id, user_type: 'member' }
        });

        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }

        //First approved check address
        const address = await UserAddress.findOne({
            where: { user_id: id, status: 'Active' }
        });
        if(is_edit === 'Approved' && !address) {
            const addressupdate = await UserAddress.findOne({
                where: { user_id: id }
            });
            if(!addressupdate){
            return res.status(404).json({ success: false, message: 'Address not found, before approved add one address.' });
            }
            await addressupdate.update({ status: 'Active' });
        }

        //First approved check bank
        const bank = await UserBank.findOne({
            where: { user_id: id, status: 'Active' }
        });
        if(is_edit === 'Approved' && !bank) {
            const bankupdate = await UserBank.findOne({
                where: { user_id: id }
            });
            if(!bankupdate){
            return res.status(404).json({ success: false, message: 'Bank not found, before approved add one bank details.' });
            }
            await bankupdate.update({ status: 'Active' });
        }

        // Update the is_edit status
        await member.update({ is_edit });

        return res.status(200).json({ success: true, message: 'Is Edit status updated successfully' });
    } catch (error) {
        console.error('Error updating is_edit status:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
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
        // Get user from middleware
        const { user_id, pan_number, aadhar_number } = req.body;
        const { pan_number_image, aadhar_number_image_front, aadhar_number_image_back } = req.files;
        
        // Validate input
        if (!pan_number || !aadhar_number) {
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

            const userdetails = await getUserDetails(user.user_id);

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

            const userdetails = await getUserDetails(user.user_id);

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
        const { update_by, user_id, name, mobile_number, email_id, gender, date_of_birth, guardian_name, guardian_relation, nominee_name, nominee_relation, nominee_contact, nominee_email, is_divyang, is_senior_citizen, is_agent, is_fanchise, divyang_type, divyang_percentage } = req.body;
        // console.log("===========profileform==============");
        // console.log(req.body);

        const { profile_image, divyang_certificate } = req.files;
        console.log("profile_image, divyang_certificate", profile_image, divyang_certificate);


        // console.log(req.body);
        // Validate input
        const requiredFields = {
            user_id: user_id,
            nominee_name: nominee_name,
            nominee_relation: nominee_relation,
            nominee_contact: nominee_contact,
            guardian_relation: guardian_relation
        };

        const missingFields = Object.entries(requiredFields)
            .filter(([key, value]) => !value)
            .map(([key]) => key);

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                missingFields: missingFields
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

        const divyangCertificatePath = is_divyang === 'true'
            ? (Array.isArray(divyang_certificate) && divyang_certificate.length > 0
                ? divyang_certificate[0]?.path
                : user?.profile?.divyang_certificate || null)
            : null;

        // console.log("is_divyang", is_divyang);
        console.log("profileImagePath2, divyangCertificatePath2", profileImagePath, divyangCertificatePath);

        // Ensure files are uploaded
        if (!profileImagePath) {
            return res.status(400).json({
                success: false,
                message: 'Missing required profile image.'
            });
        }

        // Update user details
        if (update_by && update_by === 'admin') {
            user.name = name;
            user.mobile_number = mobile_number;
            user.gender = gender;
            user.date_of_birth = date_of_birth;
            user.guardian_name = guardian_name;
        }
        user.email_id = email_id;
        user.guardian_relation = guardian_relation;

        // console.log("before Updated user details:", user);
        await user.save();
        // console.log("after Updated user details:", user);

        // Update or create profile with KYC details
        if (user?.profile?.id) {
            const profile_status = 'Submitted';
            // Update existing profile
            console.log("before Updated profile details:", user.profile);
            const updatedProfile = await user.profile.update({
                profile_image: profileImagePath,
                divyang_certificate: divyangCertificatePath,
                nominee_name,
                nominee_relation,
                nominee_contact,
                nominee_email,
                is_divyang,
                is_senior_citizen,
                divyang_type: is_divyang === 'true' ? req.body.divyang_type : null,
                divyang_percentage: is_divyang === 'true' ? req.body.divyang_percentage : null,
                profile_status
            });
            console.log("after Updated profile details:", updatedProfile);

            const userdetails = await getUserDetails(user.user_id);

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
                guardian_relation,
                divyang_type: is_divyang === 'true' ? req.body.divyang_type : null
            });
            console.log("after Created new profile:", newProfile);

            const userdetails = await getUserDetails(user.user_id);

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
        const { user_id, id, ...addressData } = req.body;
        const user = await User.findOne({
            where: { user_id: user_id, user_type: 'member' }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found in my records.'
            });
        }

        if (id) {
            // Update existing address
            const address = await UserAddress.findByPk(id);
            if (!address) {
                return res.status(404).json({ success: false, message: 'Address not found' });
            }
            //console.log('Updating address:', addressData);
            await address.update({ user_id: user.id, ...addressData });
            //console.log('Address updated successfully=',address);
            const userdetails = await getUserDetails(user.user_id);
            
            res.json({ success: true, data: userdetails, message: 'Address updated successfully' });
        } else {
            // Create new address
            await UserAddress.create({ user_id: user.id, ...addressData });

            const userdetails = await getUserDetails(user.user_id);

            res.json({ success: true, data: userdetails, message: 'Address added successfully' });
        }

    } catch (error) {
        console.error('Error in addUpdateAddress:', error);
        res.status(500).json({ success: false, message: 'Failed to save address' });
    }
};

const updateAddressStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const address = await UserAddress.findByPk(id);
        if (!address) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }

        await address.update({ status });
        // console.log("status=", status);
        if (status === 'Active') {
            // Set all other addresses for the user to inactive
            await UserAddress.update(
                { status: 'Inactive' },
                {
                    where: {
                        user_id: address.user_id,
                        id: { [Op.ne]: address.id }, // Exclude the current address
                        status: 'Active' // Only update active addresses
                    }
                }
            );
        }

        res.json({ success: true, message: 'Address status updated successfully' });
    } catch (error) {
        console.error('Error in updateAddressStatus:', error);
        res.status(500).json({ success: false, message: 'Failed to update address status' });
    }
};

const deleteAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const address = await UserAddress.findByPk(id);

        if (!address) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }

        await address.destroy();
        res.json({ success: true, message: 'Address deleted successfully' });
    } catch (error) {
        console.error('Error in deleteAddress:', error);
        res.status(500).json({ success: false, message: 'Failed to delete address' });
    }
};

const addUpdateBank = async (req, res) => {
    try {

        const { user_id, id, ...bankData } = req.body;

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

        if (id) {
            // Update existing bank
            const bank = await UserBank.findByPk(id);
            if (!bank) {
                return res.status(404).json({ success: false, message: 'Bank details not found' });
            }
            await bank.update({ user_id: user.id, ...bankData });

            const userdetails = await getUserDetails(user.user_id);

            res.json({ success: true, data: userdetails, message: 'Bank details updated successfully' });
        } else {
            // Create new bank
            await UserBank.create({ user_id: user.id, ...bankData });

            const userdetails = await getUserDetails(user.user_id);

            res.json({ success: true, data: userdetails, message: 'Bank details added successfully' });
        }
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            // Handle duplicate entry error
            return res.status(400).json({
                success: false,
                message: 'Duplicate entry error',
                error: error.errors.map(e => e.message) // Extract specific error messages
            });
        }
        console.error('Error in addUpdateBank:', error);
        res.status(500).json({ success: false, message: 'Failed to save bank details' });
    }
};

const updateBankStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const bank = await UserBank.findByPk(id);
        if (!bank) {
            return res.status(404).json({ success: false, message: 'Bank details not found' });
        }

        await bank.update({ status });

        if (status === 'Active') {
            // Set all other banks for the user to inactive
            await UserBank.update(
                { status: 'Inactive' },
                {
                    where: {
                        user_id: bank.user_id,
                        id: { [Op.ne]: bank.id }, // Exclude the current bank
                        status: 'Active' // Only update active banks
                    }
                }
            );
        }
        res.json({ success: true, message: 'Bank status updated successfully' });
    } catch (error) {
        console.error('Error in updateBankStatus:', error);
        res.status(500).json({ success: false, message: 'Failed to update bank status' });
    }
};

const deleteBank = async (req, res) => {
    try {
        const { id } = req.params;
        const bank = await UserBank.findByPk(id);

        if (!bank) {
            return res.status(404).json({ success: false, message: 'Bank details not found' });
        }

        await bank.destroy();
        res.json({ success: true, message: 'Bank details deleted successfully' });
    } catch (error) {
        console.error('Error in deleteBank:', error);
        res.status(500).json({ success: false, message: 'Failed to delete bank details' });
    }
};


const viewMemberDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const member = await User.findOne({
            where: { id, user_type: 'member' },
            include: [
                {
                    model: Profile,
                    as: 'profile'
                },
                {
                    model: UserBank,
                    as: 'userBank'
                },
                {
                    model: UserAddress,
                    as: 'userAddress',
                    include: [
                        {
                            model: State,
                            as: 'permanentState',
                            attributes: ['id', 'name']
                        },
                        {
                            model: District,
                            as: 'permanentDistrict',
                            attributes: ['id', 'name']
                        },
                        {
                            model: State,
                            as: 'correspondenceState',
                            attributes: ['id', 'name']
                        },
                        {
                            model: District,
                            as: 'correspondenceDistrict',
                            attributes: ['id', 'name']
                        }
                    ]
                },
                {
                    model: UserReferralMoney,
                    as: 'userReferralMoney'
                }
            ]
        });

        if (!member) {
            return res.render('error', {
                title: 'Error - Vertex Admin',
                message: 'Member not found',
                error: 'The requested member could not be found.',
                style: '',
                script: '',
                user: null
            });
        }

        res.render('members/view', {
            title: 'View Member - Vertex Admin',
            style: '',
            script: '',
            currentPage: 'members',
            member: member,
            user: JSON.stringify(req.session.user, null, 2)
        });
    } catch (error) {
        console.error('View member error:', error);
        res.render('error', {
            title: 'Error - Vertex Admin',
            message: 'Error viewing member',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while viewing the member.',
            style: '',
            script: '',
            user: null
        });
    }
};

const editMember = async (req, res) => {
    const user = JSON.stringify(req.session.user, null, 2);
    try {
        const { id } = req.params;
        const member = await User.findOne({
            where: { id, user_type: 'member' },
            include: [
                {
                    model: Profile,
                    as: 'profile'
                },
                {
                    model: UserBank,
                    as: 'userBank'
                },
                {
                    model: UserAddress,
                    as: 'userAddress',
                    include: [
                        {
                            model: State,
                            as: 'permanentState',
                            attributes: ['id', 'name']
                        },
                        {
                            model: District,
                            as: 'permanentDistrict',
                            attributes: ['id', 'name']
                        },
                        {
                            model: State,
                            as: 'correspondenceState',
                            attributes: ['id', 'name']
                        },
                        {
                            model: District,
                            as: 'correspondenceDistrict',
                            attributes: ['id', 'name']
                        }
                    ]
                }
            ]
        });

        if (!member) {
            return res.render('error', {
                title: 'Error - Vertex Admin',
                message: 'Member not found',
                error: 'The requested member could not be found.',
                style: '',
                script: '',
                user: null
            });
        }

        // Fetch all states for address dropdowns
        const states = await State.findAll({
            attributes: ['id', 'name'],
            order: [['name', 'ASC']]
        });

        // Fetch districts for existing addresses
        // let permanentDistricts = [];
        // let correspondenceDistricts = [];

        //console.log('userAddress:', member.userAddress);
        
        // if (member.userAddress && member.userAddress.length > 0) {
        //     // For each address, fetch the districts if state_id is available
        //     for (const address of member.userAddress) {
        //         if (address.permanent_state_id) {
        //             const districts = await District.findAll({
        //                 where: { state_id: address.permanent_state_id },
        //                 attributes: ['id', 'name'],
        //                 order: [['name', 'ASC']]
        //             });
        //             permanentDistricts.push({ addressId: address.id, districts });
        //         }
                
        //         if (address.correspondence_state_id) {
        //             const districts = await District.findAll({
        //                 where: { state_id: address.correspondence_state_id },
        //                 attributes: ['id', 'name'],
        //                 order: [['name', 'ASC']]
        //             });
        //             correspondenceDistricts.push({ addressId: address.id, districts });
        //         }
        //     }
        // }

        res.render('members/edit', {
            title: 'Edit Member - Vertex Admin',
            style: '',
            script: '',
            currentPage: 'members',
            member: member,
            user: user,
            states: states || []
        });
    } catch (error) {
        console.error('Edit member error:', error);
        res.render('error', {
            title: 'Error - Vertex Admin',
            message: 'Error editing member',
            error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while editing the member.',
            style: '',
            script: '',
            user: null
        });
    }
};

const updatePinPasswordStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { pin_password_status } = req.body;

        const user = await User.findOne({
            where: { id }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found in database.'
            });
        }

        //console.log('Pin password status:', pin_password_status); 
        let updatedPinPassword;
        let updatedPinPasswordStatus;

        if (pin_password_status === 'Reset') {
            updatedPinPassword = null;
            updatedPinPasswordStatus = 'Pending';
        } else {
            updatedPinPassword = user.pin_password;
            updatedPinPasswordStatus = pin_password_status;
        }

        await user.update({ pin_password_status: updatedPinPasswordStatus, pin_password: updatedPinPassword });

        res.json({
            success: true,
            message: 'Pin password status updated successfully'
        });
    } catch (error) {
        console.error('Update pin password status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update pin password status'
        });
    }
};


const createPinPassword = async (req, res) => {
    try {
        const { user_id, pin_password } = req.body;

        // Check if user exists with status 'active' and 'approved'
        const user = await User.findOne({
            where: {
                id: user_id,
                user_type: 'member',
                status: 'Active'
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found or not eligible' });
        }

        // Create a new pin password entry
        await User.update({
            pin_password: pin_password,
            pin_password_status: 'Active'
        }, {
            where: {
                id: user.id
            }
        });

        const userdata = await getUserDetails(user.user_id);

        return res.status(201).json({
            success: true,
            data: userdata,
            message: 'Your request was successfully added.'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};



const verifyPinPassword = async (req, res) => {
    try {
        const { user_id, pin_password } = req.body;

        // Check if user exists with status 'active' and 'approved'
        const user = await User.findOne({
            where: {
                id: user_id,
                user_type: 'member',
                status: 'Active'
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found or not eligible' });
        }

        const userdata = await getUserDetails(user.user_id);

        if (user.pin_password === pin_password) {
            return res.status(200).json({
                success: true,
                data: userdata,
                message: 'Your pin is correct.'
            });
        } else {
            return res.status(200).json({
                success: false,
                data: userdata,
                message: 'Your pin is incorrect.'
            });
        }

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};



const getUserDetailsBCK = async (userId) => {

    const userDetails = await User.findOne({
        where: {
            user_id: userId,
            user_type: 'member',
            status: 'Active'
        },
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

    // console.log('Searching for inactive address with user_id:', userDetails.id);
    // Fetch latest inactive address with proper ordering
    const latestInactiveAddress = await UserAddress.findOne({
        where: {
            user_id: userDetails.id,
            status: 'Inactive'
        },
        order: [['created_date', 'DESC']]  // Changed to created_date since it's defined in model
    });

    // console.log('Active Address:', activeAddress);
    // console.log('Latest Inactive Address:', latestInactiveAddress);


    // Attach structured address data
    userResponse.userAddress = {
        activeAddress: activeAddress ? activeAddress.toJSON() : null,
        latestAddress: latestInactiveAddress ? latestInactiveAddress.toJSON() : null
    };



    // Fetch active bank
    const activeBank = await UserBank.findOne({
        where: { user_id: userDetails.id, status: 'Active' }
    });

    // console.log('Searching for inactive bank with user_id:', userDetails.id);
    // Fetch latest inactive bank with proper ordering
    const latestInactiveBank = await UserBank.findOne({
        where: {
            user_id: userDetails.id,
            status: 'Inactive'
        },
        order: [['created_date', 'DESC']]  // Changed to created_date since it's defined in model
    });

    // console.log('Active Bank:', activeBank);
    // console.log('Latest Inactive Bank:', latestInactiveBank);

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



// Utility function to fetch user details with associated models
const getUserDetails = async (userId) => {

    const userDetails = await User.findOne({
        where: {
            user_id: userId,
            user_type: 'member',
            status: 'Active'
        },
        attributes: {
            exclude: ['password', 'pin_password']
        },
        include: [
            { model: Profile, as: 'profile' },
            { model: UserReferralMoney, as: 'userReferralMoney' }
        ]
    });

    if (!userDetails) {
        return null;
    }

    const userResponse = userDetails.toJSON();

    // First try to get the latest active address
    let address = await UserAddress.findOne({
        where: {
            user_id: userDetails.id,
            status: 'Active'
        },
        order: [['created_date', 'DESC']]
    });

    // If no active address exists, get the latest inactive address
    if (!address) {
        address = await UserAddress.findOne({
            where: {
                user_id: userDetails.id,
                status: 'Inactive'
            },
            order: [['created_date', 'DESC']]
        });
    }

    // Add the address to the user response
    userResponse.address = address ? address.toJSON() : null;


    // First try to get the latest active bank
    let bank = await UserBank.findOne({
        where: {
            user_id: userDetails.id,
            status: 'Active'
        },
        order: [['created_date', 'DESC']]
    });

    // If no active bank exists, get the latest inactive bank
    if (!bank) {
        bank = await UserBank.findOne({
            where: {
                user_id: userDetails.id,
                status: 'Inactive'
            },
            order: [['created_date', 'DESC']]
        });
    }

    // Add the bank to the user response
    userResponse.bank = bank ? bank.toJSON() : null;


    //Get user agent data
    const agent = await Agent.findOne({
        where: {
            user_id: userDetails.id
        }
    });
    userResponse.agent = agent ? agent.toJSON() : null;

    //Get user agent member count
    const agentmembercount = await User.count({
        where: {
            parent_id: userDetails.id
        }
    });
    userResponse.agentmembercount = agentmembercount;



    // Get user agent member data
    // const agentmembers = await User.findAll({
    //     where: { 
    //         parent_id: userDetails.id 
    //     },
    //     attributes: ['name', 'mobile_number', 'status', 'created_date', 'user_id', 'account_number'],
    //     include: [
    //         {
    //             model: Profile,
    //             as: 'profile',
    //             attributes: ['id', 'pan_number', 'aadhar_number', 'kyc_status']
    //         }
    //     ]
    // });
    // userResponse.agentmembers = agentmembers.map(member => member.toJSON());

    return userResponse;
};

const getMemberData = async (req, res) => {
    const { user_id } = req.body;
    const user = await getUserDetails(user_id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json({
        success: true,
        message: "User details retrieved successfully",
        data: user
    });
};

const requestAgent = async (req, res) => {
    try {
        const { user_id } = req.body;

        // Check if user exists
        const user = await User.findOne({ where: { id: user_id } });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if agent record already exists for this user
        const existingAgent = await Agent.findOne({
            where: { user_id: user.id }
        });

        if (existingAgent) {
            return res.status(400).json({
                success: false,
                message: 'Already requested.'
            });
        }

        // Create new agent record
        await Agent.create({
            user_id: user.id,
            status: 'Pending',
            created_at: new Date(),
            updated_at: new Date()
        });

        // await Profile.update({
        //     is_agent: 'Active'
        // }, { where: { user_id: user.id } });

        const userdata = await getUserDetails(user.user_id);

        return res.status(201).json({
            success: true,
            message: 'Successfully created',
            data: userdata
        });
    } catch (error) {
        console.error('Error in requestAgent:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

const updateAgentStatus = async (req, res) => {
    try {
        const userId = req.params.id;

        // Check if agent record exists for this user
        const agent = await Agent.findOne({
            where: { user_id: userId }
        });

        if (!agent) {
            return res.status(404).json({
                success: false,
                message: 'Agent request not found'
            });
        } else {
            return res.status(200).json({
                success: true,
                message: 'Agent created'
            });
        }

    } catch (error) {
        console.error('Error in updateAgentStatus:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};


const getAgentmembers = async (req, res) => {
    try {
        const userId = req.params.id;

        // Check if agent record exists for this user
        const members = await User.findAll({
            where: { parent_id: userId }
        });

        if (!members) {
            return res.status(404).json({
                success: false,
                message: 'No members found'
            });
        } else {
            return res.status(200).json({
                success: true,
                message: 'Members found',
                data: members
            });
        }

    } catch (error) {
        console.error('Error in getAgentmembers:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

module.exports = {
    addMember,
    getAllMembers,
    registerUser,
    login,
    prelogin,
    updateMemberStatus,
    updatekycStatus,
    updateIsAgent,
    updateIsFranchise,
    updateIsEdit,
    updatePinPasswordStatus,
    viewMember,
    deleteMember,
    verifyToken,
    kycform,
    profileform,
    addUpdateAddress,
    updateAddressStatus,
    deleteAddress,
    addUpdateBank,
    updateBankStatus,
    deleteBank,
    viewMemberDetails,
    editMember,
    createPinPassword,
    verifyPinPassword,
    getMemberData,
    requestAgent,
    updateAgentStatus,
    getAgentmembers
};

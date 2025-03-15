require('dotenv').config();
const bcrypt = require('bcryptjs');
const { User, Profile, sequelize } = require('../src/models');

const createAdminUser = async () => {
    try {
        // Test database connection and sync models
        await sequelize.authenticate();
        console.log('Database connection established successfully.');
        
        await sequelize.sync({ alter: true });
        console.log('Database models synchronized successfully.');

        // Format date from dd-mm-yyyy to yyyy-mm-dd
        const formatDate = (dateStr) => {
            const [day, month, year] = dateStr.split('-');
            return `${year}-${month}-${day}`;
        };

        // Check if admin already exists
        const existingAdmin = await User.findOne({
            where: {
                user_type: 'admin',
                user_id: '281401'
            }
        });

        if (existingAdmin) {
            console.log('Admin user already exists with ID:', existingAdmin.user_id);
            return;
        }

        // Hash password first
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('SecurePass@2024', salt);

        // Admin user data following validation rules
        const adminData = {
            name: "John Smith", // Full name required
            guardian_name: "James Smith", // Full name required
            email: "admin@vertex.com", // Valid email format
            password: hashedPassword, // Already hashed password
            date_of_birth: formatDate("01-01-1990"), // Must be at least 18 years old
            gender: "male", // One of: male, female, transgender
            mobile_number: "9856742310", // Non-sequential, non-repeating
            address: "123 Main Street, Central Area", // Min 10 chars, comma-separated
            city: "New Delhi", // 2-50 chars, letters only
            pincode: "110001", // 6 digits, non-zero start
            state: 28, // Valid state ID
            district: 14, // Valid district ID for state 28
            terms_accepted: true,
            user_type: 'admin',
            user_id: "281401", // Format: SSDDXY (28=state, 14=district, 0=X, 1=Y)
            account_number: "1234567890", // 10-digit unique number
            status: 'Active'
        };

        // Create admin user
        const admin = await User.create(adminData);
        console.log('Admin user created successfully');
        console.log('\nLogin credentials:');
        console.log('User ID:', admin.user_id);
        console.log('Password: SecurePass@2024');
        console.log('\nPlease save these credentials securely.');

    } catch (error) {
        console.error('Error creating admin user:', error.message);
        if (error.errors) {
            error.errors.forEach(err => console.error('- ', err.message));
        }
    } finally {
        await sequelize.close();
    }
};

// Run the function
createAdminUser();

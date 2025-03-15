CREATE TABLE `districts` (
    `id` int(11) NOT NULL,
    `state_id` int(11) NOT NULL,
    `name` varchar(100) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
  
  --
  -- Dumping data for table `districts`
  --
  
  INSERT INTO `districts` (`id`, `state_id`, `name`) VALUES
  (24, 4, 'Alwar'),
  (16, 2, 'Baghpat'),
  (25, 4, 'Bharatpur'),
  (14, 2, 'Bulandshahr'),
  (1, 1, 'Central Delhi'),
  (2, 1, 'East Delhi'),
  (18, 3, 'Faridabad'),
  (11, 2, 'Gautam Buddha Nagar (Noida)'),
  (12, 2, 'Ghaziabad'),
  (17, 3, 'Gurgaon'),
  (15, 2, 'Hapur'),
  (20, 3, 'Jhajjar'),
  (13, 2, 'Meerut'),
  (3, 1, 'New Delhi'),
  (4, 1, 'North Delhi'),
  (5, 1, 'North East Delhi'),
  (6, 1, 'North West Delhi'),
  (21, 3, 'Palwal'),
  (23, 3, 'Rewari'),
  (22, 3, 'Rohtak'),
  (19, 3, 'Sonipat'),
  (7, 1, 'South Delhi'),
  (8, 1, 'South East Delhi'),
  (9, 1, 'South West Delhi'),
  (10, 1, 'West Delhi');
  
  -- --------------------------------------------------------
  
  --
  -- Table structure for table `states`
  --
  
  CREATE TABLE `states` (
    `id` int(11) NOT NULL,
    `name` varchar(100) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
  
  --
  -- Dumping data for table `states`
  --
  
  INSERT INTO `states` (`id`, `name`) VALUES
  (1, 'Delhi'),
  (3, 'Haryana'),
  (4, 'Rajasthan'),
  (2, 'Uttar Pradesh');
  
  --
  -- Indexes for dumped tables
  --
  
  --
  -- Indexes for table `districts`
  --
  ALTER TABLE `districts`
    ADD PRIMARY KEY (`id`),
    ADD UNIQUE KEY `districts_name_state_id` (`name`,`state_id`),
    ADD KEY `state_id` (`state_id`);
  
  --
  -- Indexes for table `states`
  --
  ALTER TABLE `states`
    ADD PRIMARY KEY (`id`),
    ADD UNIQUE KEY `name` (`name`);
  
  --
  -- AUTO_INCREMENT for dumped tables
  --
  
  --
  -- AUTO_INCREMENT for table `districts`
  --
  ALTER TABLE `districts`
    MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;
  
  --
  -- AUTO_INCREMENT for table `states`
  --
  ALTER TABLE `states`
    MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;
  
  --
  -- Constraints for dumped tables
  --
  
  --
  -- Constraints for table `districts`
  --
  ALTER TABLE `districts`
    ADD CONSTRAINT `districts_ibfk_1` FOREIGN KEY (`state_id`) REFERENCES `states` (`id`) ON DELETE CASCADE;
  COMMIT;
  



CREATE TABLE Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parent_id INT DEFAULT NULL,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    user_type ENUM('admin', 'subadmin', 'member') NOT NULL DEFAULT 'member',
    user_id INT(5) UNIQUE NOT NULL,    
    account_number BIGINT(10) UNIQUE NOT NULL,
    guardian_name VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender ENUM('male', 'female', 'transgender') NOT NULL,
    mobile_number VARCHAR(15) UNIQUE NOT NULL,
    state INT DEFAULT NULL,
    district INT DEFAULT NULL,
    terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    kyc_status TINYINT(1) NOT NULL DEFAULT 0, -- 0: Not Verified, 1: Verified
    status ENUM('Active', 'Inactive', 'Pending', 'Blocked') NOT NULL DEFAULT 'Pending',
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE Profile (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    email_id VARCHAR(255) UNIQUE NOT NULL,
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    pan_no VARCHAR(12) UNIQUE NOT NULL,
    pan_front_image VARCHAR(255) NOT NULL,
    pan_back_image VARCHAR(255) NOT NULL,
    aadhar_no VARCHAR(12) UNIQUE NOT NULL,
    aadhar_front_image VARCHAR(255) NOT NULL,
    aadhar_back_image VARCHAR(255) NOT NULL,
    profile_image VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE user_banks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    account_holder VARCHAR(255) NOT NULL,
    account_no BIGINT(20) UNIQUE NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    ifsc_number VARCHAR(11) NOT NULL,
    status TINYINT(1) NOT NULL DEFAULT 1, -- 1: Active, 0: Inactive
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

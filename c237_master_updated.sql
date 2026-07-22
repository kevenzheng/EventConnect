-- Create database if it does not exist and switch to it
-- CREATE DATABASE IF NOT EXISTS `c237_master_updated` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `c237_022_teampowerrangers`;

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- 1. USERS TABLE & SEED DATA
-- =====================================================
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(20) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `address` VARCHAR(255) NOT NULL,
  `contact` VARCHAR(10) NOT NULL,
  `role` VARCHAR(45) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4;

INSERT INTO `users` (`id`, `username`, `email`, `password`, `address`, `contact`, `role`) VALUES
(1, 'samie ', 'samie@gmail.com', '7c4a8d09ca3762af61e59520943dc26494f8941b', 'samie street ', '12345678', 'admin'),
(2, 'jamaica', 'jamai@gmail.com', '7c4a8d09ca3762af61e59520943dc26494f8941b', 'jamaica street ', '12345678', 'user'),
(3, 'kim', 'kim@gmail.com', '2f084577bc6a170397cc2333a3ff969c5f635a1e', 'kim street', '12345678', 'user'),
(4, 'Samie', 'samie@gmail.com', 'cbfdac6008f9cab4083784cbd1874f76618d2a97', 'Singapore', '91234567', 'user'),
(5, 'kim', 'kim@gmail.com', '200de6158da17b54883820eaba810b1f84a91ad6', 'kim street', '12345678', 'user'),
(6, 'lisa', 'lisa@gmail.com', 'c221d4dffbc37c9b4d5cc1f3e2af3ed7d4261c85', 'lisa street', '12345679', 'user');


-- =====================================================
-- 2. JOBS TABLE & TEST DATA
-- =====================================================
DROP TABLE IF EXISTS `jobs`;

CREATE TABLE `jobs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `job_title` VARCHAR(150) NOT NULL,
  `event_name` VARCHAR(150) NOT NULL,
  `description` TEXT NOT NULL,
  `location` VARCHAR(150) NOT NULL,
  `salary` DECIMAL(10,2) NOT NULL,
  `event_date` DATE NOT NULL,
  `working_hours` VARCHAR(100) NOT NULL,
  `workers_required` INT NOT NULL DEFAULT 1,
  `posted_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`posted_by`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `jobs` (`id`, `job_title`, `event_name`, `description`, `location`, `salary`, `event_date`, `working_hours`, `workers_required`, `posted_by`) VALUES
(1, 'Event Usher', 'Tech Expo 2026', 'Assist with attendee registration, guide guests, and distribute event materials.', 'Suntec Convention Centre', 120.00, '2026-08-15', '08:00 AM - 05:00 PM', 5, 1),
(2, 'Stage Hand / Assistant', 'Summer Music Fest', 'Help setup equipment, manage backstage access, and assist production team.', 'Marina Bay Sands', 180.00, '2026-08-20', '01:00 PM - 10:00 PM', 3, 1),
(3, 'Registration Crew', 'Global Gaming Summit', 'Manage check-in counters, print visitor badges, and respond to general queries.', 'Expo Hall 3', 100.00, '2026-09-01', '09:00 AM - 04:00 PM', 4, 1);


-- =====================================================
-- 3. JOB APPLICATIONS TABLE & TEST DATA
-- =====================================================
DROP TABLE IF EXISTS `job_applications`;

CREATE TABLE `job_applications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `job_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `applied_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_application` (`job_id`, `user_id`),
  FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `job_applications` (`job_id`, `user_id`) VALUES
(1, 2),
(2, 2),
(1, 3),
(3, 6);


-- =====================================================
-- 4. APPLICATIONS TABLE & TEST DATA
-- =====================================================
DROP TABLE IF EXISTS `applications`;

CREATE TABLE `applications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `job_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'Pending',
  `applied_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_application` (`job_id`, `user_id`),
  FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `applications` (`job_id`, `user_id`, `status`) VALUES
(1, 2, 'Pending'),
(2, 2, 'Accepted'),
(1, 3, 'Rejected'),
(3, 6, 'Pending');


-- =====================================================
-- 5. EMPLOYER REVIEWS TABLE & TEST DATA
-- =====================================================
DROP TABLE IF EXISTS `employer_reviews`;

CREATE TABLE `employer_reviews` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `job_id` INT NOT NULL,
  `reviewer_id` INT NOT NULL,
  `employer_id` INT NOT NULL,
  `rating` INT NOT NULL CHECK (`rating` >= 1 AND `rating` <= 5),
  `review_text` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`employer_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Sample Review Data (User 2 - jamaica reviews Employer 1 - samie for Job 1)
INSERT INTO `employer_reviews` (`job_id`, `reviewer_id`, `employer_id`, `rating`, `review_text`) VALUES
(1, 2, 1, 5, 'Great employer! Pay was prompt and instructions were clear throughout the event.');


-- =====================================================
-- 6. EMPLOYEE RATINGS TABLE & TEST DATA
-- =====================================================
DROP TABLE IF EXISTS `employee_ratings`;

CREATE TABLE `employee_ratings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `job_id` INT NOT NULL,
  `employee_id` INT NOT NULL,
  `employer_id` INT NOT NULL,
  `rating` INT NOT NULL CHECK (`rating` >= 1 AND `rating` <= 5),
  `review_text` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`employee_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`employer_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Sample Data: Admin (id 1) rates Employee 'jamaica' (id 2)
INSERT INTO `employee_ratings` (`job_id`, `employee_id`, `employer_id`, `rating`, `review_text`) VALUES
(1, 2, 1, 5, 'Jamaica was extremely punctual, professional, and handled registration with ease.');

SET FOREIGN_KEY_CHECKS = 1;
// PROFILE SECTION FOR USERS (EMPLOYERS AND EMPLOYEES) DONE BY KEVEN
const express = require('express');
const router = express.Router();
const db = require('../db/connection');

const checkAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    } else {
        req.flash('error', 'Please log in to view this page');
        res.redirect('/login');
    }
};

const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    req.flash('error', 'Only admin accounts can access this page.');
    res.redirect('/dashboard');
};

// Helper function to handle rendering user profile logic
const renderProfile = (req, res, profileUserId) => {
    // 1. Fetch user details
    const userSql = 'SELECT id, username, email, address, contact, role FROM users WHERE id = ?';
    
    db.query(userSql, [profileUserId], (err, userResults) => {
        if (err || userResults.length === 0) {
            req.flash('error', 'User profile not found.');
            return res.redirect('/dashboard');
        }

        const profileUser = userResults[0];

        if (profileUser.role === 'admin') {
            // Employer Profile: Calculate avg rating & fetch reviews received from employees
            const employerQuery = `
                SELECT AVG(rating) AS avg_rating, COUNT(id) AS review_count 
                FROM employer_reviews WHERE employer_id = ?`;

            const reviewsQuery = `
                SELECT er.*, u.username AS reviewer_name, j.job_title
                FROM employer_reviews er
                JOIN users u ON er.reviewer_id = u.id
                JOIN jobs j ON er.job_id = j.id
                WHERE er.employer_id = ? ORDER BY er.created_at DESC`;

            db.query(employerQuery, [profileUserId], (err, stats) => {
                if (err) throw err;

                db.query(reviewsQuery, [profileUserId], (err, reviews) => {
                    if (err) throw err;

                    res.render('profile', {
                        user: req.session.user,
                        profileUser: profileUser,
                        avgRating: stats[0].avg_rating ? parseFloat(stats[0].avg_rating).toFixed(1) : null,
                        reviewCount: stats[0].review_count,
                        reviews: reviews
                    });
                });
            });

        } else {
            // Employee Profile: Calculate avg rating & fetch reviews received from employers
            const employeeQuery = `
                SELECT AVG(rating) AS avg_rating, COUNT(id) AS review_count 
                FROM employee_ratings WHERE employee_id = ?`;

            const reviewsQuery = `
                SELECT er.*, u.username AS reviewer_name, j.job_title
                FROM employee_ratings er
                JOIN users u ON er.employer_id = u.id
                JOIN jobs j ON er.job_id = j.id
                WHERE er.employee_id = ? ORDER BY er.created_at DESC`;

            db.query(employeeQuery, [profileUserId], (err, stats) => {
                if (err) throw err;

                db.query(reviewsQuery, [profileUserId], (err, reviews) => {
                    if (err) throw err;

                    res.render('profile', {
                        user: req.session.user,
                        profileUser: profileUser,
                        avgRating: stats[0].avg_rating ? parseFloat(stats[0].avg_rating).toFixed(1) : null,
                        reviewCount: stats[0].review_count,
                        reviews: reviews
                    });
                });
            });
        }
    });
};

// GET Route: View Current User Profile (/profile)
router.get('/', checkAuthenticated, (req, res) => {
    renderProfile(req, res, req.session.user.id);
});

//GET/profile/management
router.get('/management', checkAuthenticated, (req, res) => {
    if (req.session.user.role !== 'admin') {
        req.flash('error', 'Only employers can access management.');
        return res.redirect('/dashboard');
    }

    const employerId = req.session.user.id;

    const ratingsGivenSql = `
        SELECT er.id, er.rating, er.review_text, er.created_at,
               u.username AS student_name,
               j.job_title
        FROM employee_ratings er
        JOIN users u ON er.employee_id = u.id
        JOIN jobs j ON er.job_id = j.id
        WHERE er.employer_id = ?
        ORDER BY er.created_at DESC
    `;

    const ratingsReceivedSql = `
        SELECT er.id, er.rating, er.review_text, er.created_at,
               u.username AS reviewer_name,
               j.job_title
        FROM employer_reviews er
        JOIN users u ON er.reviewer_id = u.id
        JOIN jobs j ON er.job_id = j.id
        WHERE er.employer_id = ?
        ORDER BY er.created_at DESC
    `;

    db.query(ratingsGivenSql, [employerId], (err, givenRows) => {
        if (err) throw err;

        db.query(ratingsReceivedSql, [employerId], (err, receivedRows) => {
            if (err) throw err;

            res.render('manage-ratings', {
                user: req.session.user,
                ratingsGiven: givenRows,
                ratingsReceived: receivedRows,
                messages: req.flash('success'),
                errors: req.flash('error'),
            });
        });
    });
});


// GET Route: View Specific User Profile by ID (/profile/:id)
router.get('/:id', checkAuthenticated, (req, res) => {
    renderProfile(req, res, req.params.id);
});

// POST Route: Employer rates an Employee
router.post('/rate-employee', checkAuthenticated, (req, res) => {
    if (req.session.user.role !== 'admin') {
        req.flash('error', 'Unauthorized action.');
        return res.redirect('/dashboard');
    }

    const { job_id, employee_id, rating, review_text } = req.body;
    const employer_id = req.session.user.id;

    const sql = `INSERT INTO employee_ratings (job_id, employee_id, employer_id, rating, review_text) 
                 VALUES (?, ?, ?, ?, ?)`;

    db.query(sql, [job_id, employee_id, employer_id, rating, review_text], (err) => {
        if (err) {
            req.flash('error', 'Failed to submit rating.');
            return res.redirect('/profile/' + employee_id);
        }
        req.flash('success', 'Employee rated successfully!');
        res.redirect('/profile/' + employee_id);
    });
});

module.exports = router;
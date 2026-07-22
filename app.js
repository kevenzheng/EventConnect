const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const db = require('./db/connection');

const app = express();

// =====================================================
// BASIC EXPRESS SETUP
// Purpose:
// Read form data and load CSS/images from public folder.
// =====================================================
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));

// =====================================================
// EJS SETUP
// Purpose:
// Allows Express to render .ejs files from views folder.
// =====================================================
app.set('view engine', 'ejs');

// =====================================================
// SESSION SETUP
// Purpose:
// Remember logged-in users between page visits.
// =====================================================
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

// =====================================================
// FLASH MESSAGE SETUP
// Purpose:
// Show temporary success/error messages.
// =====================================================
app.use(flash());

// =====================================================
// AUTHENTICATION MIDDLEWARE
// Purpose:
// Protect pages so only logged-in users can access them.
// =====================================================
const checkAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    } else {
        req.flash('error', 'Please log in to view this page');
        res.redirect('/login');
    }
};

// =====================================================
// HOME PAGE ROUTE
// Purpose:
// Show homepage with Home, Login, Register buttons.
// If user is logged in, show Dashboard and Logout.
// =====================================================
app.get('/', (req, res) => {
    res.render('index', {
        user: req.session.user,
        messages: req.flash('success')
    });
});

// =====================================================
// REGISTER PAGE ROUTE
// Purpose:
// Show register page.
// This allows the Register button/link to work.
// =====================================================
app.get('/register', (req, res) => {
    res.render('register', {
        messages: req.flash('error'),
        formData: req.flash('formData')[0]
    });
});

// =====================================================
// REGISTER VALIDATION MIDDLEWARE
// Purpose:
// Check that all registration fields are filled.
// Check that password is at least 6 characters.
// =====================================================
const validateRegistration = (req, res, next) => {
    const { username, email, password, address, contact, role } = req.body;

    if (!username || !email || !password || !address || !contact || !role) {
        req.flash('error', 'All fields are required.');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }

    if (password.length < 6) {
        req.flash('error', 'Password should be at least 6 or more characters long');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }

    next();
};

// =====================================================
// REGISTER FORM SUBMISSION ROUTE
// Purpose:
// Insert new user into users table.
// Password is stored using SHA1 like Lesson 19.
// =====================================================
app.post('/register', validateRegistration, (req, res) => {
    const { username, email, password, address, contact, role } = req.body;

    const sql = 'INSERT INTO users (username, email, password, address, contact, role) VALUES (?, ?, SHA1(?), ?, ?, ?)';

    db.query(sql, [username, email, password, address, contact, role], (err, result) => {
        if (err) {
            throw err;
        }

        console.log(result);
        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/login');
    });
});

// =====================================================
// LOGIN PAGE ROUTE
// Purpose:
// Show login page.
// =====================================================
app.get('/login', (req, res) => {
    res.render('login', {
        messages: req.flash('success'),
        errors: req.flash('error')
    });
});

// =====================================================
// LOGIN FORM SUBMISSION ROUTE
// Purpose:
// Check email and password from users table.
// If correct, save user into session.
// =====================================================
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/login');
    }

    const sql = 'SELECT * FROM users WHERE email = ? AND password = SHA1(?)';

    db.query(sql, [email, password], (err, results) => {
        if (err) {
            throw err;
        }

        if (results.length > 0) {
            req.session.user = results[0];
            req.flash('success', 'Login successful!');
            res.redirect('/dashboard');
        } else {
            req.flash('error', 'Invalid email or password.');
            res.redirect('/login');
        }
    });
});

// =====================================================
// DASHBOARD ROUTE
// Purpose:
// Protected page.
// Only logged-in users can access.
// =====================================================
app.get('/dashboard', checkAuthenticated, (req, res) => {
    res.render('dashboard', {
        user: req.session.user,
        messages: req.flash('success')
    });
});

// =====================================================
// LOGOUT ROUTE
// Purpose:
// Destroy session and log user out.
// =====================================================
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// =====================================================
// PART B - ADDING NEW INFORMATION TO THE SYSTEM
// Feature: Post New Job (Create)
// Purpose:
// All routes for this feature live in routes/jobs.js so it can be
// shown and graded as one self-contained file.
// Mounted here so its routes become /jobs/add (GET and POST).
// =====================================================

// Yashveen Part B (START) 
const jobsRouter = require('./routes/jobs');
app.use('/jobs', jobsRouter);
// Yashveen Part B (END)


// Ignatius start of Code
const browseRouter = require('./routes/browse');
app.use('/jobs', browseRouter);
// Ignatius end of Code

// =====================================================
// PART E - APPLICATION MANAGEMENT
// Feature: Apply for Job / View Applications / Withdraw /
//          Applicant Management / Status Management
// Purpose:
// All routes for this feature live in routes/applications.js
// so it can be shown and graded as one self-contained file.
// Mounted here so its routes become /applications (GET and POST).
// =====================================================
const applicationsRouter = require('./routes/applications');
app.use('/applications', applicationsRouter);

//keven start of code
// Profile Feature Route
const profileRouter = require('./routes/profile');
app.use('/profile', profileRouter);
// keven end of code
// =====================================================
// START SERVER
// Purpose:
// Run app on http://localhost:3000
// =====================================================
app.listen(3000, () => {
    console.log(`Server started on port http://localhost:3000`);
});

// Samie end of Login Page Assignment ===============================================================
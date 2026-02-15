// --- server.js (Final Version - Corrected Structure) ---
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt'); // <<< IMPORTED BCRYPT

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors({
    origin: 'http://127.0.0.1:5500' // *** CRITICAL: Must match your Live Server port ***
}));

// Database Connection Pool (Check .env values here)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ===============================================================
// 1. TEST ENDPOINT (To satisfy script.js test call)
// ===============================================================
app.get('/api/test', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT message, timestamp FROM test_data');
        
        if (rows.length === 0) {
            await pool.query('INSERT INTO test_data (message) VALUES (?)', ['Database connection successful!']);
            res.status(200).json({ message: 'Successfully connected and inserted initial test data.', data: [{ message: 'Database connection successful!', timestamp: new Date().toISOString() }] });
        } else {
            res.status(200).json({ message: 'Successfully retrieved test data.', data: rows });
        }
    } catch (error) {
        console.error("DATABASE CONNECTION FAILED:", error);
        res.status(500).json({ message: "Database Connection Error" });
    }
});


// ===============================================================
// 2. MOVIE DATA ENDPOINTS (For Index Page & Admin)
// ===============================================================

// GET all movies (Handles filtering by status, e.g., /api/movies?status=now-showing)
app.get('/api/movies', async (req, res) => {
    try {
        const statusFilter = req.query.status; 
        let sqlQuery = 'SELECT * FROM movies';
        let queryParams = [];

        if (statusFilter) {
            sqlQuery += ' WHERE status = ?';
            queryParams.push(statusFilter);
        }

        const [rows] = await pool.query(sqlQuery, queryParams);
        res.status(200).json(rows); 

    } catch (error) {
        console.error("Error fetching movies:", error);
        res.status(500).json({ message: "Database error retrieving movies" });
    }
});

// POST an add movie (for Admin page)
app.post('/api/admin/movie', async (req, res) => {
    // Destructure all the expected fields from the form submission
    const { title, overview, rating_duration, poster_url, release_date, status, trailer_url } = req.body;
    
    if (!title || !status) {
        return res.status(400).json({ message: "Missing required movie fields (Title and Status are mandatory)." });
    }
    
    try {
        // INSERT statement for the 'movies' table
        const [result] = await pool.query(
            'INSERT INTO movies (title, overview, rating_duration, poster_url, release_date, status, trailer_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [title, overview, rating_duration, poster_url, release_date || null, status, trailer_url || null]
        );
        res.status(201).json({ message: "Movie added successfully", movieId: result.insertId });
    } catch (error) {
        console.error("Error adding movie:", error);
        res.status(500).json({ message: "Database error adding movie" });
    }
});

// ... (This should be followed by the booking routes and app.listen) ...

// ===============================================================
// 3. USER AUTHENTICATION ENDPOINTS (Register & Login)
// ===============================================================

// POST /api/register
app.post('/api/register', async (req, res) => {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await pool.query(
            'INSERT INTO users (email, password_hash, first_name, last_name, is_admin) VALUES (?, ?, ?, ?, 0)',
            [email, hashedPassword, firstName, lastName]
        );
        
        res.status(201).json({ 
            message: "Registration successful. Logged in.", 
            user: { email: email, firstName: firstName || '', isAdmin: false }
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ message: "Email already exists." });
        } else {
            console.error("Registration Error:", error);
            res.status(500).json({ message: "Server error during registration." });
        }
    }
});

// POST /api/login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
    }

    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

        if (rows.length === 0) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        const user = rows[0];
        
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (isPasswordValid) {
            res.status(200).json({ 
                message: "Login successful.", 
                user: { 
                    email: user.email, 
                    firstName: user.first_name, 
                    isAdmin: user.is_admin === 1
                }
            });
        } else {
            res.status(401).json({ message: "Invalid credentials." });
        }

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Server error during login." });
    }
});


// ===============================================================
// 4. BOOKING ENDPOINTS (For Buy Tickets & My Bookings)
// ===============================================================

// POST a new booking (called after successful payment)
app.post('/api/booking', async (req, res) => {
    const { userId, title, location, date, time, selectedSeats, totalPrice, paymentMethod } = req.body;
    
    if (!userId || !title || !selectedSeats || !totalPrice) {
        return res.status(400).json({ message: "Missing required booking data." });
    }

    const dateTime = `${date} ${time}`;

    try {
        const [result] = await pool.query(
            'INSERT INTO bookings (user_email, movie_title, location, date_time, seats, total_price, payment_method) VALUES (?, ?, ?, STR_TO_DATE(?, \'%M %d, %Y %h:%i %p\'), ?, ?, ?)',
            [userId, title, location, dateTime, selectedSeats.join(', '), totalPrice, paymentMethod]
        );
        
        res.status(201).json({ message: "Booking successful", bookingId: result.insertId });

    } catch (error) {
        console.error("Error creating booking:", error);
        res.status(500).json({ message: "Database error saving booking" });
    }
});


// GET user's bookings (for my-bookings.html)
app.get('/api/bookings/:email', async (req, res) => {
    const email = req.params.email;
    try {
        const [rows] = await pool.query(
            'SELECT *, DATE_FORMAT(date_time, \'%M %d, %Y - %h:%i %p\') as formatted_datetime FROM bookings WHERE user_email = ? ORDER BY booking_timestamp DESC',
            [email]
        );
        
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error fetching user bookings:", error);
        res.status(500).json({ message: "Database error retrieving bookings" });
    }
});


// ===============================================================
// 5. START SERVER
// ===============================================================
app.listen(PORT, () => {
    console.log(`✅ Backend Server is running on http://localhost:${PORT}`);
});
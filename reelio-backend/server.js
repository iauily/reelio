require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const path = require('path');
const qrcode = require('qrcode');
const Sentiment = require('sentiment'); // Ensure this is installed

const app = express();
const sentiment = new Sentiment();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({ origin: 'http://127.0.0.1:5500' }));
app.use(express.static(path.join(__dirname)));

const applyNoCacheHeaders = (res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
};

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10
});

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// --- FIXED: Consolidated Contact Route ---
app.post('/api/contact', async (req, res) => {
    const { firstName, lastName, emailAddress, messageContent } = req.body;
    
    // We remove the user_id from the insert to let the database handle it automatically
    try {
        console.log("Saving feedback to database...");
        
        const sql = 'INSERT INTO feedback (email, message, sentiment, score) VALUES (?, ?, ?, ?)';
        // We use dummy values for sentiment/score just to see if the DB insert works
        await pool.query(sql, [emailAddress, messageContent, 'Neutral', 0]);
        
        console.log("Successfully saved to database!");
        res.status(200).json({ message: "Success" });
        
    } catch (error) {
        // THIS IS THE MOST IMPORTANT PART:
        console.error("THE SERVER CRASHED BECAUSE:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

// ===============================================================
// 1. TEST ENDPOINT 
// ===============================================================
app.get('/api/test', async (req, res) => {
    applyNoCacheHeaders(res); 
    try {
        const [rows] = await pool.query('SELECT message, timestamp FROM test_data');
        
        if (rows.length === 0) {
            await pool.query('INSERT INTO test_data (message) VALUES (?)', ['Database connection successful!']);
            res.status(200).json({ message: "Successfully connected and inserted initial test data.", data: [{ message: 'Database connection successful!', timestamp: new Date().toISOString() }] });
        } else {
            res.status(200).json({ message: "Successfully retrieved test data.", data: rows });
        }
    } catch (error) {
        console.error("DATABASE CONNECTION FAILED:", error);
        res.status(500).json({ message: "Database Connection Error" });
    }
});


// ===============================================================
// 2. MOVIE DATA ENDPOINTS 
// ===============================================================

// GET all movies (Handles filtering by status, e.g., /api/movies?status=now-showing)
app.get('/api/movies', async (req, res) => {
    applyNoCacheHeaders(res); 
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
    const { title, overview, rating_duration, poster_url, release_date, status, trailer_url } = req.body;
    
    if (!title || !status) {
        return res.status(400).json({ message: "Missing required movie fields (Title and Status are mandatory)." });
    }
    
    try {
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

app.put('/api/admin/movie/:id', async (req, res) => {
    const movieId = req.params.id;
    const { title, overview, rating_duration, poster_url, release_date, status, trailer_url } = req.body;
    
    try {
        const [result] = await pool.query(
            `UPDATE movies SET title=?, overview=?, rating_duration=?, poster_url=?, release_date=?, status=?, trailer_url=? WHERE movie_id=?`,
            [title, overview, rating_duration, poster_url, release_date || null, status, trailer_url || null, movieId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Movie not found." });
        }
        res.status(200).json({ message: "Movie updated successfully." });
    } catch (error) {
        console.error("Error updating movie:", error);
        res.status(500).json({ message: "Database error updating movie." });
    }
});

app.delete('/api/admin/movie/:id', async (req, res) => {
    const movieId = req.params.id;
    try {
        const [result] = await pool.query('DELETE FROM movies WHERE movie_id = ?', [movieId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Movie not found." });
        }
        res.status(200).json({ message: "Movie deleted successfully." });
    } catch (error) {
        console.error("Error deleting movie:", error);
        res.status(500).json({ message: "Database error deleting movie." });
    }
});


// ===============================================================
// 3. USER AUTHENTICATION ENDPOINTS 
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

// --- NEW THEME PREFERENCE ENDPOINTS in server.js ---

// PUT /api/user/theme
app.put('/api/user/theme', async (req, res) => {
    const { email, theme } = req.body;
    if (!email || !theme || (theme !== 'light' && theme !== 'dark')) {
        return res.status(400).json({ message: "Missing required data (email or invalid theme)." });
    }
    try {
        const [result] = await pool.query(
            'UPDATE users SET theme_preference = ? WHERE email = ?',
            [theme, email]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "User not found." });
        }
        res.status(200).json({ message: "Theme preference updated successfully." });
    } catch (error) {
        console.error("Error updating theme preference:", error);
        res.status(500).json({ message: "Database error updating theme." });
    }
});

// GET /api/user/theme (Called after login)
app.get('/api/user/theme/:email', async (req, res) => {
    const email = req.params.email;
    try {
        const [rows] = await pool.query(
            'SELECT theme_preference FROM users WHERE email = ?',
            [email]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: "User not found." });
        }
        res.status(200).json({ theme: rows[0].theme_preference });
    } catch (error) {
        console.error("Error retrieving theme preference:", error);
        res.status(500).json({ message: "Database error retrieving theme." });
    }
});

// --- END NEW THEME PREFERENCE ENDPOINTS ---
// ===============================================================
// 4. BOOKING ENDPOINTS 
// ===============================================================

// POST a new booking (called after successful payment)
app.post('/api/booking', async (req, res) => {
    const { userId, title, location, date, time, selectedSeats, totalPrice, paymentMethod } = req.body;
    
    if (!userId || !title || !selectedSeats || !totalPrice) {
        return res.status(400).json({ message: "Missing required booking data." });
    }

    const dateTime = `${date} ${time}`;
    
    try {
        // 1. Get the user_id from email
        const [userRows] = await pool.query('SELECT user_id FROM users WHERE email = ?', [userId]);
        const dbUserId = userRows.length > 0 ? userRows[0].user_id : null;

        // 2. Get the movie_id from title
        const [movieRows] = await pool.query('SELECT movie_id FROM movies WHERE title = ?', [title]);
        const dbMovieId = movieRows.length > 0 ? movieRows[0].movie_id : null;

        // 3. Generate QR code
        const qrText = `Reelio-Booking:${userId}|${title}|${selectedSeats.join(',')}|${dateTime}`;
        const qrDataUrl = await qrcode.toDataURL(qrText, { errorCorrectionLevel: 'H' });
        
        // 4. Save to DB
        // Note: finalPaymentStatus is 'PENDING' for Cash, 'PAID' for others
        const finalPaymentStatus = (paymentMethod === 'Cash on Counter') ? 'PENDING' : 'PAID';

        const [insertResult] = await pool.query(
            `INSERT INTO bookings 
            (user_email, movie_title, location, date_time, seats, total_price, payment_method, payment_status, qr_code_data, user_id, movie_id) 
            VALUES (?, ?, ?, STR_TO_DATE(?, '%Y-%m-%d %H:%i:%s'), ?, ?, ?, ?, ?, ?, ?)`,
            [userId, title, location, dateTime, selectedSeats.join(','), totalPrice, paymentMethod, finalPaymentStatus, qrDataUrl, dbUserId, dbMovieId]
        );

        // 5. Send Email
        const bookingDetailsForEmail = {
            userId: userId,
            title: title,
            location: location,
            date: date,
            time: time,
            selectedSeats: selectedSeats,
            totalPrice: totalPrice,
            paymentMethod: paymentMethod,
            bookingId: insertResult.insertId,
            qrCodeData: qrDataUrl
        };
        
        await sendConfirmationEmail(bookingDetailsForEmail); 
        
        res.status(201).json({ message: "Booking successful", bookingId: insertResult.insertId });

    } catch (error) {
        console.error("Booking Error:", error);
        res.status(500).json({ message: "Database error or QR generation failed." });
    }
});

// GET user's bookings (for my-bookings.html)
app.get('/api/bookings/:email', async (req, res) => {
    applyNoCacheHeaders(res); 
    const email = req.params.email;
    try {
        const [rows] = await pool.query(
            'SELECT *, payment_status, DATE_FORMAT(date_time, \'%M %d, %Y - %h:%i %p\') as formatted_datetime FROM bookings WHERE user_email = ? ORDER BY booking_timestamp DESC',
            [email]
        );
        
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error fetching user bookings:", error);
        res.status(500).json({ message: "Database error retrieving bookings" });
    }
});

// ===============================================================
// 5. *** ADMIN API ENDPOINTS *** 
// ===============================================================

// --- Movie Management ---
app.get('/api/admin/movies', async (req, res) => {
    applyNoCacheHeaders(res); 
    try {
        const [rows] = await pool.query('SELECT * FROM movies');
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error fetching all movies for admin:", error);
        res.status(500).json({ message: "Database error retrieving movies" });
    }
});

app.post('/api/admin/movie', async (req, res) => {
    const { title, overview, rating_duration, poster_url, release_date, status, trailer_url } = req.body;
    
    if (!title || !status) {
        return res.status(400).json({ message: "Missing required movie fields (Title and Status are mandatory)." });
    }
    
    try {
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

app.put('/api/admin/movie/:id', async (req, res) => {
    const movieId = req.params.id;
    const { title, overview, rating_duration, poster_url, release_date, status, trailer_url } = req.body;
    
    try {
        const [result] = await pool.query(
            `UPDATE movies SET title=?, overview=?, rating_duration=?, poster_url=?, release_date=?, status=?, trailer_url=? WHERE movie_id=?`,
            [title, overview, rating_duration, poster_url, release_date || null, status, trailer_url || null, movieId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Movie not found." });
        }
        res.status(200).json({ message: "Movie updated successfully." });
    } catch (error) {
        console.error("Error updating movie:", error);
        res.status(500).json({ message: "Database error updating movie." });
    }
});

app.delete('/api/admin/movie/:id', async (req, res) => {
    const movieId = req.params.id;
    try {
        const [result] = await pool.query('DELETE FROM movies WHERE movie_id = ?', [movieId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Movie not found." });
        }
        res.status(200).json({ message: "Movie deleted successfully." });
    } catch (error) {
        console.error("Error deleting movie:", error);
        res.status(500).json({ message: "Database error deleting movie." });
    }
});

// --- Showtime Management ---
app.get('/api/admin/showtimes/:movieId', async (req, res) => {
    applyNoCacheHeaders(res); 
    const movieId = req.params.movieId;
    try {
        const [rows] = await pool.query(`
            SELECT 
                *, 
                DATE_FORMAT(show_date, '%Y-%m-%d') as show_date, 
                TIME_FORMAT(STR_TO_DATE(show_time, '%H:%i:%s'), '%h:%i %p') as display_time 
            FROM showtimes 
            WHERE movie_id = ?
        `, [movieId]);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error fetching showtimes:", error);
        res.status(500).json({ message: "Database error fetching showtimes." });
    }
});

app.post('/api/admin/showtime', async (req, res) => {
    const { movieId, time, date, location } = req.body;
    
    // --- FIX FOR TIME FORMATTING (Converting AM/PM Text to 24hr Time) ---
    let finalTime24hr;
    
    try {
        // Simple parsing logic assuming time input is in "X:XX AM/PM" format from admin.js
        const parts = time.toUpperCase().split(' ');
        const [hStr, mStr] = parts[0].split(':');
        let h = parseInt(hStr, 10);
        const m = mStr || '00';
        
        if (parts.includes('PM') && h !== 12) {
            finalTime24hr = `${h + 12}:${m}:00`;
        } else if (parts.includes('AM') && h === 12) {
            finalTime24hr = `00:${m}:00`; // Midnight case
        } else {
            finalTime24hr = `${String(h).padStart(2, '0')}:${m}:00`;
        }
    } catch (e) {
        console.warn("Time parsing failed for admin input, using raw time:", time);
        finalTime24hr = time; // Fallback
    }
    
    if (!movieId || !finalTime24hr || !date || !location) {
        return res.status(400).json({ message: "Missing required showtime data." });
    }

    try {
        // *** Check for duplicate showtime using the converted 24HR time ***
        const [existingRows] = await pool.query(
            'SELECT showtime_id FROM showtimes WHERE movie_id = ? AND show_date = ? AND location = ? AND show_time = ?',
            [movieId, date, location, finalTime24hr] 
        );

        if (existingRows.length > 0) {
            return res.status(409).json({ message: "Duplicate showtime! A showtime already exists for this movie, date, cinema, and time." });
        }

        const [result] = await pool.query(
            'INSERT INTO showtimes (movie_id, show_time, show_date, location) VALUES (?, ?, ?, ?)',
            [movieId, finalTime24hr, date, location] // INSERT THE CONVERTED 24HR TIME
        );
        res.status(201).json({ message: "Showtime added successfully", showtimeId: result.insertId });
    } catch (error) {
        console.error("Error adding showtime:", error);
        res.status(500).json({ message: "Database error adding showtime." });
    }
});

app.put('/api/admin/showtime/:showtimeId', async (req, res) => {
    const { showtimeId } = req.params;
    const { time, date, location } = req.body;

    if (!time && !date && !location) {
        return res.status(400).json({ message: "No fields provided to update." });
    }

    try {
        let updates = [];
        let params = [];
        if (time) { updates.push('show_time = ?'); params.push(time); }
        if (date) { updates.push('show_date = ?'); params.push(date); }
        if (location) { updates.push('location = ?'); params.push(location); }
        
        params.push(showtimeId);

        const [result] = await pool.query(
            `UPDATE showtimes SET ${updates.join(', ')} WHERE showtime_id = ?`,
            params
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Showtime not found." });
        }
        res.status(200).json({ message: "Showtime updated successfully." });
    } catch (error) {
        console.error("Error updating showtime:", error);
        res.status(500).json({ message: "Database error updating showtime." });
    }
});

app.delete('/api/admin/showtime/:showtimeId', async (req, res) => {
    const showtimeId = req.params.showtimeId;
    try {
        const [result] = await pool.query('DELETE FROM showtimes WHERE showtime_id = ?', [showtimeId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Showtime not found." });
        }
        res.status(200).json({ message: "Showtime deleted successfully." });
    } catch (error) {
        console.error("Error deleting showtime:", error);
        res.status(500).json({ message: "Database error deleting showtime." });
    }
});

// --- Booking Management ---
app.get('/api/admin/bookings', async (req, res) => {
    applyNoCacheHeaders(res); 
    try {
        const [rows] = await pool.query('SELECT * FROM bookings ORDER BY booking_timestamp DESC');
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error fetching all bookings for admin:", error);
        res.status(500).json({ message: "Database error retrieving bookings" });
    }
});

app.get('/api/admin/bookings/location/:locationName', async (req, res) => {
    applyNoCacheHeaders(res);
    const locationName = req.params.locationName;
    try {
        const [rows] = await pool.query(
            'SELECT *, DATE_FORMAT(date_time, \'%M %d, %Y - %h:%i %p\') as formatted_datetime FROM bookings WHERE location = ? ORDER BY booking_timestamp DESC',
            [locationName]
        );
        
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error fetching bookings by location:", error);
        res.status(500).json({ message: "Database error retrieving bookings for location" });
    }
});


app.get('/api/bookings/:email', async (req, res) => {
    applyNoCacheHeaders(res); 
    const email = req.params.email;
    try {
        const [rows] = await pool.query(
            'SELECT *, payment_status, DATE_FORMAT(date_time, \'%M %d, %Y - %h:%i %p\') as formatted_datetime FROM bookings WHERE user_email = ? ORDER BY booking_timestamp DESC',
            [email]
        );
        
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error fetching user bookings:", error);
        res.status(500).json({ message: "Database error retrieving bookings" });
    }
});

// ===============================================================
// 6. *** ADMIN STATS (Analytics)
// ===============================================================
app.get('/api/admin/stats', async (req, res) => {
    applyNoCacheHeaders(res);
    try {
        const [bookingCountRows] = await pool.query('SELECT COUNT(booking_id) as totalBookings FROM bookings');
        const totalBookings = bookingCountRows[0].totalBookings || 0;

        const [revenueRows] = await pool.query('SELECT SUM(total_price) as totalRevenue FROM bookings');
        const totalRevenue = revenueRows[0].totalRevenue === null ? 0 : Number(revenueRows[0].totalRevenue);

        res.status(200).json({ 
            totalBookings: totalBookings, 
            totalRevenue: totalRevenue 
        });
    } catch (error) {
        console.error("Error calculating analytics stats:", error);
        res.status(500).json({ message: "Database error calculating stats." });
    }
});

// --- Booking Control / Cancellation (NEW ROUTE) ---
app.post('/api/admin/cancellation/:bookingId', async (req, res) => {
    const bookingId = req.params.bookingId;
    if (!bookingId) {
        return res.status(400).json({ message: "Missing booking ID." });
    }
    try {
        const [updateResult] = await pool.query(
            'UPDATE bookings SET payment_status = "CANCELLED", date_time = NULL WHERE booking_id = ?', 
            [bookingId]
        );
        
        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ message: "Booking ID not found." });
        }

        res.status(200).json({ message: `Booking ${bookingId} cancelled successfully.` });
    } catch (error) {
        console.error("Cancellation Error:", error);
        res.status(500).json({ message: "Server error during cancellation processing." });
    }
});

// New Endpoint to GET occupied seats for a specific showtime
app.get('/api/seats/occupied', async (req, res) => {
    applyNoCacheHeaders(res);
    const { movieTitle, date, time, location } = req.query; 

    if (!movieTitle || !date || !time || !location) {
        return res.status(400).json({ message: "Missing required parameters (title, date, time, location)." });
    }

    try {
        const sql = `
            SELECT seats 
            FROM bookings 
            WHERE movie_title = ? 
            AND location = ? 
            AND DATE(date_time) = ? 
            AND TIME_FORMAT(TIME(date_time), '%H:%i:%s') = ? 
            AND payment_status != 'CANCELLED'
        `;
        
        const [rows] = await pool.query(sql, [movieTitle, location, date, time]);

        let occupiedSeats = [];
        rows.forEach(row => {
            if (row.seats) {
                const seatArray = row.seats.split(',').map(s => s.trim()).filter(s => s.length > 0);
                occupiedSeats.push(...seatArray);
            }
        });

        res.status(200).json({ occupiedSeats: [...new Set(occupiedSeats)] }); 

    } catch (error) {
        console.error("Error fetching occupied seats (Server Crash - Check SQL Syntax/Data Types):", error);
        res.status(200).json({ 
            message: "Database error retrieving seats. Using simulation.", 
            occupiedSeats: ['A3','A4','B5','C1','C2','D8','D9','G10'] 
        });
    }
});


// ===============================================================
// 7. CASHIER/MANUAL BOOKING ENDPOINTS (NEW)
// ===============================================================

// GET: Get all available seats for a specific showtime
app.get('/api/cashier/seats/available', async (req, res) => {
    applyNoCacheHeaders(res);
    const { movieTitle, date, time, location } = req.query; 

    if (!movieTitle || !date || !time || !location) {
        return res.status(400).json({ message: "Missing required parameters (title, date, time, location)." });
    }

    try {
        // 1. Get all SEATS ALREADY BOOKED (from online/manual bookings)
        const sqlBooked = `
            SELECT seats 
            FROM bookings 
            WHERE movie_title = ? 
            AND location = ? 
            AND DATE(date_time) = ? 
            AND TIME_FORMAT(TIME(date_time), '%H:%i:%s') = ? 
            AND payment_status != 'CANCELLED' 
        `;
        
        const [bookedRows] = await pool.query(sqlBooked, [movieTitle, location, date, time]);

        let occupiedSeats = new Set();
        bookedRows.forEach(row => {
            if (row.seats) {
                row.seats.split(',').map(s => s.trim()).filter(s => s.length > 0).forEach(seat => occupiedSeats.add(seat));
            }
        });

        // 2. Generate ALL possible seats (A1 to G10 = 70 seats)
        const rows = ['A','B','C','D','E','F','G'];
        const numSeatsPerRow = 10;
        const allSeats = [];
        rows.forEach(row => {
            for(let i=1; i<=numSeatsPerRow; i++){
                allSeats.push(`${row}${i}`);
            }
        });

        // 3. Determine Available Seats
        const availableSeats = allSeats.filter(seat => !occupiedSeats.has(seat));

        res.status(200).json({ 
            allSeats: allSeats,
            occupiedSeats: Array.from(occupiedSeats),
            availableSeats: availableSeats
        }); 

    } catch (error) {
        console.error("Error fetching available seats for cashier:", error);
        res.status(500).json({ message: "Database error retrieving seats." });
    }
});


// POST: Manual Cash Booking (Called from cashier.html)
app.post('/api/cashier/book', async (req, res) => {
    const { userId, title, location, date, time, selectedSeats, totalPrice, paymentMethod, cashierEmail, cashierNotes } = req.body;
    
    if (!cashierEmail || !userId || !title || !selectedSeats || !totalPrice || !paymentMethod) {
        return res.status(400).json({ message: "Missing required cashier booking data." });
    }

    const dateTime = `${date} ${time}`;
    
    try {
        // Check if seats are still available before booking (prevent race condition)
        const sqlCheck = `
            SELECT seats 
            FROM bookings 
            WHERE movie_title = ? AND location = ? AND DATE(date_time) = ? AND TIME_FORMAT(TIME(date_time), '%H:%i:%s') = ? AND payment_status != 'CANCELLED'
        `;
        const [rows] = await pool.query(sqlCheck, [title, location, date, time]);
        
        let existingOccupied = new Set();
        rows.forEach(row => {
            if (row.seats) {
                row.seats.split(',').map(s => s.trim()).filter(s => s.length > 0).forEach(seat => existingOccupied.add(seat));
            }
        });

        const newSeats = selectedSeats.filter(seat => !existingOccupied.has(seat));
        
        if (newSeats.length !== selectedSeats.length) {
            const blocked = selectedSeats.filter(seat => existingOccupied.has(seat));
            return res.status(409).json({ message: `One or more seats are no longer available: ${blocked.join(', ')}` });
        }
        
        // *** QR CODE GENERATION ***
        const qrData = `CASHIER: ${cashierEmail} | ${title} | ${selectedSeats.join(', ')} | ${dateTime}`;
        const dataUrl = await qrcode.toDataURL(qrData, { errorCorrectionLevel: 'H' });
        const base64String = dataUrl.split(',')[1]; 
        // *** END QR GENERATION ***

        const [insertResult] = await pool.query(
            `INSERT INTO bookings (user_email, movie_title, location, date_time, seats, total_price, payment_method, payment_status, qr_code_data, cashier_notes) 
             VALUES (?, ?, ?, STR_TO_DATE(?, '%Y-%m-%d %H:%i:%s'), ?, ?, ?, 'PAID', ?, ?)` ,
            [userId, title, location, dateTime, newSeats.join(', '), totalPrice, paymentMethod, base64String, cashierNotes]
        );
        
        // Send confirmation email asynchronously
        const bookingDetailsForEmail = {
            userId: userId,
            title: title,
            location: location,
            date: date,
            time: time,
            selectedSeats: newSeats,
            totalPrice: totalPrice,
            paymentMethod: paymentMethod,
            bookingId: insertResult.insertId 
        };
        sendConfirmationEmail(bookingDetailsForEmail); 
        
        res.status(201).json({ message: "Manual booking successful", bookingId: insertResult.insertId });

    } catch (error) {
        console.error("Error processing manual cashier booking:", error);
        res.status(500).json({ message: "Database error saving manual booking or QR generation failed." });
    }
});


// --- Booking Control / Cancellation (NEW ROUTE) ---
app.post('/api/admin/cancellation/:bookingId', async (req, res) => {
    const bookingId = req.params.bookingId;
    if (!bookingId) {
        return res.status(400).json({ message: "Missing booking ID." });
    }
    try {
        const [updateResult] = await pool.query(
            'UPDATE bookings SET payment_status = "CANCELLED", date_time = NULL WHERE booking_id = ?', 
            [bookingId]
        );
        
        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ message: "Booking ID not found." });
        }

        res.status(200).json({ message: `Booking ${bookingId} cancelled successfully.` });
    } catch (error) {
        console.error("Cancellation Error:", error);
        res.status(500).json({ message: "Server error during cancellation processing." });
    }
});

// ===============================================================
// 7. CONTACT FORM API ROUTE
// ===============================================================
app.post('/api/contact', async (req, res) => {

    const { firstName, lastName, emailAddress, messageContent, newsletterChecked } = req.body;
    const ADMIN_EMAIL = "reeliocinema@gmail.com"; // <-- !!! CHANGE THIS TO YOUR REAL ADMIN EMAIL !!!
    
    if (!emailAddress || !messageContent) { 
        return res.status(400).json({ message: "Email and message content are required." });
    }

    try {
        // --- ADMIN NOTIFICATION EMAIL ---
        const mailOptionsToAdmin = {
            from: `"Reelio Contact Form" <${process.env.EMAIL_USER}>`, 
            to: ADMIN_EMAIL,
            subject: `NEW Contact Form Submission from ${firstName || ''} ${lastName || ''}`,
            html: `
                <p>A user has submitted the contact form:</p>
                <p><strong>Name:</strong> ${firstName || 'N/A'} ${lastName || 'N/A'}</p>
                <p><strong>Email:</strong> ${emailAddress}</p>
                <p><strong>Message/Thoughts:</strong></p>
                <div style="background-color: #2a2a2a; padding: 15px; border-radius: 5px; color: #f0f0f0;">
                    ${messageContent.replace(/\n/g, '<br>')}
                </div>
                <p><strong>Newsletter Subscription:</strong> ${newsletterChecked ? 'YES' : 'NO'}</p>
            `
        };

        await transporter.sendMail(mailOptionsToAdmin);
        console.log(`Contact form submission emailed successfully to Admin (${ADMIN_EMAIL}).`);
        
        // --- USER CONFIRMATION EMAIL (ONLY if subscribed) ---
        if (newsletterChecked) {
            const confirmationOptions = {
                from: `"Reelio Ticketing" <${process.env.EMAIL_USER}>`,
                to: emailAddress, 
                subject: `🎉 Welcome to Reelio! You're Subscribed!`,
                html: `
                    <p>Hi ${firstName || 'there'},</p>
                    <p>Thank you for subscribing to the Reelio newsletter! We're excited to keep you updated with the latest movies and exclusive offers.</p>
                    <p>We have also received your message/thought and will review it shortly.</p>
                    <p>Happy Movie Watching!</p>
                    <p>The Reelio Team</p>
                `
            };
            await transporter.sendMail(confirmationOptions);
            console.log(`Newsletter confirmation sent to ${emailAddress}.`);
        }
        // --------------------------------------------------

        res.status(200).json({ message: "Thank you for your submission!" });

    } catch (error) {
        console.error("Error processing contact form submission:", error);
        res.status(500).json({ message: "Failed to process submission or send emails." });
    }
});

// --- NEW ROUTE: Sentiment ---
app.get('/api/admin/sentiment-stats', async (req, res) => {
    applyNoCacheHeaders(res);
    try {
        const [happyRows] = await pool.query('SELECT COUNT(*) as count FROM feedback WHERE sentiment = ?', ['Positive']);
        const [unhappyRows] = await pool.query('SELECT COUNT(*) as count FROM feedback WHERE sentiment = ?', ['Negative']);
        res.status(200).json({ happy: happyRows[0].count, unhappy: unhappyRows[0].count });
    } catch (error) {
        res.status(500).json({ message: "Database error" });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Backend Server is running on http://localhost:${PORT}`);
});

// --- NEW ROUTE: Serve the QR Code Image ---
app.get('/api/booking/qr/:bookingId', async (req, res) => {
    applyNoCacheHeaders(res);
    const bookingId = req.params.bookingId;

    try {
        const [rows] = await pool.query(
            'SELECT qr_code_data FROM bookings WHERE booking_id = ?',
            [bookingId]
        );

        if (rows.length === 0 || !rows[0].qr_code_data) {
            return res.status(404).send('QR Code data not found for this booking.');
        }

        const base64Image = rows[0].qr_code_data;
        const imageBuffer = Buffer.from(base64Image, 'base64');

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', 'inline; filename="ticket.png"');
        res.send(imageBuffer);

    } catch (error) {
        console.error("Error serving QR code image:", error);
        res.status(500).send('Server error retrieving QR code.');
    }
});

// Add this to server.js
app.get('/api/admin/sentiment-stats', async (req, res) => {
    applyNoCacheHeaders(res);
    try {
        // Count positive feedback
        const [happyRows] = await pool.query('SELECT COUNT(*) as count FROM feedback WHERE sentiment = ?', ['Positive']);
        // Count negative feedback
        const [unhappyRows] = await pool.query('SELECT COUNT(*) as count FROM feedback WHERE sentiment = ?', ['Negative']);
        
        res.status(200).json({ 
            happy: happyRows[0].count, 
            unhappy: unhappyRows[0].count 
        });
    } catch (error) {
        console.error("Error fetching sentiment:", error);
        res.status(500).json({ message: "Database error" });
    }
});
// --- END NEW ROUTE ---


// ===============================================================
// 8. START SERVER
// ===============================================================
app.listen(PORT, () => {
    console.log(`✅ Backend Server is running on http://localhost:${PORT}`);
});

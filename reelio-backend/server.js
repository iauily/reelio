// server.js (COMPLETE VERSION WITH STATIC EMAIL QR PLACEHOLDER AND STATIC FILE SERVING)
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt'); 
const nodemailer = require('nodemailer'); 
const path = require('path'); 

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors({
    origin: 'http://127.0.0.1:5500' // *** CRITICAL: Must match your Live Server port ***
}));

// *** NEW: Static File Serving Middleware for Email QR ---
app.use(express.static(path.join(__dirname))); 

// Helper function to apply no-cache headers
const applyNoCacheHeaders = (res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
};


// Database Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// --- Configure Nodemailer Transporter ---
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST, 
    port: parseInt(process.env.EMAIL_PORT || '587', 10), 
    secure: process.env.EMAIL_PORT == 465, // true for 465, false for 587
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// --- Function to send the confirmation email (Uses STATIC Placeholder QR) ---
async function sendConfirmationEmail(bookingDetails) {
    const totalPaid = parseFloat(bookingDetails.totalPrice).toFixed(2);

    // 1. DEFINE THE STATIC PLACEHOLDER IMAGE FOR THE EMAIL
    const qrCodeImage = `
        <div style="text-align: center; margin: 20px 0;">
            <h4 style="color: #ffcc00;">Scan for Quick Entry:</h4>
            <!-- IMPORTANT: Ensure 'email-ticket-qr.png' exists in the server root -->
            <img src="http://localhost:3000/email-ticket-qr.png" alt="QR Code Ticket Placeholder" style="width: 150px; height: 150px; border: 4px solid #ffcc00; padding: 5px;">
            <p style="font-size: 0.8em; color: #999;">Booking ID: ${bookingDetails.bookingId}</p>
        </div>
    `;

    const mailOptions = {
        from: `"Reelio Ticketing" <${process.env.EMAIL_USER}>`,
        to: bookingDetails.userId, 
        subject: `✅ Your Reelio Ticket Confirmation - ID: ${bookingDetails.bookingId}`,
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
                <h2 style="color: #ffcc00;">Booking Confirmed!</h2>
                <p>Thank you for booking with Reelio. Your tickets are reserved.</p>
                
                ${qrCodeImage}  <!-- <-- STATIC QR CODE PLACEHOLDER IS INSERTED HERE -->

                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                    <h3 style="margin-top: 0; color: #333;">${bookingDetails.title}</h3>
                    <p><strong>Location:</strong> ${bookingDetails.location}</p>
                    <p><strong>Date & Time:</strong> ${bookingDetails.date} at ${bookingDetails.time}</p>
                    <p><strong>Seats:</strong> ${bookingDetails.selectedSeats.join(', ')}</p>
                </div>
                
                <table style="width:100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px; border-top: 1px solid #ddd;">Booking ID:</td>
                        <td style="padding: 8px; border-top: 1px solid #ddd; text-align: right; font-weight: bold;">${bookingDetails.bookingId}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border-top: 1px solid #ddd;">Payment Method:</td>
                        <td style="padding: 8px; border-top: 1px solid #ddd; text-align: right; font-weight: bold;">${bookingDetails.paymentMethod}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border-top: 2px solid #ffcc00;"><strong>Total Paid:</strong></td>
                        <td style="padding: 8px; border-top: 2px solid #ffcc00; text-align: right; font-size: 1.2em; color: #d9534f;"><strong>₱${totalPaid}</strong></td>
                    </tr>
                </table>

                <p style="margin-top: 30px; font-size: 0.9em; text-align: center; color: #777;">
                    Please present this QR code on your phone at the cinema counter for quick entry.
                </p>
            </div>
        `
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${bookingDetails.userId}: ${info.messageId}`);
    } catch (error) {
        console.error(`Failed to send email to ${bookingDetails.userId}:`, error);
    }
}


// ===============================================================
// 1. TEST ENDPOINT 
// ===============================================================
app.get('/api/test', async (req, res) => {
    applyNoCacheHeaders(res); 
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
    // This relies on express.json() middleware correctly parsing the body
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
    
    // *** NEW LOGIC TO DETERMINE PAYMENT STATUS ***
    let finalPaymentStatus = 'PAID'; // Default to PAID for Card/GCash
    if (paymentMethod === 'Cash (Reservation)' || paymentMethod === 'Cash (Counter)') {
        finalPaymentStatus = 'PENDING'; // Set to PENDING for cash/reservation
    }
    // *** END NEW LOGIC ***

    try {
        const [result] = await pool.query(
            // *** NEW: Added payment_status to INSERT statement ***
            'INSERT INTO bookings (user_email, movie_title, location, date_time, seats, total_price, payment_method, payment_status) VALUES (?, ?, ?, STR_TO_DATE(?, \'%Y-%m-%d %H:%i:%s\'), ?, ?, ?, ?)',
            [userId, title, location, dateTime, selectedSeats.join(', '), totalPrice, paymentMethod, finalPaymentStatus] // *** NEW: Added finalPaymentStatus ***
        );
        
        // --- PREPARE AND SEND EMAIL ---
        const bookingDetailsForEmail = {
            userId: userId,
            title: title,
            location: location,
            date: date,
            time: time,
            selectedSeats: selectedSeats,
            totalPrice: totalPrice,
            paymentMethod: paymentMethod,
            bookingId: result.insertId // Pass the new ID
        };
        
        // Send email asynchronously without blocking the response
        sendConfirmationEmail(bookingDetailsForEmail); 
        // -----------------------------
        
        res.status(201).json({ message: "Booking successful", bookingId: result.insertId });

    } catch (error) {
        console.error("Error creating booking:", error);
        res.status(500).json({ message: "Database error saving booking" });
    }
});


// GET user's bookings (for my-bookings.html)
app.get('/api/bookings/:email', async (req, res) => {
    applyNoCacheHeaders(res); 
    const email = req.params.email;
    try {
const [rows] = await pool.query('SELECT *, payment_status, DATE_FORMAT(date_time, \'%M %d, %Y - %h:%i %p\') as formatted_datetime FROM bookings ORDER BY booking_timestamp DESC',            [email]
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
    if (!movieId || !time || !date || !location) {
        return res.status(400).json({ message: "Missing required showtime data." });
    }
    try {
        const [result] = await pool.query(
            'INSERT INTO showtimes (movie_id, show_time, show_date, location) VALUES (?, ?, ?, ?)',
            [movieId, time, date, location]
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
// 6. ADMIN STATS (Analytics)
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
            'UPDATE bookings SET date_time = NULL WHERE booking_id = ?', 
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


// --- NEW: CONTACT FORM API ROUTE ---
app.post('/api/contact', async (req, res) => {
    const { emailAddress } = req.body;
    const ADMIN_EMAIL = "reeliocinema@gmail.com"; // <-- !!! CHANGE THIS TO YOUR REAL ADMIN EMAIL !!!
    
    if (!emailAddress) {
        return res.status(400).json({ message: "Email address is required." });
    }

    try {
        const mailOptions = {
            from: `"Reelio Contact Form" <${process.env.EMAIL_USER}>`, // Use your app email as sender
            to: ADMIN_EMAIL, // Send to your admin email
            subject: `NEW Contact Us / Newsletter Sign-up: ${emailAddress}`,
            html: `
                <p>A user has signed up for updates via the Contact Us form:</p>
                <p><strong>Email Address:</strong> ${emailAddress}</p>
                <p><em>Note: If this was a general contact form, you would parse other fields here.</em></p>
            `
        };

        let info = await transporter.sendMail(mailOptions);
        console.log(`Contact form submission emailed successfully to ${ADMIN_EMAIL}: ${info.messageId}`);
        res.status(200).json({ message: "Thank you for signing up!" });

    } catch (error) {
        console.error("Error sending contact form email:", error);
        res.status(500).json({ message: "Failed to send contact submission." });
    }
});
// --- End New Contact Form API Route ---


// ===============================================================
// 7. START SERVER
// ===============================================================
app.listen(PORT, () => {
    console.log(`✅ Backend Server is running on http://localhost:${PORT}`);
});

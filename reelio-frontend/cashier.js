// cashier.js - Handles the Cashier Terminal Interface

const SERVER_URL = 'http://localhost:3000';
const SEAT_PRICE = 350.00; // Assume same price as Buy Tickets page
const ROWS = ['A','B','C','D','E','F','G'];
const NUM_SEATS_PER_ROW = 10;
const CASHIER_NOTES_FIELD_ID = 'cashierNotes'; // Used to match server.js

let currentShowDetails = null;
let cashierSelectedSeats = [];
let cashierTotalPrice = 0;

// DOM Elements
const cashierMovieSelect = document.getElementById('cashierMovieSelect');
const cashierCinemaSelect = document.getElementById('cashierCinemaSelect');
const cashierDateSelect = document.getElementById('cashierDateSelect');
const cashierTimeSelect = document.getElementById('cashierTimeSelect');
const loadShowtimeBtn = document.getElementById('loadShowtimeBtn');
const seatSelectionSection = document.getElementById('seatSelectionSection');
const cashierSeatingChart = document.getElementById('cashierSeatingChart');
const cashierSelectedSeatsDisplay = document.getElementById('cashierSelectedSeatsDisplay');
const cashierTotalPriceDisplay = document.getElementById('cashierTotalPriceDisplay');
const btnFinalizeCashBooking = document.getElementById('btnFinalizeCashBooking');
const finalDetailsSection = document.getElementById('finalDetailsSection');
const cashierStatusMessage = document.getElementById('cashierStatusMessage');
const cashBookingForm = document.getElementById('cashBookingForm');


// --- HELPER: Update Cashier UI Summary ---
function updateCashierSummary() {
    cashierTotalPrice = cashierSelectedSeats.length * SEAT_PRICE;
    cashierSelectedSeatsDisplay.textContent = cashierSelectedSeats.length > 0 ? cashierSelectedSeats.sort().join(', ') : 'None';
    cashierTotalPriceDisplay.textContent = cashierTotalPrice.toFixed(2);
    btnFinalizeCashBooking.disabled = cashierSelectedSeats.length === 0;
    btnFinalizeCashBooking.style.opacity = cashierSelectedSeats.length === 0 ? '0.6' : '1';
}

// --- HELPER: Reset Cashier State ---
window.resetCashier = function() {
    currentShowDetails = null;
    cashierSelectedSeats = [];
    cashierTotalPrice = 0;
    updateCashierSummary();
    
    cashierDateSelect.value = '';
    cashierTimeSelect.value = '';
    cashierTimeSelect.disabled = true;
    loadShowtimeBtn.disabled = true;
    cashierStatusMessage.style.display = 'none';
    
    seatSelectionSection.style.display = 'none';
    finalDetailsSection.style.display = 'none';
    cashierSeatingChart.innerHTML = '<p style="color:#bbb;">Select a showtime above to load seats.</p>';

    // Re-enable show selection dropdowns if they were manually set
    cashierMovieSelect.value = '';
    cashierCinemaSelect.value = '';
}

// --- HELPER: Handle Seat Click ---
function handleCashierSeatClick(seatElement, seatId, isOccupied) {
    if (isOccupied) {
        alert(`Seat ${seatId} is already booked (Online or previously by another Cashier).`);
        return;
    }

    if (cashierSelectedSeats.includes(seatId)) {
        // Deselect
        seatElement.classList.remove('selected');
        cashierSelectedSeats = cashierSelectedSeats.filter(s => s !== seatId);
    } else {
        // Select
        if (cashierSelectedSeats.length >= 8) {
            alert("Maximum of 8 seats per transaction.");
            return;
        }
        seatElement.classList.add('selected');
        cashierSelectedSeats.push(seatId);
    }
    updateCashierSummary();
}

// --- STEP 1: Load Movies & Cinemas on Load ---
async function initializeCashier() {
    // Ensure auth is checked first (using the function from script.js)
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser.isAdmin) {
        document.body.innerHTML = `<div style="text-align:center; padding:100px;"><h2>Access Denied</h2><p>You must be logged in as an Admin to use the Cashier Terminal. <a href="index.html">Go Home</a></p></div>`;
        return;
    }
    
    // Set today's date as default for date picker
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // Months start at 0!
    const dd = String(today.getDate()).padStart(2, '0');
    cashierDateSelect.value = `${yyyy}-${mm}-${dd}`;
    
    try {
        // Fetch all movies to populate the movie dropdown
        const movieRes = await fetch(`${SERVER_URL}/api/admin/movies`);
        const movies = await movieRes.json();
        
        movies.forEach(movie => {
            const option = new Option(`${movie.title} [${movie.status}]`, JSON.stringify({ 
                id: movie.movie_id, 
                title: movie.title, 
                rating: movie.rating_duration,
                poster: movie.poster_url,
                status: movie.status
            }));
            cashierMovieSelect.add(option);
        });

        // Populate Cinema dropdown (using static list from admin.js for consistency, but in real life, this is dynamic)
        // NOTE: Since admin.js is loaded, we can access the list if it's global, but for safety, we'll use the known list.
        const CINEMAS = ["Cinema 1", "Cinema 2", "Cinema 3", "Cinema 4"]; // Use the list from admin.js
        CINEMAS.forEach(cinema => {
            cashierCinemaSelect.add(new Option(cinema, cinema));
        });

    } catch (error) {
        console.error("Error initializing cashier setup:", error);
        cashierStatusMessage.style.display = 'block';
        cashierStatusMessage.className = 'error-message';
        cashierStatusMessage.textContent = 'Error loading movies/cinemas. Check server.';
    }
}

// --- Event Listeners for Step 1 ---
cashierMovieSelect.addEventListener('change', populateShowtimeSelectors);
cashierCinemaSelect.addEventListener('change', populateShowtimeSelectors);
cashierDateSelect.addEventListener('change', populateShowtimeSelectors);

async function populateShowtimeSelectors() {
    // Reset subsequent selectors
    cashierTimeSelect.innerHTML = '<option value="">-- Select Time --</option>';
    cashierTimeSelect.disabled = true;
    loadShowtimeBtn.disabled = true;
    seatSelectionSection.style.display = 'none';
    finalDetailsSection.style.display = 'none';

    const selectedMovieData = cashierMovieSelect.value;
    const selectedCinema = cashierCinemaSelect.value;
    const selectedDate = cashierDateSelect.value;

    if (!selectedMovieData || !selectedCinema || !selectedDate) return;

    const movie = JSON.parse(selectedMovieData);
    
    // Check if the movie is 'now-showing' or 'coming-soon' (only allow booking for now-showing)
    if (movie.status !== 'now-showing') {
        cashierStatusMessage.style.display = 'block';
        cashierStatusMessage.className = 'warning-message';
        cashierStatusMessage.textContent = `Movie ${movie.title} is not currently 'Now Showing'. Cannot book seats.`;
        return;
    } else {
         cashierStatusMessage.style.display = 'none';
    }

    try {
        // Fetch all showtimes for this movie from the server
        const res = await fetch(`${SERVER_URL}/api/admin/showtimes/${movie.id}`);
        const allShowtimes = await res.json();

        const filteredTimes = allShowtimes
            .filter(st => st.show_date === selectedDate && st.location === selectedCinema)
            .map(st => st.show_time) // This is the 24hr format (e.g., "18:30:00")
            .sort();
            
        const uniqueTimes = [...new Set(filteredTimes)];

        if (uniqueTimes.length === 0) {
            cashierStatusMessage.style.display = 'block';
            cashierStatusMessage.className = 'warning-message';
            cashierStatusMessage.textContent = `No showtimes found for ${selectedCinema} on ${selectedDate}.`;
            return;
        }
        
        // Populate Time dropdown
        uniqueTimes.forEach(time24hr => {
            // Use the display_time if available, otherwise use a simple converter
            const matchingShowtime = allShowtimes.find(st => st.show_time === time24hr);
            const timeText = matchingShowtime && matchingShowtime.display_time ? matchingShowtime.display_time : convert24hrToAMPM(time24hr);
            cashierTimeSelect.add(new Option(timeText, time24hr)); // Store 24hr time as value
        });
        
        cashierTimeSelect.disabled = false;
        loadShowtimeBtn.disabled = true; // Wait for time selection
        
        // Store show details for the next step
        currentShowDetails = {
            movieId: movie.id,
            title: movie.title,
            poster: movie.poster,
            rating: movie.rating_duration,
            location: selectedCinema,
            date: selectedDate,
            time: null // Will be set on time selection
        };

    } catch (error) {
        console.error("Error populating showtime selectors:", error);
        cashierStatusMessage.style.display = 'block';
        cashierStatusMessage.className = 'error-message';
        cashierStatusMessage.textContent = 'Error loading showtimes.';
    }
}

// Attach listener to time selector to enable the Load button
cashierTimeSelect.addEventListener('change', () => {
    loadShowtimeBtn.disabled = !cashierTimeSelect.value;
});


// --- STEP 2: Load Seats ---
window.loadSeatingChart = async function() {
    if (!cashierTimeSelect.value) return;

    const selectedTime24hr = cashierTimeSelect.value;
    const selectedMovie = JSON.parse(cashierMovieSelect.value);

    // Update the stored details object
    currentShowDetails.time = selectedTime24hr;
    currentShowDetails.title = selectedMovie.title;
    currentShowDetails.poster = selectedMovie.poster;
    currentShowDetails.rating = selectedMovie.rating;
    currentShowDetails.movieId = selectedMovie.id;

    cashierStatusMessage.style.display = 'none';
    seatSelectionSection.style.display = 'block';
    finalDetailsSection.style.display = 'none';
    cashierSeatingChart.innerHTML = '<p style="color:#bbb;">Loading seat availability...</p>';
    
    try {
        const url = `${SERVER_URL}/api/cashier/seats/available?movieTitle=${encodeURIComponent(currentShowDetails.title)}&date=${encodeURIComponent(currentShowDetails.date)}&time=${encodeURIComponent(selectedTime24hr)}&location=${encodeURIComponent(currentShowDetails.location)}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.message || 'Failed to fetch seat status.');
        
        const occupiedSeats = new Set(data.occupiedSeats);
        cashierSelectedSeats = []; // Clear old selections
        
        cashierSeatingChart.innerHTML = '';
        ROWS.forEach(row => {
            for(let i=1; i<=NUM_SEATS_PER_ROW; i++){
                const seatId = `${row}${i}`;
                const seat = document.createElement('div');
                seat.classList.add('seat');
                seat.textContent = i;
                seat.dataset.seatId = seatId;

                if(occupiedSeats.has(seatId)){
                    seat.classList.add('occupied');
                } else {
                    seat.addEventListener('click', ()=>handleCashierSeatClick(seat, seatId, occupiedSeats.has(seatId)));
                }
                cashierSeatingChart.appendChild(seat);
            }
        });
        
        updateCashierSummary();
        finalDetailsSection.style.display = 'block';

    } catch (error) {
        console.error("Error loading cashier seats:", error);
        cashierSeatingChart.innerHTML = `<p style="color:red;">Error loading seats: ${error.message}</p>`;
        cashierStatusMessage.style.display = 'block';
        cashierStatusMessage.className = 'error-message';
        cashierStatusMessage.textContent = `Could not load seats. Server Error: ${error.message}`;
    }
}

// --- STEP 3: Finalize Booking ---
btnFinalizeCashBooking.addEventListener('click', () => {
    if (cashierSelectedSeats.length === 0) {
        alert('Please select seats first.');
        return;
    }
    // Scroll to the final details form
    document.getElementById('finalDetailsSection').scrollIntoView({ behavior: 'smooth' });
});

cashBookingForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!currentShowDetails || cashierSelectedSeats.length === 0) {
        alert("Missing show or seat selection. Please reload.");
        return;
    }

    const cashierEmail = document.getElementById('cashCustomerEmail').value;
    const paymentMethod = document.getElementById('cashPaymentMethod').value;
    const cashierNotes = document.getElementById(CASHIER_NOTES_FIELD_ID)?.value || null; // Get notes
    
    const finalData = {
        userId: cashierEmail, // Use customer email as primary user ID for receipts
        ...currentShowDetails,
        selectedSeats: cashierSelectedSeats,
        totalPrice: cashierTotalPrice.toFixed(2),
        paymentMethod: paymentMethod,
        cashierEmail: JSON.parse(localStorage.getItem('currentUser')).email, // The logged-in cashier's email
        cashierNotes: cashierNotes
    };

    cashierStatusMessage.className = 'loading-message';
    cashierStatusMessage.style.display = 'block';
    cashierStatusMessage.textContent = 'Processing booking on server... Do not refresh.';
    
    try {
        const response = await fetch(`${SERVER_URL}/api/cashier/book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalData)
        });
        const result = await response.json();

        if (response.ok) {
            cashierStatusMessage.className = 'success-message';
            cashierStatusMessage.innerHTML = `
                <h3>SUCCESS! Booking ID ${result.bookingId} Created.</h3>
                <p>Seats ${cashierSelectedSeats.join(', ')} for ${currentShowDetails.title} are now reserved.</p>
                <p>A receipt was sent to: ${cashierEmail}</p>
                <button class="btn-primary" onclick="window.location.href='cashier.html'">New Transaction</button>
            `;
            // Do NOT reset state automatically, allow cashier to see success and click New Transaction
        } else {
            throw new Error(result.message || 'Server failed to save booking.');
        }

    } catch (error) {
        console.error("Cashier Booking Error:", error);
        cashierStatusMessage.className = 'error-message';
        cashierStatusMessage.textContent = `FAILED: ${error.message}`;
    }
});

// --- Log Out (Uses function from script.js) ---
window.handleLogoutCashier = function() {
    handleLogout(); // Call the global logout function from script.js
    window.location.href = 'index.html';
}


// --- Initial Kickoff ---
document.addEventListener('DOMContentLoaded', function() {
    initializeCashier();
});

// --- Re-using AM/PM conversion from buy-tickets.html logic ---
function convert24hrToAMPM(time24hr) {
    const [hoursStr, minutesStr] = time24hr.split(':');
    const h = parseInt(hoursStr, 10);
    const m = minutesStr ? minutesStr.substring(0, 2) : '00'; 
    const period = h >= 12 ? 'PM' : 'AM';
    const hours12hr = h % 12 === 0 ? 12 : h % 12;
    return `${hours12hr}:${m} ${period}`;
}

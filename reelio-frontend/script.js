/***********************
 * LOGIN / SIGNUP MODALS
 ***********************/

// Function to open the login modal
function openLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
}

// Function to close the login modal
function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
}

// Function to open the signup modal
function openSignUpModal() {
    document.getElementById('signUpModal').style.display = 'block';
}

// Function to close the signup modal
function closeSignUpModal() {
    document.getElementById('signUpModal').style.display = 'none';
}

// Global click listener for closing modals when clicking outside
window.addEventListener('click', function(event) {
    const loginModal = document.getElementById('loginModal');
    const signUpModal = document.getElementById('signUpModal');

    if (loginModal && event.target === loginModal) {
        loginModal.style.display = 'none';
    }
    if (signUpModal && event.target === signUpModal) {
        signUpModal.style.display = 'none';
    }
});

/***********************
 * USER AUTHENTICATION (CONNECTED TO SERVER)
 ***********************/

// Elements from the header
const authActionsDiv = document.getElementById('authActions');
const userProfileDisplayDiv = document.getElementById('userProfileDisplay');
const loggedInUsernameSpan = document.getElementById('loggedInUsername');
const myBookingsNavLink = document.getElementById('myBookingsNavLink');
const adminNavLink = document.getElementById('adminNavLink');

const SERVER_URL = 'http://localhost:3000'; // Define server URL once

// Function to update the header based on login status
function updateHeaderUI(user) {
    if (user) {
        authActionsDiv.style.display = 'none';
        userProfileDisplayDiv.style.display = 'flex';
        loggedInUsernameSpan.textContent = user.firstName || user.email;
        myBookingsNavLink.style.display = 'list-item';

        if (user.isAdmin) {
            adminNavLink.style.display = 'list-item';
        } else {
            adminNavLink.style.display = 'none';
        }

    } else {
        authActionsDiv.style.display = 'block';
        userProfileDisplayDiv.style.display = 'none';
        loggedInUsernameSpan.textContent = '';
        myBookingsNavLink.style.display = 'none';
        adminNavLink.style.display = 'none';
    }
}

// Handle Login Form Submission
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            try {
                const response = await fetch(`${SERVER_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('currentUser', JSON.stringify(data.user));
                    if (authActionsDiv) updateHeaderUI(data.user);
                    closeLoginModal();
                    alert('Login successful!');
                } else {
                    alert(`Login failed: ${data.message || 'Check server logs'}`);
                }
            } catch (error) {
                console.error("Login Fetch Error:", error);
                alert('Could not connect to the login server.');
            }
            loginForm.reset();
        });
    }

    // Handle Sign Up Form Submission
    const signUpForm = document.getElementById('signUpForm');
    if (signUpForm) {
        signUpForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const firstName = document.getElementById('first-name').value;
            const lastName = document.getElementById('last-name').value;

            if (password !== confirmPassword) {
                alert('Passwords do not match!');
                return;
            }

            try {
                const response = await fetch(`${SERVER_URL}/api/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, firstName, lastName })
                });
                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('currentUser', JSON.stringify(data.user));
                    if (authActionsDiv) updateHeaderUI(data.user);
                    closeSignUpModal();
                    alert(`Welcome, ${firstName}! Your account has been created and you are now logged in.`);
                } else {
                    alert(`Registration failed: ${data.message || 'Check server logs'}`);
                }
            } catch (error) {
                console.error("Registration Fetch Error:", error);
                alert('Could not connect to the registration server.');
            }
            
            signUpForm.reset();
        });
    }

    // ===========================================================
    // *** NEW: ADMIN MOVIE FORM SUBMISSION HANDLER ***
    // ===========================================================
    const addMovieForm = document.getElementById('addMovieForm');
    if (addMovieForm) {
        addMovieForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            // Collect data from the Add Movie Form fields
            const movieData = {
                title: document.getElementById('movieTitle').value,
                overview: document.getElementById('movieOverview').value,
                rating_duration: document.getElementById('movieRating').value,
                poster_url: document.getElementById('moviePoster').value,
                status: document.getElementById('movieStatus').value,
                release_date: document.getElementById('movieReleaseDate').value,
                trailer_url: document.getElementById('movieTrailerUrl').value
            };

            try {
                const response = await fetch(`${SERVER_URL}/api/admin/movie`, { // <<< Calling the server POST route
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(movieData)
                });
                const result = await response.json();

                if (response.ok) {
                    alert(`Success! Movie added with ID: ${result.movieId}`);
                    addMovieForm.reset();
                } else {
                    alert(`Movie addition failed: ${result.message || 'Unknown Server Error'}`);
                }
            } catch (error) {
                console.error("Admin Movie Add Fetch Error:", error);
                alert('Could not connect to the admin server.');
            }
        });
    }
    // ===========================================================


    // Handle Logout
    window.handleLogout = function() {
        localStorage.removeItem('currentUser');
        if (authActionsDiv) updateHeaderUI(null);
        alert('You have been logged out.');
        if (location.pathname.includes('my-bookings.html') || location.pathname.includes('admin.html')) {
            window.location.href = 'index.html';
        }
    };

    // Check login status on page load (important for persistence)
    const storedUser = JSON.parse(localStorage.getItem('currentUser'));
    if (authActionsDiv) updateHeaderUI(storedUser);
});

/***********************
 * HERO SLIDE
 ***********************/
let currentSlide = 0;
const slides = document.querySelectorAll('.hero-slide');
if (slides.length > 1) {
    setInterval(() => {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }, 5000);
}

/***********************
 * NOW SHOWING / COMING SOON LISTS (Index Page)
 ***********************/
function renderMovies(movies, listSelector, detailPageLink, movieType) {
    const movieListContainer = document.querySelector(listSelector);
    if (!movieListContainer) return;

    movieListContainer.innerHTML = '';

    movies.forEach(movieData => {
        const movieDataset = {
            title: movieData.title,
            overview: movieData.overview,
            rating: movieData.rating_duration,
            poster: movieData.poster_url,
            releaseDate: movieData.release_date,
            trailer: movieData.trailer_url
        };
        
        const movieLink = document.createElement('a');
        movieLink.href = movieType === 'now-showing' ? 'now-showing-details.html' : 'coming-soon-details.html';
        movieLink.classList.add('movie-link');
        movieLink.classList.add(movieType === 'now-showing' ? 'now-showing-movie' : 'coming-soon-movie');
        
        Object.keys(movieDataset).forEach(key => {
            movieLink.dataset[key] = movieDataset[key];
        });

        movieLink.innerHTML = `
            <div class="movie-card">
                <img src="${movieDataset.poster}" alt="${movieDataset.title} Poster">
                <p>${movieDataset.title}</p>
            </div>
        `;
        
        movieLink.onclick = e => {
            e.preventDefault();
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            if (!currentUser && movieType === 'now-showing') {
                alert('Please sign in to view movie details and book tickets.');
                openLoginModal();
                return;
            }
            localStorage.setItem('nowShowingMovie', JSON.stringify(movieDataset));
            localStorage.setItem('comingSoonMovie', JSON.stringify(movieDataset));
            location.href = movieLink.href;
        };

        movieListContainer.appendChild(movieLink);
    });
}


async function loadMovies() {
    try {
        const nowShowingRes = await fetch(`${SERVER_URL}/api/movies?status=now-showing`);
        const nowShowingData = await nowShowingRes.json();
        renderMovies(nowShowingData, '.now-showing .movie-list', 'now-showing-movie', 'now-showing');

        const comingSoonRes = await fetch(`${SERVER_URL}/api/movies?status=coming-soon`);
        const comingSoonData = await comingSoonRes.json();
        renderMovies(comingSoonData, '.coming-soon .movie-list', 'coming-soon-movie', 'coming-soon');
        
    } catch (error) {
        console.error("Failed to load movies from server:", error);
    }
}


if (location.pathname.includes('index.html') || location.pathname === '/') {
    loadMovies(); 
    
    // Scroll button logic
    document.querySelectorAll('.scroll-btn').forEach(button => {
        button.addEventListener('click', () => {
            const movieList = button.closest('section').querySelector('.movie-list');
            const scrollAmount = 300;
            if (button.classList.contains('left')) {
                movieList.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            } else {
                movieList.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            }
        });
    });
}

/***********************
 * MOVIE DETAILS PAGES
 ***********************/
if (location.pathname.includes('now-showing-details.html')) {
    const movie = JSON.parse(localStorage.getItem('nowShowingMovie'));
    if (movie) {
        const posterEl = document.getElementById('movieDetailPoster');
        const titleEl = document.getElementById('movieDetailTitle');
        const ratingEl = document.getElementById('movieDetailRatingDuration');
        const overviewEl = document.getElementById('movieDetailOverview');

        if (posterEl) posterEl.src = movie.poster;
        if (titleEl) titleEl.textContent = movie.title;
        if (ratingEl) ratingEl.textContent = movie.rating;
        if (overviewEl) overviewEl.textContent = movie.overview;
    } else {
        document.querySelector('.movie-details-page').innerHTML = `<div style="text-align:center; padding:50px; margin-top: 100px;"><h2>No Movie Selected</h2><p>Please go back to the <a href="index.html">Now Showing</a> page to select a movie.</p></div>`;
    }
}

if (location.pathname.includes('coming-soon-details.html')) {
    const movie = JSON.parse(localStorage.getItem('comingSoonMovie'));
    if (movie) {
        const posterEl = document.getElementById('movieDetailPoster');
        const titleEl = document.getElementById('movieDetailTitle');
        const ratingEl = document.getElementById('movieDetailRatingDuration');
        const overviewEl = document.getElementById('movieDetailOverview');
        const releaseEl = document.getElementById('movieDetailReleaseDate');
        const trailerEl = document.getElementById('movieDetailTrailer'); 

        if (posterEl) posterEl.src = movie.poster;
        if (titleEl) titleEl.textContent = movie.title;
        if (ratingEl) ratingEl.textContent = movie.rating;
        if (overviewEl) overviewEl.textContent = movie.overview;
        if (releaseEl) releaseEl.textContent = movie.releaseDate || 'N/A';
        if (trailerEl && movie.trailer) trailerEl.src = movie.trailer;
    } else {
        document.querySelector('.movie-details-page').innerHTML = `<div style="text-align:center; padding:50px; margin-top: 100px;"><h2>No Coming Soon Movie Selected</h2><p>Please go back to the <a href="index.html">Coming Soon</a> page to select a movie.</p></div>`;
    }
}


/***********************
 * BUY TICKETS PAGE
 ***********************/
if (location.pathname.includes('buy-tickets.html')) {
    const selectedBooking = JSON.parse(localStorage.getItem('selectedBooking'));
    
    const summaryPosterEl = document.getElementById('summaryPoster');
    const summaryMovieTitleEl = document.getElementById('summaryMovieTitle');
    const summaryLocationEl = document.getElementById('summaryLocation');
    const summaryDateEl = document.getElementById('summaryDate');
    const summaryTimeEl = document.getElementById('summaryTime');
    const summaryRatingEl = document.getElementById('summaryRating');

    if (selectedBooking) {
        if (summaryPosterEl) summaryPosterEl.src = selectedBooking.poster;
        if (summaryPosterEl) summaryPosterEl.alt = selectedBooking.title + " Poster";
        if (summaryMovieTitleEl) summaryMovieTitleEl.textContent = selectedBooking.title;
        if (summaryLocationEl) summaryLocationEl.textContent = selectedBooking.location;
        if (summaryDateEl) summaryDateEl.textContent = selectedBooking.date;
        if (summaryTimeEl) summaryTimeEl.textContent = selectedBooking.time;
        if (summaryRatingEl) summaryRatingEl.textContent = selectedBooking.rating;
        
        const seatingChart = document.getElementById('seatingChart');
        const rows = ['A','B','C','D','E','F','G'];
        const numSeatsPerRow = 10;
        const seatPrice = 350.00;

        let selectedSeats = [];
        let totalPrice = 0;

        const selectedSeatsDisplay = document.getElementById('selectedSeatsDisplay');
        const totalPriceDisplay = document.getElementById('totalPriceDisplay');
        const btnProceedToPayment = document.getElementById('btnProceedToPayment');

        function updateBookingSummary() {
            selectedSeatsDisplay.textContent = selectedSeats.length > 0 ? selectedSeats.sort().join(', ') : 'None';
            totalPriceDisplay.textContent = totalPrice.toFixed(2);
            btnProceedToPayment.disabled = selectedSeats.length === 0;
        }

        const occupiedSeats = ['A3','A4','B5','C1','C2','D8','D9','G10'];

        rows.forEach(row => {
            for (let i=1; i<=numSeatsPerRow; i++){
                const seatId = `${row}${i}`;
                const seat = document.createElement('div');
                seat.classList.add('seat');
                seat.textContent = i;
                seat.dataset.seatId = seatId;

                if (occupiedSeats.includes(seatId)) {
                    seat.classList.add('occupied');
                } else {
                    seat.addEventListener('click', () => {
                        if(seat.classList.contains('selected')){
                            seat.classList.remove('selected');
                            selectedSeats = selectedSeats.filter(s => s !== seatId);
                            totalPrice -= seatPrice;
                        } else {
                            seat.classList.add('selected');
                            selectedSeats.push(seatId);
                            totalPrice += seatPrice;
                        }
                        updateBookingSummary();
                    });
                }
                seatingChart.appendChild(seat);
            }
        });

        updateBookingSummary();

        btnProceedToPayment.addEventListener('click', () => {
            if (selectedSeats.length > 0) {
                const currentUser = JSON.parse(localStorage.getItem('currentUser'));
                
                // *** FIX: Ensure userId is set, or stop execution ***
                if (!currentUser) {
                    alert('Please sign in to proceed with payment.');
                    openLoginModal();
                    return; // <<< THIS STOPS THE FLOW if not logged in
                }

                const finalBooking = {
                    ...selectedBooking, 
                    selectedSeats: selectedSeats,
                    totalPrice: totalPrice,
                    userId: currentUser.email // <<< GUARANTEED to have the email if we passed the check above
                };
                localStorage.setItem('finalBooking', JSON.stringify(finalBooking));
                window.location.href = 'payment.html';
            } else {
                alert('Please select at least one seat.');
            }
        });

    } else {
        document.querySelector('.buy-tickets-page').innerHTML = `<div style="text-align:center; padding:50px; margin-top: 100px;"><h2>No Movie Selected</h2><p>Please go back to the <a href="index.html">Now Showing</a> page to select a movie.</p></div>`;
    }
}

/***********************
 * PAYMENT PAGE
 ***********************/
if (location.pathname.includes('payment.html')) {
    const finalBooking = JSON.parse(localStorage.getItem('finalBooking'));

    if (finalBooking) {
        // Populate booking summary details
        document.getElementById('paymentMoviePoster').src = finalBooking.poster;
        document.getElementById('paymentMoviePoster').alt = finalBooking.title + " Poster";
        document.getElementById('paymentMovieTitle').textContent = finalBooking.title;
        document.getElementById('paymentLocation').textContent = finalBooking.location;
        document.getElementById('paymentDate').textContent = finalBooking.date;
        document.getElementById('paymentTime').textContent = finalBooking.time;
        document.getElementById('paymentSelectedSeats').textContent = finalBooking.selectedSeats.join(', ');
        document.getElementById('paymentTotalAmount').textContent = `₱${parseFloat(finalBooking.totalPrice).toFixed(2)}`;

        // Payment method selection logic
        const paymentOptionBtns = document.querySelectorAll('.payment-option-btn');
        const cardPaymentForm = document.getElementById('cardPaymentForm');
        const gcashPaymentForm = document.getElementById('gcashPaymentForm');
        let currentPaymentMethod = 'card';

        paymentOptionBtns.forEach(button => {
            button.addEventListener('click', () => {
                paymentOptionBtns.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                currentPaymentMethod = button.dataset.paymentMethod;

                if (currentPaymentMethod === 'card') {
                    cardPaymentForm.style.display = 'block';
                    gcashPaymentForm.style.display = 'none';
                } else if (currentPaymentMethod === 'gcash') {
                    cardPaymentForm.style.display = 'none';
                    gcashPaymentForm.style.display = 'block';
                }
            });
        });

        // Handle Card Payment Form Submission
        cardPaymentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            processPayment(finalBooking, 'Card');
        });

        // Handle GCash Payment Form Submission
        gcashPaymentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            processPayment(finalBooking, 'GCash');
        });

    } else {
        document.querySelector('.payment-page main').innerHTML = `<div style="text-align:center; padding:50px; margin-top: 100px;"><h2>No Booking Information</h2><p>Please go back to the <a href="index.html">Now Showing</a> page to start a new booking.</p></div>`;
    }
}

// Function to process payment and save to DB
async function processPayment(bookingDetails, paymentMethod) {
    const SERVER_URL = 'http://localhost:3000';

    // *** GET THE USER EMAIL DIRECTLY FROM LOCAL STORAGE ***
    // This ensures we have *some* ID, even if it's a guest ID, preventing the 400 error.
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const userEmail = currentUser ? currentUser.email : 'guest_booking_' + Date.now(); // *** FALLBACK USER ***

    // Prepare the data package for the server
    const bookingDataForServer = {
        userId: userEmail, // <<< CORRECTED: Use the retrieved/fallback email as userId
        title: bookingDetails.title,
        location: bookingDetails.location,
        date: bookingDetails.date,
        time: bookingDetails.time,
        selectedSeats: bookingDetails.selectedSeats,
        totalPrice: bookingDetails.totalPrice,
        paymentMethod: paymentMethod
    };
    
    try {
        const response = await fetch(`${SERVER_URL}/api/booking`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bookingDataForServer),
        });

        const result = await response.json();

        if (response.ok) {
            // SUCCESS: Server saved the booking and returned an ID
            const successfulBooking = {
                ...bookingDetails,
                paymentMethod: paymentMethod,
                bookingId: result.bookingId
            };
            
            localStorage.setItem('lastSuccessfulBooking', JSON.stringify(successfulBooking));

            // For "View My Bookings" feature: save this booking to the user's history (local simulation)
            let userBookings = JSON.parse(localStorage.getItem(`bookings_${userEmail}`)) || [];
            userBookings.push(successfulBooking);
            localStorage.setItem(`bookings_${userEmail}`, JSON.stringify(userBookings));
            
            localStorage.removeItem('selectedBooking');
            localStorage.removeItem('finalBooking');

            window.location.href = 'payment-success.html';

        } else {
            // FAILED: Server returned an error
            alert(`Booking failed on server side: ${result.message || 'Unknown Server Error'}`);
        }

    } catch (error) {
        console.error("Error submitting booking:", error);
        alert('Could not connect to the booking server. Please check the console and ensure the server is running.');
    }
}

/***********************
 * PAYMENT SUCCESSFUL PAGE
 ***********************/
if (location.pathname.includes('payment-success.html')) {
    document.addEventListener('DOMContentLoaded', function() {
        const storedBookingDetails = localStorage.getItem('lastSuccessfulBooking');

        if (storedBookingDetails) {
            const booking = JSON.parse(storedBookingDetails);

            document.getElementById('successMovieTitle').textContent = booking.title;
            document.getElementById('successLocation').textContent = booking.location;
            document.getElementById('successDateTime').textContent = `${booking.date} - ${booking.time}`;
            document.getElementById('successSelectedSeats').textContent = booking.selectedSeats.join(', ');
            const totalPaid = parseFloat(booking.totalPrice);
            document.getElementById('successTotalAmount').textContent = `₱${isNaN(totalPaid) ? '0.00' : totalPaid.toFixed(2)}`;
            
            const bookingIdEl = document.getElementById('successBookingId');
            if (bookingIdEl && booking.bookingId) {
                bookingIdEl.textContent = booking.booking_id || booking.bookingId;
                const bookingIdRow = bookingIdEl.closest('.summary-item');
                if (bookingIdRow) bookingIdRow.style.display = 'flex';
            }

            const paymentMethodEl = document.getElementById('successPaymentMethod');
            if (paymentMethodEl && booking.paymentMethod) {
                paymentMethodEl.textContent = booking.paymentMethod;
                const paymentMethodRow = paymentMethodEl.closest('.summary-item');
                if (paymentMethodRow) paymentMethodRow.style.display = 'flex';
            }
        } else {
            console.warn('No successful booking details found in localStorage for the success page. Redirecting to home.');
            document.querySelector('.success-card').innerHTML = `<h2>No Booking Information Found</h2><p>It seems there was an issue retrieving your booking details. Please <a href="index.html">return to the home page</a> to start a new booking.</p><button class="btn-go-home" onclick="location.href='index.html'">Return to Home</button>`;
        }
    });

    const viewBookingsBtn = document.querySelector('.btn-view-bookings');
    if (viewBookingsBtn) {
        viewBookingsBtn.addEventListener('click', function() {
            window.location.href = 'my-bookings.html';
        });
    }
}

/***********************
 * MY BOOKINGS PAGE (NEW)
 ***********************/
if (location.pathname.includes('my-bookings.html')) {
    document.addEventListener('DOMContentLoaded', async function() {
        const bookingsListDiv = document.getElementById('bookingsList');
        const noBookingsMessage = document.getElementById('noBookingsMessage');
        const loginPromptMessage = document.getElementById('loginPromptMessage');
        
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));

        if (!currentUser) {
            loginPromptMessage.style.display = 'block';
            bookingsListDiv.innerHTML = '';
            return;
        }
        
        try {
            // *** NEW: Fetch bookings from the server ***
            const response = await fetch(`${SERVER_URL}/api/bookings/${currentUser.email}`);
            const userBookings = await response.json();

            if (userBookings.length === 0) {
                noBookingsMessage.style.display = 'block';
            } else {
                noBookingsMessage.style.display = 'none';
                userBookings.forEach(booking => {
                    const bookingCard = document.createElement('div');
                    bookingCard.classList.add('booking-card');
                    bookingCard.innerHTML = `
                        <img src="${booking.poster_url || 'logo.png'}" alt="${booking.movie_title} Poster">
                        <div class="booking-info">
                            <h3>${booking.movie_title}</h3>
                            <p><strong>Booking ID:</strong> ${booking.booking_id}</p> 
                            <p><strong>Location:</strong> ${booking.location}</p>
                            <p><strong>Date & Time:</strong> ${booking.date_time}</p>
                            <p><strong>Seats:</strong> ${booking.seats}</p>
                            <p><strong>Payment:</strong> ${booking.payment_method}</p>
                            <p class="total-price"><strong>Total:</strong> ₱${parseFloat(booking.total_price).toFixed(2)}</p>
                        </div>
                    `;
                    bookingsListDiv.appendChild(bookingCard);
                });
            }
        } catch (error) {
            console.error("Error fetching user bookings from server:", error);
            noBookingsMessage.style.display = 'block';
            noBookingsMessage.innerHTML = `<p>Error loading bookings. Server may be down or email not found.</p><a href="index.html" class="btn-go-home" style="text-decoration: none;">Browse Movies</a>`;
        }
    });
}


// ===============================================================
// --- TEST CONNECTION (Keep this for initial server test) ---
// ===============================================================

if (location.pathname.includes('index.html') || location.pathname === '/') {
    
    async function testDatabaseConnection() {
        console.log("Attempting to connect to backend server...");
        try {
            const response = await fetch(`${SERVER_URL}/api/test`);
            
            if (!response.ok) {
                throw new Error(`Server returned status: ${response.status}`);
            }
            
            const data = await response.json();
            
            console.log("✅ SUCCESS: Backend connected to Database!");
            console.log("Server Message:", data.message);
            console.log("Data Retrieved:", data.data);

            const header = document.querySelector('.main-header');
            if (header) {
                const testDiv = document.createElement('div');
                testDiv.innerHTML = `<p style="color:#ffcc00; text-align:center; padding: 5px 0; margin: 0;">DB Status: CONNECTED</p>`;
                header.insertAdjacentElement('afterend', testDiv);
            }


        } catch (error) {
            console.error("❌ FAILED: Could not connect to backend server or DB.", error);
             const header = document.querySelector('.main-header');
             if (header) {
                const testDiv = document.createElement('div');
                testDiv.innerHTML = `<p style="color:#d9534f; text-align:center; padding: 5px 0; margin: 0;">DB Status: CONNECTION FAILED (Is server running on port 3000?)</p>`;
                header.insertAdjacentElement('afterend', testDiv);
            }
        }
    }

    testDatabaseConnection();
    
    // Scroll button logic
    document.querySelectorAll('.scroll-btn').forEach(button => {
        button.addEventListener('click', () => {
            const movieList = button.closest('section').querySelector('.movie-list');
            const scrollAmount = 300;
            if (button.classList.contains('left')) {
                movieList.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            } else {
                movieList.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            }
        });
    });
}
// ===============================================================```

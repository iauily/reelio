// script.js (Complete Version with Global Theme Logic)

/***********************
 * LOGIN / SIGNUP MODALS
 ***********************/

function openLoginModal() { document.getElementById('loginModal').style.display = 'block'; }
function closeLoginModal() { document.getElementById('loginModal').style.display = 'none'; }
function openSignUpModal() { document.getElementById('signUpModal').style.display = 'block'; }
function closeSignUpModal() { document.getElementById('signUpModal').style.display = 'none'; }

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
 * THEME MANAGEMENT (Global Logic)
 ***********************/

function applyTheme(theme) {
    const body = document.body;
    if (theme === 'light') {
        body.classList.add('light-mode');
    } else {
        body.classList.remove('light-mode');
    }
}

async function loadThemePreference() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    let theme = 'dark'; // Default

    if (currentUser && currentUser.email) {
        // Try to fetch from server first (best practice)
        try {
            const response = await fetch(`http://localhost:3000/api/user/theme/${currentUser.email}`);
            if (response.ok) {
                const data = await response.json();
                theme = data.theme || 'dark';
            }
        } catch (error) {
            console.warn("Could not fetch theme preference from server. Falling back to local storage.");
        }
    }
    
    // Fallback to local storage if server fetch failed or user is not logged in
    if (!theme || theme === 'dark') {
        theme = localStorage.getItem('theme') || 'dark';
    }

    applyTheme(theme);
}


/***********************
 * USER AUTHENTICATION & HEADER UI
 ***********************/

const authActionsDiv = document.getElementById('authActions');
const userProfileDisplayDiv = document.getElementById('userProfileDisplay');
const loggedInUsernameSpan = document.getElementById('loggedInUsername');
const myBookingsNavLink = document.getElementById('myBookingsNavLink');
const adminNavLink = document.getElementById('adminNavLink');

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

window.handleLogout = function() {
    localStorage.removeItem('currentUser');
    if (authActionsDiv) updateHeaderUI(null);
    alert('You have been logged out.');
    if (location.pathname.includes('my-bookings.html') || location.pathname.includes('admin.html')) {
        window.location.href = 'index.html';
    }
};


document.addEventListener('DOMContentLoaded', () => {
    // --- RUN THEME LOAD ---
    loadThemePreference(); 

    // Handle Login Form Submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const SERVER_URL = 'http://localhost:3000';

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
                    // Apply theme from server response data immediately
                    applyTheme(data.user.theme || 'dark');
                    window.location.reload(); 
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
            const SERVER_URL = 'http://localhost:3000';

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
                    // *** NEW: Apply theme immediately on signup ***
                    applyTheme(data.user.theme || 'dark');
                    window.location.reload(); 
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
    
    // Check login status on page load
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
function renderMovies(movies, listSelector, movieType) {
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
            trailer: movieData.trailer_url,
            movieId: movieData.movie_id
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
    const SERVER_URL = 'http://localhost:3000';
    try {
        const nowShowingRes = await fetch(`${SERVER_URL}/api/movies?status=now-showing`);
        const nowShowingData = await nowShowingRes.json();
        renderMovies(nowShowingData, '.now-showing .movie-list', 'now-showing');

        const comingSoonRes = await fetch(`${SERVER_URL}/api/movies?status=coming-soon`);
        const comingSoonData = await comingSoonRes.json();
        renderMovies(comingSoonData, '.coming-soon .movie-list', 'coming-soon');
        
    } catch (error) {
        console.error("Failed to load movies from server:", error);
    }
}


if (location.pathname.includes('index.html') || location.pathname === '/') {
    loadMovies(); 
    
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
 * HERO SLIDESHOW TRAILER FUNCTIONALITY
 ***********************/

function playTrailer(buttonElement) {
    const slide = buttonElement.closest('.hero-slide');
    
    if (slide) {
        const trailerUrl = slide.dataset.trailerUrl;

        if (trailerUrl) {
            window.open(trailerUrl, '_blank'); 
        } else {
            console.warn("Trailer URL not found for this slide.");
            alert("Sorry, the trailer link is not yet configured for this slide.");
        }
    }
}

/***********************
 * MOVIE DETAILS PAGES (Now Showing & Coming Soon)
 ***********************/
if (location.pathname.includes('now-showing-details.html')) {
    const movie = JSON.parse(localStorage.getItem('nowShowingMovie'));
    if (movie) {
        document.getElementById('detailsPageMovieTitle').textContent = movie.title;
        document.getElementById('movieDetailPoster').src = movie.poster;
        document.getElementById('movieDetailPoster').alt = movie.title + " Movie Poster";
        document.getElementById('movieDetailTitle').textContent = movie.title;
        document.getElementById('movieDetailRatingDuration').textContent = movie.rating;
        document.getElementById('movieDetailOverview').textContent = movie.overview;
        document.title = movie.title + " | Reelio";
        
        const buyButton = document.getElementById('buyNowButton');
        buyButton.addEventListener('click', () => {
            const selectedTime = timeSelect.value;
            const selectedDate = dateSelect.value;
            const selectedLocation = locationSelect.value;
            
            if (!selectedTime || !selectedDate || !selectedLocation) {
                alert('Please select a Cinema, Date, and Time before proceeding.');
                return;
            }

            const bookingDetails = {
                title: movie.title,
                poster: movie.poster,
                rating: movie.rating,
                location: selectedLocation, 
                date: selectedDate,
                time: selectedTime // <-- THIS IS THE 24HR VALUE (e.g., "18:30:00")
            };
            localStorage.setItem('selectedBooking', JSON.stringify(bookingDetails));
            window.location.href = "buy-tickets.html";
        });
        
    } else {
        document.querySelector('.movie-details-page').innerHTML = `<div style="text-align:center; padding:50px; margin-top: 100px;"><h2>No Movie Selected</h2><p>Please go back to the <a href="index.html">Now Showing</a> page to select a movie.</p></div>`;
    }
}

if (location.pathname.includes('coming-soon-details.html')) {
    const movie = JSON.parse(localStorage.getItem('comingSoonMovie'));
    if (movie) {
        document.getElementById('detailsPageMovieTitle').textContent = movie.title;
        document.getElementById('movieDetailPoster').src = movie.poster;
        document.getElementById('movieDetailPoster').alt = movie.title + " Poster";
        document.getElementById('movieDetailTitle').textContent = movie.title;
        document.getElementById('movieDetailRatingDuration').textContent = movie.rating;
        document.getElementById('movieDetailOverview').textContent = movie.overview;
        document.getElementById('movieDetailReleaseDate').textContent = movie.releaseDate || 'Release date not set';
        
        const trailerEl = document.getElementById('movieDetailTrailer');
        if (trailerEl && movie.trailer) {
             trailerEl.src = movie.trailer;
        } else if (trailerEl) {
             trailerEl.parentElement.innerHTML = `<p style="color:#bbb;">Trailer not available.</p>`;
        }
        document.title = movie.title + " | Reelio";
    } else {
        document.querySelector('.movie-details-page').innerHTML = `<div style="text-align:center; padding:50px; margin-top: 100px;"><h2>No Coming Soon Movie Selected</h2><p>Please go back to the <a href="index.html">Coming Soon</a> page to select a movie.</p></div>`;
    }
}


/***********************
 * BUY TICKETS PAGE (FIXED: Dynamic Seat Loading & Time Display)
 ***********************/
if (location.pathname.includes('buy-tickets.html')) {
    const SERVER_URL = 'http://localhost:3000';
    const selectedBooking = JSON.parse(localStorage.getItem('selectedBooking'));
    
    // ... (DOM element lookups) ...
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
        
        // *** FIX 2: AM/PM Conversion for Display ***
        function convert24hrToAMPM(time24hr) {
            const [hoursStr, minutesStr] = time24hr.split(':');
            const h = parseInt(hoursStr, 10);
            const m = minutesStr ? minutesStr.substring(0, 2) : '00'; 
            const period = h >= 12 ? 'PM' : 'AM';
            const hours12hr = h % 12 === 0 ? 12 : h % 12;
            return `${hours12hr}:${m} ${period}`;
        }
        
        if (selectedBooking.time && selectedBooking.time.includes(':')) {
            document.getElementById('summaryTime').textContent = convert24hrToAMPM(selectedBooking.time);
        } else {
            document.getElementById('summaryTime').textContent = selectedBooking.time;
        }

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
            const seatPrice = 350.00;
            let totalPrice = selectedSeats.length * seatPrice; 

            selectedSeatsDisplay.textContent = selectedSeats.length > 0 ? selectedSeats.sort().join(', ') : 'None';
            totalPriceDisplay.textContent = totalPrice.toFixed(2);
            btnProceedToPayment.disabled = selectedSeats.length === 0;
        }

        async function loadOccupiedSeats() {
            seatingChart.innerHTML = '<p style="color:#bbb;">Loading seats...</p>';
            try {
                const url = `${SERVER_URL}/api/seats/occupied?movieTitle=${encodeURIComponent(selectedBooking.title)}&date=${encodeURIComponent(selectedBooking.date)}&time=${encodeURIComponent(selectedBooking.time)}&location=${encodeURIComponent(selectedBooking.location)}`;
                
                const response = await fetch(url);
                const data = await response.json();
                
                let occupiedSeats = [];
                if (response.ok && data.occupiedSeats) {
                    occupiedSeats = data.occupiedSeats; 
                } else {
                    console.warn("Could not retrieve occupied seats from server. Using simulation as fallback.");
                    occupiedSeats = ['A3','A4','B5','C1','C2','D8','D9','G10']; 
                }

                // --- Build the Seating Chart Grid ---
                seatingChart.innerHTML = ''; 
                rows.forEach(row => {
                    for(let i=1; i<=numSeatsPerRow; i++){
                        const seatId = `${row}${i}`;
                        const seat = document.createElement('div');
                        seat.classList.add('seat');
                        seat.textContent = i;
                        seat.dataset.seatId = seatId;

                        if(occupiedSeats.includes(seatId)){
                            seat.classList.add('occupied');
                        } else {
                            seat.addEventListener('click', ()=>{
                                if(seat.classList.contains('selected')){
                                    seat.classList.remove('selected');
                                    selectedSeats = selectedSeats.filter(s=>s!==seatId); 
                                    totalPrice -= seatPrice;
                                } else {
                                    if (selectedSeats.length >= 8) {
                                        alert("You can only select a maximum of 8 seats at a time.");
                                        return;
                                    }
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

            } catch (error) {
                console.error("Error fetching occupied seats:", error);
                seatingChart.innerHTML = '<p style="color:red;">Error loading seats. Please try again.</p>';
            }
            updateBookingSummary();
        }
        loadOccupiedSeats(); 

        // --- Proceed to Payment Logic ---
        btnProceedToPayment.addEventListener('click', () => {
            if (selectedSeats.length > 0) {
                const currentUser = JSON.parse(localStorage.getItem('currentUser'));
                
                if (!currentUser) {
                    alert('Please sign in to proceed with payment.');
                    openLoginModal();
                    return;
                }

                const finalBooking = {
                    ...selectedBooking, 
                    selectedSeats: selectedSeats,
                    totalPrice: totalPrice.toFixed(2),
                    userId: currentUser.email
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
 * PAYMENT PAGE (UPDATED WITH QR LOGIC)
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
        
        const totalAmountText = `₱${parseFloat(finalBooking.totalPrice).toFixed(2)}`;
        document.getElementById('paymentTotalAmount').textContent = totalAmountText;

        // Update Price displays for other forms
        const cashAmountDisplay = document.getElementById('cashAmountDisplay');
        if (cashAmountDisplay) cashAmountDisplay.textContent = totalAmountText;
        
        const gcashAmountDisplay = document.getElementById('gcashAmountDisplay');
        if (gcashAmountDisplay) gcashAmountDisplay.textContent = totalAmountText;
        
        // Payment method selection logic
        const paymentOptionBtns = document.querySelectorAll('.payment-option-btn');
        const cardPaymentForm = document.getElementById('cardPaymentForm');
        const gcashPaymentForm = document.getElementById('gcashPaymentForm');
        const cashPaymentForm = document.getElementById('cashPaymentForm'); // Make sure this is defined
        let currentPaymentMethod = 'card';

        paymentOptionBtns.forEach(button => {
            button.addEventListener('click', () => {
                paymentOptionBtns.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
        
                currentPaymentMethod = button.dataset.paymentMethod;

                if (currentPaymentMethod === 'card') {
                    cardPaymentForm.style.display = 'block';
                    gcashPaymentForm.style.display = 'none';
                    cashPaymentForm.style.display = 'none';
                } else if (currentPaymentMethod === 'gcash') {
                    cardPaymentForm.style.display = 'none';
                    gcashPaymentForm.style.display = 'block';
                    cashPaymentForm.style.display = 'none';
                } else if (currentPaymentMethod === 'cash') {
                    cardPaymentForm.style.display = 'none';
                    gcashPaymentForm.style.display = 'none';
                    cashPaymentForm.style.display = 'block';
                }
            });
        });

        // Handle Card Payment Form Submission
        cardPaymentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            processPayment(finalBooking, 'Card');
        });

        // Handle Cash Payment Form Submission (THE NEW CODE)
        if (cashPaymentForm) {
            cashPaymentForm.addEventListener('submit', function(e) {
                e.preventDefault();
                console.log("Confirm Booking Clicked!");
                processPayment(finalBooking, 'Cash on Counter');
            });
        }

        // Handle GCash Payment Submission
        const confirmGcashScanBtn = document.getElementById('confirmGcashScan');
        confirmGcashScanBtn.addEventListener('click', function() {
            confirmGcashScanBtn.disabled = true;
            confirmGcashScanBtn.textContent = 'Scanning & Waiting for Approval...';

            setTimeout(() => {
                processPayment(finalBooking, 'GCash (QR Scan)'); 
                confirmGcashScanBtn.disabled = false; 
            }, 3000); 
        });

    } else {
        document.querySelector('.payment-page main').innerHTML = `<div style="text-align:center; padding:50px; margin-top: 100px;"><h2>No Booking Information</h2><p>Please go back to the <a href="index.html">Now Showing</a> page to start a new booking.</p></div>`;
    }
}


// Function to process payment and save to DB
async function processPayment(bookingDetails, paymentMethod) {
    const SERVER_URL = 'http://localhost:3000';

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const userEmail = currentUser ? currentUser.email : 'guest_booking_' + Date.now();
    
    const bookingDataForServer = {
        userId: userEmail,
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
            const successfulBooking = {
                ...bookingDetails,
                paymentMethod: paymentMethod,
                bookingId: result.bookingId
            };
            
            localStorage.setItem('lastSuccessfulBooking', JSON.stringify(successfulBooking));

            // Simulate saving to user's history in localStorage
            let userBookings = JSON.parse(localStorage.getItem(`bookings_${userEmail}`)) || [];
            userBookings.push(successfulBooking);
            localStorage.setItem(`bookings_${userEmail}`, JSON.stringify(userBookings));
            
            localStorage.removeItem('selectedBooking');
            localStorage.removeItem('finalBooking');

            // --- CORRECTED REDIRECT LOGIC ---
            // This now handles the redirect once, based on the payment method
            if (paymentMethod === 'Cash on Counter') {
                window.location.href = 'booking-confirmed.html';
            } else {
                window.location.href = 'payment-success.html';
            }
            // --------------------------------

        } else {
            alert(`Booking failed on server side: ${result.message || 'Unknown Server Error'}`);
            // Re-enable button if payment failed on the backend
            if(paymentMethod.includes('GCash')) {
                document.getElementById('confirmGcashScan').textContent = 'CONFIRM SCAN & PAY';
                document.getElementById('confirmGcashScan').disabled = false;
            }
        }

    } catch (error) {
        console.error("Error submitting booking:", error);
        alert('Could not connect to the booking server. Please check the console and ensure the server is running.');
        // Re-enable button if network failed
        if(paymentMethod.includes('GCash')) {
            document.getElementById('confirmGcashScan').textContent = 'CONFIRM SCAN & PAY';
            document.getElementById('confirmGcashScan').disabled = false;
        }
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
            if (bookingIdEl && (booking.bookingId || booking.booking_id)) {
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
            
            localStorage.removeItem('lastSuccessfulBooking'); 

        } else {
            document.querySelector('.success-card').innerHTML = `<h2>No Booking Information Found</h2><p>It seems there was an issue retrieving your booking details. Please <a href="index.html">return to the home page</a> to start a new booking.</p><button class="btn-go-home" onclick="location.href='index.html'">Return to Home</button>`;
        }
    });
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
        const SERVER_URL = 'http://localhost:3000';

        if (!currentUser) {
            loginPromptMessage.style.display = 'block';
            bookingsListDiv.innerHTML = '';
            return;
        }
        
        try {
            const response = await fetch(`${SERVER_URL}/api/bookings/${currentUser.email}`);
            const userBookings = await response.json();

            if (userBookings.length === 0 || userBookings.message) {
                noBookingsMessage.style.display = 'block';
                if (userBookings.message) noBookingsMessage.innerHTML = `<p>Error: ${userBookings.message}</p><a href="index.html" class="btn-go-home">Browse Movies</a>`;
            } else {
                noBookingsMessage.style.display = 'none';
                userBookings.forEach(booking => {
                    const bookingCard = document.createElement('div');
                    bookingCard.classList.add('booking-card');
                    
                    const dateTime = booking.formatted_datetime || booking.date_time;

                    bookingCard.innerHTML = `
                        <img src="${booking.poster_url || 'logo.png'}" alt="${booking.movie_title} Poster">
                        <div class="booking-info">
                            <h3>${booking.movie_title}</h3>
                            <p><strong>Booking ID:</strong> ${booking.booking_id}</p> 
                            <p><strong>Cinema:</strong> ${booking.location}</p>
                            <p><strong>Date & Time:</strong> ${dateTime}</p>
                            <p><strong>Seats:</strong> ${booking.seats}</p>
                            <p><strong>Payment:</strong> ${booking.payment_method}</p>
                            <p class="total-price"><strong>Total:</strong> ₱${parseFloat(booking.total_price).toFixed(2)}</p>
                            <button class="btn-secondary" onclick="alert('Cancellation/Refund feature for user bookings is not yet implemented in the backend.')" style="margin-top: 10px;">Request Cancellation</button>
                        </div>
                    `;
                    bookingsListDiv.appendChild(bookingCard);
                });
            }
        } catch (error) {
            console.error("Error fetching user bookings from server:", error);
            noBookingsMessage.style.display = 'block';
            noBookingsMessage.innerHTML = `<p>Connection Error: Could not reach the server to load bookings.</p><a href="index.html" class="btn-go-home">Browse Movies</a>`;
        }
    });
}

/***********************
 * TEST CONNECTION (Keep this for initial server test)
 ***********************/
if (location.pathname.includes('index.html') || location.pathname === '/') {
    
    async function testDatabaseConnection() {
        const SERVER_URL = 'http://localhost:3000';
        console.log("Attempting to connect to backend server...");
        try {
            const response = await fetch(`${SERVER_URL}/api/test`);
            
            if (!response.ok) {
                throw new Error(`Server returned status: ${response.status}`);
            }
            
            const data = await response.json();
            
            console.log("✅ SUCCESS: Backend connected to Database!");

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
}

// --- FOR CONTACT US PAGE SUBMISSION ---
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm'); 
    
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault(); 
            
            const firstName = document.getElementById('firstName')?.value;
            const lastName = document.getElementById('lastName')?.value;
            const emailAddress = document.getElementById('emailAddress')?.value;
            const messageContent = document.getElementById('messageContent')?.value;
            const newsletterChecked = document.getElementById('newsletter')?.checked || false; 
            
            const SERVER_URL = 'http://localhost:3000';
            const formData = { 
                firstName,
                lastName,
                emailAddress, 
                messageContent,
                newsletterChecked
            }; 

            try {
                const response = await fetch(`${SERVER_URL}/api/contact`, { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                const result = await response.json();

                if (response.ok) {
                    alert('Thank you for your message! We will be in touch soon.');
                    contactForm.reset();
                } else {
                    alert(`Submission failed: ${result.message || 'Server error'}`);
                }
            } catch (error) {
                console.error("Contact Form Fetch Error:", error);
                alert('Could not connect to the server to submit.');
            }
        });
    }
});

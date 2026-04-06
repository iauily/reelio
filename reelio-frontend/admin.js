// admin.js (Complete and Corrected Version)
const SERVER_URL = 'http://localhost:3000'; 
// --- STEP 1: Define Available Data Lists for Showtimes ---
const AVAILABLE_TIMES = [
    "10:00 AM", "11:30 AM", "1:00 PM", "3:30 PM", "6:00 PM", "8:30 PM", "10:00 PM"
];
const AVAILABLE_DATES = [
    "2026-04-28", "2026-04-29", "2026-04-30", "2026-05-01"
];
// *** CHANGE 1: Renamed to AVAILABLE_CINEMAS ***
const AVAILABLE_CINEMAS = [
    "Cinema 1", // New cinema name to save in DB 'location' column
    "Cinema 2",
    "Cinema 3",
    "Cinema 4"
];
// ---------------------------------------------------------

window.deleteShowtime = async function(showtimeId, buttonElement) {
    if (!confirm(`Confirm deletion of showtime ID ${showtimeId}?`)) {
        return;
    }

    try {
        const response = await fetch(`${SERVER_URL}/api/admin/showtime/${showtimeId}`, { method: 'DELETE' });
        const result = await response.json();
        
        if (response.ok) {
            alert(`Showtime ID ${showtimeId} deleted successfully.`);
            // Remove the element from the UI immediately
            buttonElement.closest('.showtime-entry').remove();
        } else {
            alert(`Deletion failed: ${result.message || 'Server error'}`);
        }
    } catch (error) {
        console.error("Delete Showtime Error:", error);
        alert('Failed to delete showtime request. Check server connection.');
    }
};

document.addEventListener('DOMContentLoaded', function() {
    // --- 1. Initial Setup & Tab Switching ---
    const movieSearchInput = document.getElementById('movieSearch');
    const filterMovieStatusSelect = document.getElementById('filterMovieStatus');
    const movieListForEditing = document.getElementById('movieListForEditing');
    const analyticsDiv = document.getElementById('analyticsTab');
    const bookingsListContainer = document.getElementById('bookingsListContainer'); // New Container ID
    const addMovieForm = document.getElementById('addMovieForm');
    
    if (addMovieForm) {
        addMovieForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            const movieData = {
                title: document.getElementById('newMovieTitle').value,
                overview: document.getElementById('newMovieOverview').value,
                rating_duration: document.getElementById('newMovieRating').value,
                poster_url: document.getElementById('newMoviePoster').value,
                status: document.getElementById('newMovieStatus').value,
                release_date: document.getElementById('newMovieReleaseDate').value || null,
                trailer_url: document.getElementById('newMovieTrailerUrl').value || null
            };

            try {
                const response = await fetch(`${SERVER_URL}/api/admin/movie`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(movieData)
                });
                const result = await response.json();

                if (response.ok) {
                    alert(`Movie added successfully with ID: ${result.movieId}`);
                    addMovieForm.reset();
                    closeEditMovieModal(); // Close modal if open
                    fetchAndDisplayMoviesForEditing(); // Refresh the movie list
                } else {
                    alert(`Failed to add movie: ${result.message || 'Server Error'}`);
                }
            } catch (error) {
                console.error("Add Movie Fetch Error:", error);
                alert('Failed to connect to the server to add the movie.');
            }
        });
    }

    window.deleteMovie = async function() {
    const movieId = document.getElementById('editMovieId').value; // Get ID from the hidden field in the modal
    
    if (!confirm(`Are you sure you want to remove Movie ID ${movieId}?`)) {
        return;
    }

    try {
        const response = await fetch(`${SERVER_URL}/api/admin/movie/${movieId}`, {
            method: 'DELETE'
        });
        const result = await response.json();

        if (response.ok) {
            alert(`Movie ID ${movieId} removed successfully.`);
            closeEditMovieModal();
            fetchAndDisplayMoviesForEditing(); // Refresh the list
        } else {
            alert(`Removal failed: ${result.message || 'Server Error'}`);
        }
    } catch (error) {
        console.error("Remove Movie Fetch Error:", error);
        alert('Failed to connect to the server to remove the movie.');
    }
};

    // Main Tab Switching Logic
    document.querySelectorAll('.admin-tabs .admin-tab-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.admin-tabs .admin-tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            button.classList.add('active');
            const targetTab = button.dataset.tab;
            document.getElementById(targetTab + 'Tab').classList.add('active');
            
            if (targetTab === 'bookingManagement') {
                // Load 'all' bookings when the main tab is activated
                loadBookingsByLocation('all'); 
            } else if (targetTab === 'analytics') {
                loadAnalyticsDashboard();
            } 
        });
    });

    // Sub-tab switching logic (Movie Management: Add/Edit)
    document.querySelectorAll('#movieManagementTab .admin-tab-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('#movieManagementTab .admin-tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('#movieManagementTab .tab-content').forEach(content => content.classList.remove('active'));
            
            button.classList.add('active');
            const targetSubTab = button.dataset.tab;
            document.getElementById(targetSubTab + 'Tab').classList.add('active');

            if (targetSubTab === 'editMovies') {
                fetchAndDisplayMoviesForEditing();
            }
        });
    });

    // NEW LOGIC: Sub-tab switching for Booking Management (Cinema Filter)
    document.querySelectorAll('#bookingManagementTab .admin-tab-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('#bookingManagementTab .admin-tab-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            const locationFilter = button.dataset.location;
            loadBookingsByLocation(locationFilter);
        });
    });


    // --- 2. Movie Management Handlers (CRUD) ---
    movieSearchInput.addEventListener('input', () => {
        if (document.getElementById('editMoviesTab').classList.contains('active')) {
            fetchAndDisplayMoviesForEditing();
        }
    });
    filterMovieStatusSelect.addEventListener('change', () => {
        if (document.getElementById('editMoviesTab').classList.contains('active')) {
            fetchAndDisplayMoviesForEditing();
        }
    });

    async function fetchAndDisplayMoviesForEditing() {
        const searchTerm = movieSearchInput.value.toLowerCase();
        const statusFilter = filterMovieStatusSelect.value;
        movieListForEditing.innerHTML = '<p style="color:#bbb;">Loading movie list...</p>';

        try {
            const response = await fetch(`${SERVER_URL}/api/admin/movies`); 
            const allMovies = await response.json();

            let filteredMovies = allMovies.filter(movie => 
                movie.title.toLowerCase().includes(searchTerm) && 
                (statusFilter === 'all' || movie.status === statusFilter)
            );

            movieListForEditing.innerHTML = '';

            if (filteredMovies.length === 0) {
                movieListForEditing.innerHTML = '<p style="color:#bbb;">No movies found matching your criteria.</p>';
                return;
            }

            filteredMovies.forEach(movie => {
                const card = document.createElement('div');
                card.classList.add('admin-movie-card');
                card.dataset.movieId = movie.movie_id;
                card.innerHTML = `
                    <img src="${movie.poster_url}" alt="${movie.title} Poster">
                    <h4>${movie.title}</h4>
                    <p>${movie.status === 'now-showing' ? 'Now Showing' : 'Coming Soon'}</p>
                `;
                card.addEventListener('click', () => openEditMovieModal(movie)); 
                movieListForEditing.appendChild(card);
            });

        } catch (error) {
            console.error("Error fetching movies for editing:", error);
            movieListForEditing.innerHTML = '<p style="color:red;">Error loading movie list. Check server connection on /api/admin/movies.</p>';
        }
    }

window.openEditMovieModal = async function(movie) { // <-- Note: function is now ASYNC
    const modal = document.getElementById('editMovieModal');
    
    document.getElementById('editMovieId').value = movie.movie_id;
    document.getElementById('editMovieTitle').value = movie.title;
    document.getElementById('editMovieOverview').value = movie.overview || '';
    document.getElementById('editMovieRating').value = movie.rating_duration || '';
    document.getElementById('editMoviePoster').value = movie.poster_url || '';
    document.getElementById('editMovieStatus').value = movie.status;
    document.getElementById('editMovieReleaseDate').value = movie.release_date ? movie.release_date.substring(0, 10) : '';
    document.getElementById('editMovieTrailerUrl').value = movie.trailer_url || '';
    document.getElementById('showtimeMovieIdDisplay').textContent = movie.movie_id; // *** THIS IS THE LINE THAT WAS CAUSING THE ERROR ***

    const isComingSoon = movie.status === 'coming-soon';
    document.getElementById('editReleaseDateGroup').style.display = isComingSoon ? 'block' : 'none';
    document.getElementById('editTrailerUrlGroup').style.display = isComingSoon ? 'block' : 'none';

    // --- START: REAL SHOWTIME FETCHING LOGIC ---
    const container = document.getElementById('editShowtimesContainer');
    container.innerHTML = `<p>Loading showtimes for Movie ID ${movie.movie_id}...</p><div id="dynamicShowtimes"></div>`;
    
    try {
        const response = await fetch(`${SERVER_URL}/api/admin/showtimes/${movie.movie_id}`);
        const showtimes = await response.json();

        // Clear placeholder/loading message and re-add the "+ Add" button
        container.innerHTML = `<button type="button" class="btn-secondary" onclick="addShowtimeField()">+ Add New Showtime Slot</button><div id="dynamicShowtimes"></div>`;
        
        if (showtimes.length === 0) {
            container.insertAdjacentHTML('afterbegin', `<p style="color:#bbb;">No showtimes found for this movie. Use the button above to add one.</p>`);
        } else {
            // Render existing showtimes (using the same rendering logic as addShowtimeField)
            const dynamicDiv = document.getElementById('dynamicShowtimes');
            showtimes.forEach(st => {
                const existingField = document.createElement('div');
                existingField.classList.add('showtime-entry');
                existingField.innerHTML = `
                    <p style="flex:1;">Time: ${st.show_time}, Date: ${st.show_date}, Loc: ${st.location}</p>
                    <button type="button" class="remove-showtime-btn" onclick="deleteShowtime(${st.showtime_id}, this)">X</button>
                `;
                dynamicDiv.appendChild(existingField);
            });
        }
    } catch (error) {
        console.error("Error fetching showtimes:", error);
        container.innerHTML = `<p style="color:red;">Error loading showtimes. Check server connection.</p><button type="button" class="btn-secondary" onclick="addShowtimeField()">+ Add New Showtime Slot</button><div id="dynamicShowtimes"></div>`;
    }
    // --- END: REAL SHOWTIME FETCHING LOGIC ---
    
    modal.style.display = 'block';
};
    
    window.closeEditMovieModal = function() {
        document.getElementById('editMovieModal').style.display = 'none';
        document.getElementById('dynamicShowtimes')?.remove();
    };

    const editMovieStatusSelect = document.getElementById('editMovieStatus');
    if (editMovieStatusSelect) {
        editMovieStatusSelect.addEventListener('change', function() {
            const isComingSoon = this.value === 'coming-soon';
            document.getElementById('editReleaseDateGroup').style.display = isComingSoon ? 'block' : 'none';
            document.getElementById('editTrailerUrlGroup').style.display = isComingSoon ? 'block' : 'none';
        });
    }

    // Handle Save Changes for Edit Form (Includes existing movie details AND new showtimes)
    const editMovieForm = document.getElementById('editMovieForm');
    editMovieForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const movieId = document.getElementById('editMovieId').value;
        
        // 1. Gather updated Movie Details
        const updatedData = {
            title: document.getElementById('editMovieTitle').value,
            overview: document.getElementById('editMovieOverview').value,
            rating_duration: document.getElementById('editMovieRating').value,
            poster_url: document.getElementById('editMoviePoster').value,
            status: document.getElementById('editMovieStatus').value,
            release_date: document.getElementById('editMovieReleaseDate').value,
            trailer_url: document.getElementById('editMovieTrailerUrl').value
        };

        // 2. Gather NEW Showtime Slots added in the modal
        const newShowtimeEntries = document.querySelectorAll('#editShowtimesContainer .showtime-entry');
        const newShowtimesData = [];

        newShowtimeEntries.forEach(entry => {
            const timeInput = entry.querySelector('select[name*="newShowtimeTime"]')?.value;
            const dateInput = entry.querySelector('select[name*="newShowtimeDate"]')?.value;
            const locationInput = entry.querySelector('select[name*="newShowtimeLocation"]')?.value;
            
            // Only add if all three are selected (i.e., a complete new slot)
            if (timeInput && dateInput && locationInput) {
                newShowtimesData.push({
                    movieId: movieId,
                    time: timeInput,
                    date: dateInput,
                    location: locationInput
                });
            }
        });

        try {
            // A. Update Movie Details
            const movieResponse = await fetch(`${SERVER_URL}/api/admin/movie/${movieId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });
            const movieResult = await movieResponse.json();

            if (!movieResponse.ok) {
                throw new Error(`Movie detail update failed: ${movieResult.message || 'Unknown Error'}`);
            }

            // B. Add NEW Showtimes (POST them one by one)
            if (newShowtimesData.length > 0) {
                for (const showtime of newShowtimesData) {
                    const showtimeResponse = await fetch(`${SERVER_URL}/api/admin/showtime`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(showtime)
                    });
                    if (!showtimeResponse.ok) {
                        // Decide if you want to stop or continue on individual showtime failure
                        console.error(`Failed to add showtime: ${showtime.time} @ ${showtime.location}`, await showtimeResponse.json());
                    }
                }
            }

            alert(`Success! Movie ID ${movieId} updated and ${newShowtimesData.length} new showtimes queued for addition.`);
            closeEditMovieModal();
            fetchAndDisplayMoviesForEditing();
            
        } catch (error) {
            console.error("Admin Movie Edit/Showtime Fetch Error:", error);
            alert(`Operation failed: ${error.message || 'Could not connect to the admin server.'}`);
        }
    });
    
    // --- 3. Showtime & Scheduling Handlers (Integrated in Modal) ---
    window.addShowtimeField = function() {
        const container = document.getElementById('editShowtimesContainer');
        const dynamicDiv = document.getElementById('dynamicShowtimes') || document.createElement('div');
        if (!document.getElementById('dynamicShowtimes')) {
             dynamicDiv.id = 'dynamicShowtimes';
             container.appendChild(dynamicDiv);
        }
        
        // Generate options from the defined lists
        const timeOptions = AVAILABLE_TIMES.map(time => `<option value="${time}">${time}</option>`).join('');
        const dateOptions = AVAILABLE_DATES.map(date => `<option value="${date}">${new Date(date + 'T00:00:00').toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}</option>`).join('');
        // *** FIX 2: Using AVAILABLE_CINEMAS here ***
        const cinemaOptions = AVAILABLE_CINEMAS.map(cinema => `<option value="${cinema}">${cinema}</option>`).join('');


        const newField = document.createElement('div');
        newField.classList.add('showtime-entry');
        newField.innerHTML = `
            <select name="newShowtimeTime[]" required style="width:100%;"><option value="">Select Time</option>${timeOptions}</select>
            <select name="newShowtimeDate[]" required style="width:100%;"><option value="">Select Date</option>${dateOptions}</select>
            <select name="newShowtimeLocation[]" required style="width:100%;"><option value="">Select Cinema</option>${cinemaOptions}</select>
            <button type="button" class="remove-showtime-btn" onclick="removeShowtimeField(this)">X</button>
        `;
        dynamicDiv.appendChild(newField);
    };

    window.removeShowtimeField = function(button) {
        button.closest('.showtime-entry').remove();
    };
    
    // --- 4. Booking Management Handlers (UPDATED TO USE CINEMA FILTER) ---
    window.loadBookingsByLocation = async function(locationFilter) {
        const listContainer = document.getElementById('bookingsListContainer'); // Use the new container ID
        listContainer.innerHTML = '<p style="color:#bbb;">Loading transactions...</p>';

        let apiUrl = `${SERVER_URL}/api/admin/bookings`;

        if (locationFilter !== 'all') {
            apiUrl = `${SERVER_URL}/api/admin/bookings/location/${encodeURIComponent(locationFilter)}`;
        }
        
        try {
            const response = await fetch(apiUrl);
            const bookings = await response.json();

            listContainer.innerHTML = '';
            if (bookings.length === 0 || bookings.message) {
                 listContainer.innerHTML = `<p style="color:#bbb;">No ${locationFilter === 'all' ? '' : locationFilter} bookings found. Server Error: ${bookings.message || ''}</p>`;
                 return;
            }

            const table = document.createElement('table');
            table.classList.add('admin-table');
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>User Email</th>
                        <th>Movie</th>
                        <th>Seats</th>
                        <th>Total</th>
                        <th>Date/Time</th>
                        <th>Method</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${bookings.map(b => `
                        <tr>
                            <td>${b.booking_id}</td>
                            <td>${b.user_email}</td>
                            <td>${b.movie_title}</td>
                            <td>${b.seats}</td>
                            <td>₱${parseFloat(b.total_price).toFixed(2)}</td>
                            <td>${b.date_time}</td>
                            <td>${b.payment_method}</td>
                            <td>
                                <button class="btn-secondary" onclick="handleCancellation(${b.booking_id})">Cancel/Refund</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            `;
            listContainer.appendChild(table);
        } catch (error) {
            console.error("Error loading bookings:", error);
            listContainer.innerHTML = '<p style="color:red;">Error loading bookings from server. Check console.</p>';
        }
    };

    // --- 5. Booking Control Handlers ---
    window.handleCancellation = async function(bookingId) {
        if (!confirm(`Confirm REFUND/CANCELLATION for Booking ID ${bookingId}?`)) return;

        try {
            const response = await fetch(`${SERVER_URL}/api/admin/cancellation/${bookingId}`, { method: 'POST' }); 
            const result = await response.json();
            
            if (response.ok) {
                alert(`Booking ${bookingId} successfully processed.`);
                // Re-load the current view (all or per location)
                const activeTab = document.querySelector('#bookingManagementTab .admin-tab-btn.active');
                if (activeTab) {
                    loadBookingsByLocation(activeTab.dataset.location);
                }
            } else {
                alert(`Cancellation failed: ${result.message || 'Server error'}`);
            }
        } catch (error) {
            console.error("Cancellation Error:", error);
            alert('Failed to process cancellation request. Check console.');
        }
    };

    // --- 6. Analytics Dashboard ---
    window.loadAnalyticsDashboard = async function() {
        analyticsDiv.innerHTML = '<h3>Analytics Dashboard</h3><div id="analyticsContent" style="display:flex; gap:20px; flex-wrap:wrap;">Loading statistics...</div>';
        try {
            // 1. Fetch Revenue/Booking Stats
            const statsResponse = await fetch(`${SERVER_URL}/api/admin/stats`);
            let stats = { totalBookings: 0, totalRevenue: 0 };
            if (statsResponse.ok) stats = await statsResponse.json();

            // 2. Fetch Sentiment Stats
            const sentimentResponse = await fetch(`${SERVER_URL}/api/admin/sentiment-stats`);
            let sStats = { happy: 0, unhappy: 0 };
            if (sentimentResponse.ok) sStats = await sentimentResponse.json();

            // Format data
            const revenueValue = typeof stats.totalRevenue === 'number' ? stats.totalRevenue : 0; 
            const bookingCount = typeof stats.totalBookings === 'number' ? stats.totalBookings : 0;
            
            const contentDiv = document.getElementById('analyticsContent');
            contentDiv.innerHTML = `
                <div class="stat-card total-bookings" style="background-color:#1a1a1a; padding:20px; border-radius:8px; flex:1; min-width:200px; border: 1px solid #333;">
                    <h4>Total Ticket Transactions</h4>
                    <p style="font-size:2em; color:#ffcc00; margin:5px 0;">${bookingCount}</p>
                </div>
                <div class="stat-card total-revenue" style="background-color:#1a1a1a; padding:20px; border-radius:8px; flex:1; min-width:200px; border: 1px solid #333;">
                    <h4>Total Revenue Generated</h4>
                    <p style="font-size:2em; color:#ffcc00; margin:5px 0;">₱${revenueValue.toFixed(2)}</p> 
                </div>
                <div class="stat-card sentiment" style="background-color:#1a1a1a; padding:20px; border-radius:8px; flex:1; min-width:200px; border: 1px solid #333;">
                    <h4>Customer Sentiment</h4>
                    <p style="font-size:1.2em; margin:5px 0;">Happy: ${sStats.happy} | Unhappy: ${sStats.unhappy}</p>
                </div>
            `;
        } catch (error) {
            console.error("Error loading analytics:", error);
            analyticsDiv.innerHTML = '<h3>Analytics Dashboard</h3><p style="color:red;">Error loading analytics. Check console.</p>';
        }
    };

    // --- 7. NEW SECTIONS: Location Management & Booking Control Placeholders ---
    
    const locationTab = document.getElementById('locationManagementTab');
    if (locationTab) {
        locationTab.innerHTML = `
            <h3>Cinema Management (Placeholder)</h3>
            <p>This section manages cinemas and theaters.</p>
            <div class="admin-form">
                 <div class="form-group"><label for="locationName">Cinema Name</label><input type="text" id="locationName"></div>
                 <button class="btn-primary" onclick="alert('Cinema Management is a placeholder and requires backend API integration.')">Add New Cinema</button>
            </div>
        `;
    }

    const bookingControlTab = document.getElementById('bookingControlTab');
    if (bookingControlTab) {
        bookingControlTab.innerHTML = `
            <h3>Booking Control (Cancellations & Refunds)</h3>
            <p>This section allows admin to override/manage specific bookings directly, linking to the functionality in the Booking Management tab.</p>
            <div class="admin-form">
                 <div class="form-group"><label for="bookingIdToControl">Enter Booking ID for Control</label><input type="text" id="bookingIdToControl"></div>
                 <button class="btn-secondary" onclick="alert('Feature not implemented yet. Use Booking Management tab.')">Load Booking</button>
            </div>
        `;
    }

    // --- Showtime Selector Logic (For separate Showtime Management Tab - now inactive) ---
    window.loadMovieSelectorForShowtimes = async function() {
        const selectorDiv = document.getElementById('showtimeManagementTab');
        if (!document.getElementById('showtimeSelector')) {
             selectorDiv.innerHTML = `
                <h3>Manage Showtimes</h3>
                <p>Select a movie from the list below to edit its showtimes and locations.</p>
                <div id="showtimeSelector">Loading movies...</div>
                <div id="showtimeEditorArea"></div>
             `;
        }

        const selectorArea = document.getElementById('showtimeSelector');
        try {
            const response = await fetch(`${SERVER_URL}/api/admin/movies`);
            const movies = await response.json();

            selectorArea.innerHTML = `
                <div class="admin-form">
                    <div class="form-group" style="display:flex; align-items:center; gap:15px;">
                        <label for="showtimeMovieSelect" style="width:auto; margin-bottom:0;">Select Movie:</label>
                        <select id="showtimeMovieSelect" style="width:300px;">
                            <option value="">-- Select a Movie --</option>
                            ${movies.map(m => `<option value="${m.movie_id}">${m.title} (${m.status})</option>`).join('')}
                        </select>
                        <button class="btn-primary" onclick="loadShowtimeEditor()">Load Showtimes</button>
                    </div>
                </div>
            `;
        } catch (e) {
            selectorArea.innerHTML = '<p style="color:red;">Could not load movies for showtime scheduling.</p>';
        }
    }

    window.loadShowtimeEditor = function() {
        const movieId = document.getElementById('showtimeMovieSelect').value;
        const editorArea = document.getElementById('showtimeEditorArea');
        if (!movieId) {
            editorArea.innerHTML = '<p style="color:#bbb;">Please select a movie first.</p>';
            return;
        }
        
        editorArea.innerHTML = `
            <h4>Showtimes Management for Movie ID: ${movieId}</h4>
            <form id="addShowtimeForm" class="admin-form">
                <input type="hidden" id="showtimeMovieId" value="${movieId}">
                <div class="form-group" style="display:flex; gap:10px;">
                    <div style="flex:1;"><label for="showtimeTimeInput">Time</label><input type="text" id="showtimeTimeInput" placeholder="e.g., 7:00 PM" required></div>
                    <div style="flex:1;"><label for="showtimeDateInput">Date</label><input type="date" id="showtimeDateInput" required></div>
                    <div style="flex:1;"><label for="showtimeLocationInput">Cinema</label><input type="text" id="showtimeLocationInput" placeholder="e.g., Cinema 1" required></div>
                </div>
                <button type="submit" class="btn-primary">Add New Showtime</button>
            </form>
            <div id="currentShowtimesList">
                <p style="color:#ffcc00;">Current Showtimes (Requires Backend GET/DELETE API calls)</p>
            </div>
        `;
        
         document.getElementById('addShowtimeForm').addEventListener('submit', async function(e) {
             e.preventDefault();
             const showtimeData = {
                movieId: document.getElementById('showtimeMovieId').value,
                time: document.getElementById('showtimeTimeInput').value,
                date: document.getElementById('showtimeDateInput').value,
                location: document.getElementById('showtimeLocationInput').value,
             };
             
             try {
                 const response = await fetch(`${SERVER_URL}/api/admin/showtime`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(showtimeData)
                 });
                 const result = await response.json();

                 if (response.ok) {
                    alert(`Success! Showtime added with ID: ${result.showtimeId}`);
                    this.reset();
                    // Re-open modal to refresh showtimes list instantly
                    const movieId = showtimeData.movieId;
                    const movieCard = document.querySelector(`.admin-movie-card[data-movie-id='${movieId}']`);
                    if (movieCard) {
                        closeEditMovieModal(); 
                        fetchAndDisplayMoviesForEditing(); // Force list refresh to see if it reloads showtimes next time
                    }
                 } else {
                    alert(`Showtime addition failed: ${result.message || 'Unknown Server Error'}`);
                 }
             } catch (error) {
                 console.error("Admin Showtime Add Fetch Error:", error);
                 alert('Could not connect to the admin server to add showtime.');
             }
        });
    }

    // --- INITIAL LOAD LOGIC ---
    const initialActiveTabButton = document.querySelector('.admin-tabs .admin-tab-btn.active');
    if (initialActiveTabButton) {
        const initialTab = initialActiveTabButton.dataset.tab;
        
        if (initialTab === 'movieManagement') {
            const initialSubTabButton = document.querySelector('#movieManagementTab .admin-tab-btn.active');
            if (initialSubTabButton && initialSubTabButton.dataset.tab === 'editMovies') {
                fetchAndDisplayMoviesForEditing();
            }
        } else if (initialTab === 'bookingManagement') {
            // This now calls the new function with 'all'
            loadBookingsByLocation('all');
        } else if (initialTab === 'analytics') {
            loadAnalyticsDashboard();
        }
    }
});

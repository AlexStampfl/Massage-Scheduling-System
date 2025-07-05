// In client list page, click calendar button to go back to calendar
const nav = document.getElementById("go_to_calendar");
if (nav) {
    nav.addEventListener('click', () => {
        window.location.href = "/main";
    });
}

// Export client list to csv file
function exportList() {
    document.getElementById('export_client_list')
}

const tbody = document.getElementById("clientTableBody");
const row = document.createElement("tr");

tbody.appendChild(row);

const add_client = document.getElementById("add_client");

add_client.addEventListener('click', () => {
    const tbody = document.getElementById("clientTableBody")
    const row = document.createElement("tr");
    
    // Form to fill out to add client
    row.innerHTML = `
    <td><input type="checkbox"></td>
    <td><input type="firstname" name="lastname"></td>
    <td><input type="lastname" name="firstname"></td>
    <td><input type="phone" name="phone"></td>
    <td><input type="email" name="email"></td>
    <td><textarea name="notes"></textarea></td>
    <td><button class="submit-client">✔</button></td>
`;

tbody.appendChild(row);

// Connects to DB and we have data peristence!
row.querySelector(".submit-client").addEventListener("click", async (e) => {
    e.preventDefault();

    const first = row.querySelector('[name="firstname"]').value;
    const last = row.querySelector('[name="lastname"]').value;
    const phone = row.querySelector('[name="phone"]').value;
    const email = row.querySelector('[name="email"]').value;
    const notes = row.querySelector('[name="notes"]').value; // Just added

    // This is where the magic happens
    const response = await fetch("/add-client", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({ first, last, phone, email, notes})
    });

    if (response.ok) {
        window.location.reload(); // Refresh page to pull from DB
    } else {
        alert("Failed to add client");
    }


    })
});

// Meatball menu on right end of client list
document.addEventListener('click', (e) => {
    const isMenuIcon = e.target.classList.contains('meatballs');

    // Closes all open menus, so only one menu is open at a time
    document.querySelectorAll('.dropdown_menu').forEach(menu => {
        menu.style.display = 'none';
    });

    if (isMenuIcon) { // if correct meatball menu is clicked
        const menu = e.target.nextElementSibling;
        if (menu) { // Shows the correct dropdown menu based on row that was clicked
            menu.style.display = 'block';
        }
        e.stopPropagation();
    }
});


// event listener for modal #2 when the client list 'edit' is clicked
// Use class rather than id
document.querySelectorAll(".edit_client").forEach(button => {
    button.addEventListener("click", async () => {
        // Fetch data from database to populate the input fields and then edit and save them
        const modal = document.getElementById("modal");
        const clientId = button.dataset.id; // assumes your button has a data-id attribute

        // Set hidden input value so PUT uses the right ID
        document.querySelector('#editClientId').value = clientId;

        // How the frontend (JS in browser) requests data from the backend (Flask)
        const res = await fetch(`/client/${clientId}`);
        const client = await res.json();
        
        document.querySelector('[name="firstname"]').value = client.first_name;
        document.querySelector('[name="lastname"]').value = client.last_name;
        document.querySelector('[name="phone"]').value = client.phone;
        document.querySelector('[name="email"]').value = client.email;
        document.querySelector('[name="notes"]').value = client.notes; // Just added at 7:37 5/30/25
    
        modal.style.display = "block";
    });
    });


document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".client-row").forEach(row => {
        row.addEventListener("click", function (e) {
            if (e.target.closest(".menu_cell") || e.target.closest(".dropdown_menu")) return;
            
            // Skip click if it's on the meatball menu
            const clientId = this.getAttribute("data-id");
            fetch(`/client/${clientId}/details`)
                .then(res => res.json())
                .then(data => showClientDetailModal(data))
                .catch(err => console.error("Error fetching client details:", err));
        });
    });
});

function showClientDetailModal(data) {
    document.getElementById("clientDetailName").textContent = `${data.first_name} ${data.last_name}`;
    document.getElementById("clientDetailEmail").textContent = data.email || "_";
    document.getElementById("clientDetailPhone").textContent = data.phone || "_";
    document.getElementById("clientDetailNotes").textContent = data.notes || "None";

    const list = document.getElementById("clientDetailAppointments");
    list.innerHTML = "";

    if (data.appointments && data.appointments.length > 0) {
        data.appointments.forEach(appt => {
            const li = document.createElement("li");
            // li.textContent = `${appt.date} - ${appt.service}`;
            li.textContent = appt.date;
            list.appendChild(li);
        }); 
    } else {
        list.innerHTML = "<li>No past appointments.</li>";
    }

    document.getElementById("clientDetailModal").style.display = "block";
}

// Close detail modal
// document.querySelector(".close-detail-btn").addEventListener("click", () => {
//     document.getElementById("clientDetailModal").style.display = "none";
// })

// safer version - learn more later
const closeDtailBtn = document.querySelector(".close-detail-btn");
if (closeDtailBtn) {
    closeDtailBtn.addEventListener("click", () => {
        document.getElementById("clientDetailModal").style.display = "none";
    })
}


// Edit and Update client
function updateClientInfo() {
    // Listener for saving updates via PUT request
    document.querySelector('#editForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const clientId = document.querySelector('#editClientId').value;

        const updateData = {
            first: document.querySelector('[name="firstname"]').value,
            last: document.querySelector('[name="lastname"]').value,
            phone: document.querySelector('[name="phone"]').value,
            email: document.querySelector('[name="email"]').value,
            notes: document.querySelector('[name="notes"]').value, // Just added
        };

        const response = await fetch(`/update-client/${clientId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        if (response.ok) {
            console.log("Client updated successfully");
            location.reload();
        } else {
            alert("Failed to update client.");
        }
    })
}

// Delete Client
function deleteClient() {
    document.addEventListener('click', async (e) => {
        if (e.target && e.target.classList.contains('delete_client')) {
            const clientId = e.target.dataset.id;
            const confirmed = confirm("Are you sure you want to delete this client?");
            if (!confirmed) return;

            const res = await fetch(`/delete-client/${clientId}`, {
                method: 'DELETE'
            });
        
            if (res.ok) {
                location.reload();
            } else {
                alert("Failed to delete client.");
            }
        }
    });
}


// Exit modal
function myModal() {
    const modal = document.getElementById("modal");
    const closeModalBtn = document.querySelector(".close-btn");

    if (closeModalBtn) {
        closeModalBtn.addEventListener("click", () => {
            modal.style.display = "none"
        });
    }
}

updateClientInfo();
myModal();
deleteClient();
// In client list page, click calendar button to go back to calendar
const nav = document.getElementById("go_to_calendar");
if (nav) {
    nav.addEventListener('click', () => {
        window.location.href = "/main";
    });
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
    <td><input type="lastname" name="firstname"</td>
    <td><input type="phone" name="phone"></td>
    <td><input type="email" name="email"</td>
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

    // This is where the magic happens
    const response = await fetch("/add-client", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({ first, last, phone, email})
    });

    if (response.ok) {
        window.location.reload(); // Refresh page to pull from DB
    } else {
        alert("Failed to add client");
    }


})
});
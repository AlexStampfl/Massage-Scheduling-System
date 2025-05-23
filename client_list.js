// In client list page, click calendar button to go back to calendar
const nav = document.getElementById("go_to_calendar");
if (nav) {
    nav.addEventListener('click', () => {
        window.location.href = "./main.html";
    });
}


const tbody = document.getElementById("clientTableBody");
const row = document.createElement("tr");

row.innerHTML = `
    <td><input type="checkbox"></td>
    <td>Doe</td>
    <td>John</td>
    <td>(555) 123-4567</td>
    <td>john@example.com</td>
    <td>Active</td>
`;
tbody.appendChild(row);


const add_client = document.getElementById("add_client");

add_client.addEventListener('click', () => {
    const tbody = document.getElementById("clientTableBody")
    const row = document.createElement("tr");
    
    row.innerHTML = `
    <td><input type="checkbox"></td>
    <td><input type="firstname" name="lastname"></td>
    <td><input type="lastname" name="firstname"</td>
    <td><input type="phone" name="phone"></td>
    <td><input type="email" name="email"</td>
    <td><button class="submit-client">✔</button></td>
`;

tbody.appendChild(row);

row.querySelector(".submit-client").addEventListener('click', () => {
    const first = row.querySelector('[name="firstname"]').value;
    const last = row.querySelector('[name="lastname"]').value;
    const phone = row.querySelector('[name="phone"]').value;
    const email = row.querySelector('[name="email"]').value;

    row.innerHTML = `
        <td><input type="checkbox" /></td>
        <td>${last}</td>
        <td>${first}</td>
        <td>${phone}</td>
        <td>${email}</td>
        <td>Active</td>
        `;
    });
});
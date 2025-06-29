// In client list page, click calendar button to go back to calendar
const nav = document.getElementById("go_to_calendar");
if (nav) {
    nav.addEventListener('click', () => {
        window.location.href = "/main";
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Load buffer time on page load
    fetch('/get-settings')
        .then(response => response.json())
        .then(data => {
            document.getElementById('buffer_time_after').value = data.buffer_time_after;
        });

    // Save buffer time on button click
    document.getElementById('save_preferences').addEventListener('click', function() {
        const bufferTime = parseInt(document.getElementById('buffer_time_after').value || 0);

        fetch('/update-settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ buffer_time_after: bufferTime }),
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert("Settings saved!");
                    if (window.calendar) {
                        window.calendar.refetchEvents();
                    }                
                }
            })
    })
})

document.getElementById("addServiceForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    const name = document.getElementById("newServiceName").value;

    const response = await fetch("/add-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({  name })
    });

    if (response.ok) {
        document.getElementById("newServiceName").value = "";
        loadServices();
    }
});

async function loadServices() {
    const res = await fetch("/get-services");
    const services = await res.json();
    const list = document.getElementById("serviceList");
    list.innerHTML = "";
    services.forEach(service => {
        const li = document.createElement("li");
        // li.textContent = service.name;
        li.dataset.id = service.id;
        li.innerHTML = `
            ${service.name}
            <button class="delete-service">Delete</button>
        `;
        list.appendChild(li);
    });
    deleteButtons();
}

function deleteButtons() {
    document.querySelectorAll('.delete-service').forEach(button => {
        button.addEventListener('click', async function() {
            const li = this.closest('li');
            const serviceId = li.getAttribute('data-id');
    
            const confirmed = confirm("Are you sure you want to delete this service?");
            if (!confirmed) return;
    
            try {
                const response = await fetch('/delete-service', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: serviceId })
                });
    
                const result = await response.json();
                if (result.status === 'success') {
                    li.remove(); // Remove from UI
                } else {
                    alert("Failed to delete service: " + result.message);
                }
            } catch (error) {
                console.error("Error deleting service:", error);
                alert("An error occurred.");
            }
        })
    })
}

loadServices();

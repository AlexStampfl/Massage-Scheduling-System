let globalServices = [];

window.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("serviceList")) {
        loadServices(); // Only run if this page has the element
    } else {
        loadServices();
    }
});

async function loadServices() {
    const res = await fetch("/get-services");
    const services = await res.json();
    globalServices = services;

    const list = document.getElementById("serviceList");
    list.innerHTML = "";

    services.forEach(service => {
        const li = document.createElement("li");
        li.dataset.id = service.id;
        li.style.color = service.color || "#000000";
        li.innerHTML = `
            <span style="color: ${service.color || "#000000"}">${service.name}</span>
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

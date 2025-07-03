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

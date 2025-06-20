// Initialize calendar
var calendarEl = document.getElementById('calendar');
var calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    selectable: true, // allows selecting date/time

    select: function (info) {
        const modal = document.getElementById("modal");
        modal.style.display = "block";

        selectedEvent = null; // Means we're adding a new one
        selectedTimeInfo = info;

        // Shows the Date/Day you clicked on in the modal's header, without this, it just says 'Today' and you can only click once and nothing else will work
        let dateObj = selectedTimeInfo.start;
        let formattedDate = dateObj.toLocaleDateString(undefined, {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        let existingDate = document.getElementById("modal_date");
        if (existingDate) {
            existingDate.innerHTML = formattedDate;
        }
    },

    // the click event for the modal
    eventClick: function (info) {
        const modal = document.getElementById("modal");
        modal.style.display = "block";

    //clear model fields
    // document.getElementById("addTitle").value = "";
    document.getElementById("appointmentType").value = "";
    document.getElementById("editStart").value = "";
    document.getElementById("editEnd").value = "";
    document.getElementById("notes").value = "";

        selectedEvent = info.event;
        selectedTimeInfo = null;

        // Pre-fill modal fields
        // document.getElementById("addTitle").value = info.event.title;
        document.getElementById("appointmentType").value = info.event.appointment;
        document.getElementById("editStart").value = info.event.startStr.slice(0, 16); // startStr is a property of the time, includes time, date and time zone
        document.getElementById("editEnd").value = info.event.endStr ? info.event.endStr.slice(0, 16) : ""; // endStr is a property of the time, both are used for the time format
        document.getElementById("notes").value = info.event.extendedProps?.notes || "";
    },

    // Calendar header options
    headerToolbar: {
        left: 'prev,next today clients',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    customButtons: {
        clients: {
            text: 'clients',
            click: function() {
                window.location.href = "/client_list";
            }
        }
    },

    events: '/get-events', // Flask route returns JSON array of events
    editable: true, // determines if the events can be dragged and resized
    eventStartEditable: true,
    eventColor: 'violet',
});

calendar.render();

let selectedEvent = null;
let selectedTimeInfo = null;


// Event listener function for the Save Button in the modal
async function handleSaveClick() {
    // const title = document.getElementById("addTitle").value;
    const appointment = document.getElementById("appointmentType").value; // drop down menu with options
    const startTime = document.getElementById("editStart").value;
    const endTime = document.getElementById("editEnd").value;
    const notes = document.getElementById("notes").value;
    const clientId = document.getElementById("clientDropdown").value;

    const clientDropdown = document.getElementById("clientDropdown");
    const clientName = clientDropdown.options[clientDropdown.selectedIndex].text;

    // Final title to display on calendar
    const fullTitle = `${clientName} - ${appointment}`;

    // Extract date from `selectedTimeInfo`
    let date = null;

    // If adding a new event, display clicked date
    if (selectedTimeInfo) {
        date = selectedTimeInfo.startStr.split("T")[0]; // "2025-05-21"
    } else if (selectedEvent) {
        date = selectedEvent.startStr.split("T")[0];
    }
    
    // const isAllDay = document.getElementById("allDayToggle").checked;
    let isAllDay = document.getElementById("allDayToggle").checked;

    // If no times provided, default to all-day
    if (!startTime && !endTime) {
        isAllDay = true;
    }
    
    let start, end;
    if (isAllDay) {
        start = date; // just the date string, no time
        end = date;
    } else {
        start = `${date}T${startTime}`;
        end = `${date}T${endTime}`;
    }

    document.getElementById("allDayToggle").addEventListener("change", function() {
        const timeInputs = [document.getElementById("editStart"), document.getElementById("editEnd")];
        timeInputs.forEach(input => input.disabled = this.checked);
    })

    // Set color dynamically based on event
    let eventColor = 'violet';
    if (appointment === 'Block Time Off') {
        eventColor = 'lightgray';
    }
    else if (appointment === 'Service #1') {
        eventColor = 'green';
    }
    else if (appointment === 'Service #2') {
        eventColor = 'orange';
    }
    else if (appointment === 'Service #3') {
        eventColor = 'blue';
    }

    if (selectedEvent) {
        // Edit an existing event
        // setProp makes the title change correctly, however setExtendedProp causes the title to not change
        selectedEvent.setProp("title", `${clientName} - ${appointment}`);
        selectedEvent.setDates(start, end, { allDay: isAllDay });
        selectedEvent.setExtendedProp("notes", notes);
        selectedEvent.setProp("color", eventColor); // sets color while editing dynamically
    } else if (selectedTimeInfo) {
        try {
            const response = await fetch('/add-event', { // await only works inside function marked as async
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: fullTitle,
                    start: start,
                    end: end,
                    allDay: isAllDay,
                    color: eventColor,
                    notes: notes,
                    client_id: clientId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const result = await response.json(); // gives real DB id

            // Create new event
            calendar.addEvent({
                id: result.id, // persist backend id
                title: fullTitle,
                start: start,
                end: end,
                allDay: isAllDay,
                color: eventColor, // Color based on the event
                extendedProps: {
                    notes: notes,
                    client_id: clientId
                }
            });
        } catch (error) {
            console.error("Error saving event:", error);
            alert("Failed to save the appointment. Please try again.");
        }
    }

    // Reset and close the modal
    document.getElementById("modal").style.display = "none";
    selectedEvent = null;
    selectedTimeInfo = null;

    // //clear model fields
    document.getElementById("appointmentType").value = "";
    document.getElementById("editStart").value = "";
    document.getElementById("editEnd").value = "";
    document.getElementById("notes").value = "";
}


// Function call
document.getElementById("save").addEventListener("click", handleSaveClick);


// Populate dropdown on modal open
function populateClientDropdown() {
    fetch('/get-clients')
    .then(response => {
        if(response.ok) { // Checks if HTTP response status in range of 200-299, indicating success
            return response.json(); // Data is parsed as json
        } else {
            throw new Error("Something went wrong");
        }
        })
    .then(data => {
        const dropdown = document.getElementById("clientDropdown");
        dropdown.innerHTML = '<option value="">-- Select a client --</option>';
        data.forEach(client => {
            const option = document.createElement("option");
            option.value = client.id;
            option.textContent = client.name;
            dropdown.appendChild(option);
        })
    })
    .catch(err => console.error("Error fetching clients:", err));
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

// Delete appointment (Not cancel, just delete)
function deleteAppointment() {
    const deleteEvent = document.getElementById("delete_event");

    deleteEvent.addEventListener('click', ()=> {
        if(selectedEvent) {
            const id = selectedEvent.id;

            // fetch to inform the backend of the deletion
            fetch('delete-event', {
                method: 'POST', 
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id })
                }).then(response => {
                    if (response.ok) {
                        selectedEvent.remove(); // Remove from UI
                        selectedEvent = null; // Reset selection
                        
                        document.getElementById("appointmentType").value = "";
                        document.getElementById("editStart").value = "";
                        document.getElementById("editEnd").value = "";
                        document.getElementById("notes").value = "";
                        document.getElementById("modal").style.display = "none"; // close the modal
                    } else {
                        return response.json().then(err => {
                            console.error("Failed to delete on server");
                            alert("Failed to delete appointment. Please try again.");
                        });
                    }
                }).catch(err => {
                    console.error("Delete error:", err);
                    alert("An error occurred while deleting the appointment.");
                });
        } else {
            console.warn("No event selected for deletion");
            alert("Please select an event to delete.");
        }
    });
}

myModal();
populateClientDropdown();
deleteAppointment();
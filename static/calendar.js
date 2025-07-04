// Initialize calendar
var calendarEl = document.getElementById('calendar');

async function updateEventTimeOnServer(event, revertFunc) { // async functions always return a promise
    const updatedData = {
        // Grab the updated fields
        id: event.id,
        start: event.start.toISOString(),
        end: event.end ? event.end.toISOString() : null,
        allDay: event.allDay ?? false // ensures boolean, default to false
    };

    try {
        const response = await fetch('/update-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });

        const result = await response.json();
        if (!response.ok || result.status !== 'success') {
            throw new Error(result.message || 'Update failed');
        }
    } catch (error) {
        console.error("Update failed:", error);
        revertFunc();
    }
}

// Calendar setup
var calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    selectable: true, // allows selecting date/time
    events: async function (fetchInfo, successCallback, failureCallback) {
        try {
            // Fetch appointments
            const [eventRes, settingRes] = await Promise.all([
                fetch('/get-events'),
                fetch('/get-settings')
            ]);

            const events = await eventRes.json();
            const settings = await settingRes.json();
            const buffer = parseInt(settings.buffer_time_after || 0);

            const allEvents = [];
            events.forEach(event => {
                allEvents.push(event);

                // Handle recurring events
                if (event.recurrence && event.recurrence !== 'none') {
                    const recurrenceCount = 5;

                    for (let i = 1; i <= recurrenceCount; i++) {
                        const start = new Date(event.start);
                        const end = new Date(event.end);

                        if (event.recurrence === 'daily') {
                            start.setDate(start.getDate() + i);
                            end.setDate(end.getDate() + i);
                        } else if (event.recurrence === 'weekly') {
                            start.setDate(start.getDate() + 7 * i);
                            end.setDate(end.getDate() + 7 * i);
                        }

                        allEvents.push({
                            ...event,
                            start: start.toISOString(),
                            end: end.toISOString(),
                            id: `${event.id}_recurring_${i}` // Make sure ID is unique
                        });
                    }
                }

                // Add buffer if needed
                const endTime = new Date(event.end);
                if (buffer > 0 && !isNaN(endTime.getTime())) {
                    const bufferEnd = new Date(endTime.getTime() + buffer * 60000);

                    allEvents.push({
                        start: endTime.toISOString(),
                        end: bufferEnd.toISOString(),
                        display: 'background',
                        backgroundColor: '#8e44ad',
                        overlap: (e) => e.display !== 'background',
                        editable: false,
                        selectable: false,
                        className: 'buffer-time'
                    });
                }
            });
            successCallback(allEvents);
        } catch (err) {
            failureCallback(err);
        }
    },

    editable: true, // determines if the events can be dragged and resized
    eventStartEditable: true,

    // Logic for adding new appointment
    select: function (info) {

        // Check if selected range overlaps any buffer time
        const overlapping = calendar.getEvents().some(evt => {
            return evt.display == 'background' &&
                info.start < evt.end &&
                info.end > evt.start;
        });

        if (overlapping) {
            alert("Conflicting time, unable to book during buffer time");
            return; // stop the modal from opening
        }

        const modal = document.getElementById("modal");
        modal.style.display = "block";

        selectedEvent = null; // Means we're adding a new one
        selectedTimeInfo = info; // Capturing the click time

        // Shows the Date/Day you clicked on in the modal's header, without this, it just says 'Today' and you can only click once and nothing else will work
        let dateObj = selectedTimeInfo.start;
        let formattedDate = dateObj.toLocaleDateString(undefined, {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        let existingDate = document.getElementById("modal_date");
        if (existingDate) {
            existingDate.innerHTML = formattedDate;
        }

        // Autofill start time based on clicked slot, click a time to create appointment at that time, not a blank modal
        if (selectedTimeInfo && selectedTimeInfo.start) {
            const startInput = document.getElementById("editStart");
            const endInput = document.getElementById("editEnd");

            const start = new Date(selectedTimeInfo.start);
            const end = new Date(start.getTime() + 60 * 60 * 1000); // Default duration: 1 hour

            const formatTime = (date) => {
                return date.toTimeString().slice(0, 5); // HH:mm
            }

            startInput.value = formatTime(start);
            endInput.value = formatTime(end);
        }

        populateServicesDropdown();
    },

    // the click event for the modal
    eventClick: function (info) {
        const modal = document.getElementById("modal");
        modal.style.display = "block";

        //clear model fields
        document.getElementById("appointmentType").value = "";
        document.getElementById("editStart").value = "";
        document.getElementById("editEnd").value = "";
        document.getElementById("notes").value = "";

        selectedEvent = info.event;
        selectedTimeInfo = null;

        // Pre-fill modal fields
        document.getElementById("appointmentType").value = info.event.appointment;
        document.getElementById("editStart").value = info.event.startStr.slice(0, 16); // startStr is a property of the time, includes time, date and time zone
        document.getElementById("editEnd").value = info.event.endStr ? info.event.endStr.slice(0, 16) : ""; // endStr is a property of the time, both are used for the time format
        document.getElementById("notes").value = info.event.extendedProps?.notes || "";
        document.getElementById("recurrence").value = info.event.extendedProps?.recurrence || 'none';
    },


    // Calendar header options - header toolbar
    headerToolbar: {
        left: 'prev,next today clients',
        center: 'title',
        right: 'settings dayGridMonth,timeGridWeek,timeGridDay'
    },
    // Custom buttons
    customButtons: {
        clients: {
            text: 'clients',
            click: function () {
                window.location.href = "/client_list";
            }
        },
        settings: {
            text: '',
            click: function () {
                window.location.href = "/settings"; // Link to settings page
            }
        }
    },
    eventDrop: async function (info) {
        await updateEventTimeOnServer(info.event, info.revert);
        calendar.refetchEvents(); // Force UI to reflect backend changes
    },
    eventResize: async function (info) {
        await updateEventTimeOnServer(info.event, info.revert);
        calendar.refetchEvents(); // Force UI to reflect backend changes
    },
}


)
calendar.render();

document.querySelector('.fc-settings-button').innerHTML = '<img src="/static/img/gear.png" style="height: 16px; vertical-align: middle;" alt="settings">'

let selectedEvent = null;
let selectedTimeInfo = null;


// Event listener function for the Save Button in the modal
async function handleSaveClick() {
    const appointment = document.getElementById("appointmentType").value; // drop down menu with options

    const selectedService = globalServices.find(s => s.name === appointment);
    const eventColor = selectedService?.color || "#999999";

    const startTime = document.getElementById("editStart").value;
    const endTime = document.getElementById("editEnd").value;
    const notes = document.getElementById("notes").value;
    const clientId = document.getElementById("clientDropdown").value;
    
    const clientDropdown = document.getElementById("clientDropdown");
    const clientName = clientDropdown.options[clientDropdown.selectedIndex].text;
    const recurrence = document.getElementById("recurrence").value;
    const sendEmail = document.getElementById("sendEmailCheckbox").checked;


    // Final title to display on calendar
    let fullTitle;
    if (appointment === 'Block Time Off' && notes.trim()) {
        fullTitle = notes.trim() || "Blocked Time"; // use notes as title
    } else {
        fullTitle = `${clientName} - ${appointment}`;
    }

    // Extract date from `selectedTimeInfo`
    // If adding a new event, display clicked date
    let date = selectedTimeInfo ? selectedTimeInfo.startStr.split("T")[0] : (selectedEvent ? selectedEvent.startStr.split("T")[0] : null);
    let isAllDay = document.getElementById("allDayToggle").checked;
    if (!startTime && !endTime) isAllDay = true;
    let start, end;
    
    if (isAllDay) {
        start = date; // just the date string, no time
        end = date;
    } else {
        start = `${date}T${startTime}`;
        end = `${date}T${endTime}`;
    }
    // If no times provided, default to all-day
    

    document.getElementById("allDayToggle").addEventListener("change", function () {
        const timeInputs = [document.getElementById("editStart"), document.getElementById("editEnd")];
        timeInputs.forEach(input => input.disabled = this.checked);
    })

    // Handles form submission
    if (selectedEvent) {
        // Edit an existing event
        // setProp makes the title change correctly, however setExtendedProp causes the title to not change
        selectedEvent.setProp("title", fullTitle);
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
                // Fetch body
                body: JSON.stringify({
                    title: fullTitle,
                    start: start,
                    end: end,
                    allDay: isAllDay,
                    color: eventColor,
                    notes: notes,
                    client_id: clientId,
                    recurrence: recurrence,
                    send_email: sendEmail
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

            // Add 30-minute buffer after the event
            const bufferStart = new Date(end);
            const bufferEnd = new Date(bufferStart.getTime() + 30 * 60 * 1000) // 30 min buffer

            calendar.addEvent({
                title: 'Buffer',
                start: bufferStart.toISOString(),
                end: bufferEnd.toISOString(),
                display: 'background',
                color: 'gray'
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
            if (response.ok) { // Checks if HTTP response status in range of 200-299, indicating success
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

async function populateServicesDropdown() {
    const res = await fetch('/get-services');
    const services = await res.json();
    const dropdown = document.getElementById("appointmentType");

    dropdown.innerHTML = '<option value="">-- Select a service --</option>';
    services.forEach(service => {
        const option = document.createElement("option");
        option.value = service.name;
        option.textContent = service.name;
        dropdown.appendChild(option);
    })
}


// Exit modal
function myModal() {
    const modal = [document.getElementById("modal"), document.getElementById("deleteConfirmModal")];
    const closeModalBtn = document.querySelectorAll(".close-btn");
    closeModalBtn.forEach(btn => {
        btn.addEventListener("click", () => {
            modal.forEach(modal => modal.style.display = "none");
        });
    });
    window.addEventListener("click", (event) => {
        modal.forEach(modal => {
            if (event.target === modal) modal.style.display = "none";
        });
    });
}

// Pure function to delete selected appointment
function deleteAppointment(sendEmail = false) {
    if (!selectedEvent) {
        console.warn("No event selected for deletion");
        alert("Please select an event to delete");
        return;
    }

    // const id = selectedEvent.id;

    fetch('/delete-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: selectedEvent.id,
            send_email: sendEmail
        })
    })
    .then(response => {
        if (response.ok) {
            selectedEvent.remove();
            selectedEvent = null;
            document.getElementById("modal").style.display = "none"; // Close modal
            document.getElementById("appointmentType").value = "";
            document.getElementById("editStart").value = "";
            document.getElementById("editEnd").value = "";
            document.getElementById("notes").value = "";
        } else {
            return response.json().then(err => {
                console.error("Failed to delete on server:", err);
                alert("Failed to delete appointment. Please try again."); 
            });
        }
    })
    .catch(err => {
        console.error("Delete error:", err);
        alert("An error ocurred while deleting the appointment.");
    });
}


document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("save").addEventListener("click", handleSaveClick);
    populateClientDropdown();
    // deleteAppointment();
    populateServicesDropdown();
    myModal();

    const deleteButton = document.getElementById("delete_event");
    if (deleteButton) {
        deleteButton.addEventListener("click", () => {
            if (selectedEvent) {
                document.getElementById("deleteConfirmModal").style.display = "block";
            } else {
                alert("Please select an event to delete.");
            }
        });
    }

    const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener("click", () => {
            const sendEmail = document.getElementById("sendCancelEmail")?.checked || false;
            deleteAppointment(sendEmail);
            document.getElementById("deleteConfirmModal").style.display = "none";
        });
    }

});

window.addEventListener('DOMContentLoaded', () => {
    loadServices(); // Populates globalServices before anything else needs it
})


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

        // Shows the Date/Day you clicked on in the modal's header
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
    events: [
        {
            // title: 'All Day Event',
            // start: '2025-05-11'
        },
        {
            // title: 'Quit Amazon',
            // start: '2025-05-19T07:30:00',
            // end: '2025-05-19T18:00:00'
        }

    ],
    editable: true, // determines if the events can be dragged and resized
    eventStartEditable: true,
    eventColor: 'violet',
});

calendar.render();

let selectedEvent = null;
let selectedTimeInfo = null;

// Event listener for the Save Button in the modal
function handleSaveClick() {
    // const title = document.getElementById("addTitle").value;
    const appointment = document.getElementById("appointmentType").value; // drop down menu with options
    const startTime = document.getElementById("editStart").value;
    const endTime = document.getElementById("editEnd").value;
    const notes = document.getElementById("notes").value;

    // Extract date from `selectedTimeInfo`
    let date = null;

    // If adding a new event, display clicked date
    if (selectedTimeInfo) {
        date = selectedTimeInfo.startStr.split("T")[0]; // "2025-05-21"
    } else if (selectedEvent) {
        date = selectedEvent.startStr.split("T")[0];
    }

    // const start = `${date}T${startTime}`;
    // const end = `${date}T${endTime}`;

    
    const isAllDay = document.getElementById("allDayToggle").checked;
    
    let start, end;
    if (isAllDay) {
        start = date; // just the date string, no time
        end = date;
    } else {
        start = `${date}T${startTime}`;
        end = `${date}T${endTime}`;
    }


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
        // selectedEvent.setProp("title", title);
        // selectedEvent.setExtendedProp("appointment", appointment);
        selectedEvent.setProp("title", appointment); // setProp makes the title change correctly, however setExtendedProp causes the title to not change
        selectedEvent.setDates(start, end, { allDay: isAllDay });
        selectedEvent.setExtendedProp("notes", notes);
        selectedEvent.setProp("color", eventColor); // sets color while editing dynamically
    } else if (selectedTimeInfo) {
        // Create new event
        calendar.addEvent({
            // title: title,
            title: appointment, // You need title to show something more than just the time
            start: start,
            end: end,
            allDay: isAllDay,
            color: eventColor, // Color based on the event
            extendedProps: {
                notes: notes
            }
        });
    }

    // Reset and close the modal
    document.getElementById("modal").style.display = "none";
    selectedEvent = null;
    selectedTimeInfo = null;

    // //clear model fields
    // document.getElementById("addTitle").value = "";
    document.getElementById("appointmentType").value = "";
    document.getElementById("editStart").value = "";
    document.getElementById("editEnd").value = "";
    document.getElementById("notes").value = "";
}

// Function call
document.getElementById("save").addEventListener("click", handleSaveClick);

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
            selectedEvent.remove(); // Deletes event from calendar
            selectedEvent = null; // Reset selection
            // document.getElementById("addTitle").value = "";
            document.getElementById("appointmentType").value = "";
            document.getElementById("editStart").value = "";
            document.getElementById("editEnd").value = "";
            document.getElementById("notes").value = "";
            document.getElementById("modal").style.display = "none"; // close the modal
        }
    });
}

myModal();
deleteAppointment();
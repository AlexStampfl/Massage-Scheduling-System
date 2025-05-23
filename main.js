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

    // SHOW MODAL ON EXISTING EVENT CLICK
    eventClick: function (info) {
        const modal = document.getElementById("modal");
        modal.style.display = "block";

        selectedEvent = info.event;
        selectedTimeInfo = null;

        // Pre-fill modal fields
        document.getElementById("addTitle").value = info.event.title;
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
                alert("Add clients");
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
    eventColor: 'violet'
});

calendar.render();

let selectedEvent = null;
let selectedTimeInfo = null;

// Event listener for the Save Button in the modal
function handleSaveClick() {
    const title = document.getElementById("addTitle").value;
    const startTime = document.getElementById("editStart").value;
    const endTime = document.getElementById("editEnd").value;
    const notes = document.getElementById("notes").value;

    // Extract date from `selectedTimeInfo`
    let date = null;

    // If adding a new event, get clicked date
    if (selectedTimeInfo) {
        date = selectedTimeInfo.startStr.split("T")[0]; // "2025-05-21"
    } else if (selectedEvent) {
        date = selectedEvent.startStr.split("T")[0];
    }

    const start = `${date}T${startTime}`;
    const end = `${date}T${endTime}`;

    if (!title || !start) {
        alert("Title and start time are required.");
        return;
    }

    if (selectedEvent) {
        // Edit an existing event
        selectedEvent.setProp("title", title);
        selectedEvent.setDates(start, end, { allDay: false });
        selectedEvent.setExtendedProp("notes", notes);
    } else if (selectedTimeInfo) {
        // Create new event
        calendar.addEvent({
            title: title,
            start: start,
            end: end,
            allDay: false,
            extendedProps: {
                notes: notes
            }
        });
    }

    // Reset and close the modal
    document.getElementById("modal").style.display = "none";
    selectedEvent = null;
    selectedTimeInfo = null;

    //clear model fields
    document.getElementById("addTitle").value = "";
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

myModal();
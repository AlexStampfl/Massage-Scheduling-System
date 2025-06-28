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
            document.getElementById('buffer_time_after').vaue = data.buffer_time_after;
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
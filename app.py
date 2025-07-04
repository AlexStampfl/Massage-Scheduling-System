# venv\Scripts\activate - to activate your virtual environment
# python app.py

from flask import Flask, jsonify, render_template, request, redirect, url_for
from flask_mail import Mail, Message
from dotenv import load_dotenv
from datetime import datetime
import sqlite3
import os
import re


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "client.db")
load_dotenv()

# Initialize Flask
app = Flask(__name__) # Flask constructor, creates the Flask app

# Mail config
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv('EMAIL_USER')
app.config['MAIL_PASSWORD'] = os.getenv('EMAIL_PASS')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('EMAIL_USER')

mail = Mail(app)

def send_appointment_email(recipient_email, subject, body):
    try:
        msg = Message(subject, recipients=[recipient_email])
        msg.body = body
        mail.send(msg)
        print(f"Email sent to {recipient_email}")
    except Exception as e:
        print(f"Failed to send email: {e}")



def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
              CREATE TABLE IF NOT EXISTS clients (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              first_name TEXT,
              last_name TEXT,
              phone TEXT,
              email TEXT,
              status TEXT
            )
        ''')
    conn.commit()
    conn.close()

# A decorator used to tell the application which URL is associated function
@app.route('/') # Defines the home route(/), # A decoraor to route URL, '/' means the root URL
def index(): # Creates a function bound with '/' route

    conn = sqlite3.connect(DB_PATH)
    
    c = conn.cursor()
    c.execute('SELECT * FROM clients')
    clients = c.fetchall()
    conn.close()
    return render_template('main.html', calendar=calendar)


# POST - Route URL for add-client page
@app.route('/add-client', methods=['POST']) # POST - sends form data to server.
def add_client():
    # Old version
    # first = request.form['first']
    # last = request.form['last']
    # phone = request.form['phone']
    # email = request.form['email']
    # notes = request.form['notes']

    # Santized version
    first = sanitize_input(request.form.get('first'), 50)
    last = sanitize_input(request.form.get('last'), 50)
    phone = sanitize_input(request.form.get('phone'), 20)
    email = sanitize_input(request.form.get('email'), 100)
    notes = sanitize_input(request.form.get('notes'), 500)

    # Backend validation
    if not re.match(r'^\d{10,15}$', phone):
        return "Invalid phone number format", 400
    
    if not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
        return "Invalid email format", 400
    

    print("Adding client:", first, last, phone, email, notes)

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('INSERT INTO clients (first_name, last_name, phone, email, notes) VALUES (?, ?, ?, ?, ?)',
              (first, last, phone, email, notes))
    conn.commit()
    conn.close()
    return redirect('/')

# URL to 'main.html' (home page)
@app.route('/main')
def calendar():
    return render_template('main.html')

# URL to 'client_list.html'
@app.route('/client_list')
def client_list():
    conn = sqlite3.connect(DB_PATH)  # connects to sqlite database file named client.db, conn is the connection object used to talk to db

    c = conn.cursor() # cursor object lets you execute SQL statements (queries) against db
    c.execute('SELECT * FROM clients')
    clients = c.fetchall() # Fetches all rows that query returned, clients is a list of tuples
    conn.close()
    return render_template('client_list.html', clients=clients)


# GET - client details to populate modal input fields
@app.route('/client/<int:id>')
def get_client(id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT first_name, last_name, phone, email, notes FROM clients WHERE id = ?', (id,))
    client = c.fetchone()
    conn.close()
    if client:
        return jsonify({
            'first_name': client[0],
            'last_name': client[1],
            'phone': client[2],
            'email': client[3],
            'notes': client[4],
        })
    else:
        return jsonify({'error': 'Client not found'}), 404


# PUT - method to update data in DB
@app.route('/update-client/<int:client_id>', methods=['PUT'])
def update_client(client_id):
    data = request.get_json()

    # first = data['first']
    # last = data['last']
    # phone = data['phone']
    # email = data['email']
    # notes = data['notes']

    # Sanitize inputs
    first = sanitize_input(data.get('first'), 50)
    last = sanitize_input(data.get('last'), 50)
    phone = sanitize_input(data.get('phone'), 20)
    email = sanitize_input(data.get('email'), 100)
    notes = sanitize_input(data.get('notes'), 500)

    # Validate formats
    if not re.match(r'^\d{10,15}$', phone):
        return "Invalid phone number format", 400
    
    if not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
        return "Invalid email format", 400


    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        UPDATE clients
        SET first_name = ?, last_name = ?, phone = ?, email = ?, notes = ?
        WHERE id = ?
    ''', (first, last, phone, email, notes, client_id))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'}), 200


# DELETE - method to delete client from client list
@app.route('/delete-client/<int:client_id>', methods=['DELETE'])
def delete_client(client_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('DELETE FROM clients WHERE id = ?', (client_id,))
    conn.commit()
    conn.close()
    return jsonify({'status': 'deleted'}), 200


# Temporary to ensure db allows notes
@app.route('/upgrade-db')
def upgrade_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        c.execute('ALTER TABLE events ADD COLUMN appointment_type TEXT')
    except sqlite3.OperationalError:
        pass # Ignore if already exists

    conn.commit()
    conn.close()
    return "Events table upgraded."


# Save events to the database - used to persist events (or edited ones) from calendar UI into backend
@app.route('/add-event', methods=['POST'])
def add_event():
    data = request.get_json()
    print("Incoming data:", data) # For debugging

    send_email = data.get('send_email', False)

    recurrence = data.get('recurrence', 'none')

    try:
        client_id = data.get('client_id') #safely access it
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()

        # appointment_type = data.get('appointment_type', '')
        # color = data.get('color')
        appointment_type = sanitize_input(data.get('appointment_type'), 50)
        color = sanitize_input(data.get('color'), 7)

        # If no color was passed directly, try to get it based on service type
        if not color and appointment_type:
            cursor = conn.cursor()
            cursor.execute("SELECT color FROM services WHERE name = ?", (appointment_type,))
            service_row = cursor.fetchone()
            if service_row:
                color = service_row[0]
            else:
                color = "#999999" # Shouldn't this not be hardcoded??

        print("Saving event:", data)
        # This was a sticking point for me, I need to pay better attention to detail, I didn't have client_id below, and was missing a 7th ?
        c.execute('''
            INSERT INTO events (title, start, end, allDay, color, notes, client_id, recurrence, appointment_type) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
        data['title'],
        data['start'],
        data['end'],
        int(data['allDay']),
        color,
        data['notes'],
        client_id,
        recurrence,
        appointment_type
        ))
        conn.commit()
        event_id = c.lastrowid # get ID of the newly inserted row
        conn.close()
        
        # Email logic
        if send_email:
            from datetime import datetime
            start_dt = datetime.fromisoformat(data['start'])
            date = start_dt.strftime("%A, %B, %d, %Y")
            time = start_dt.strftime("%I:%M %p")

            # Get client's email based on client_id
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute('SELECT EMAIL FROM clients WHERE id=?', (client_id,))
            result = c.fetchone()
            conn.close()

            if result and result[0]:
                recipient = result[0]
                body = f"Hi! Your appointment is confirmed for {date} at {time}."
                subject = 'Appointment Confirmation'
                # recipient = 'stampflLMT@gmail.com'    
                send_appointment_email(recipient, subject, body)
        
        return jsonify({'status': 'success', 'id': event_id})
    
    except Exception as e:
        print("Error saving event:", str(e))
        return jsonify({'status': 'error', 'message': str(e)}), 500




# Used to fetch previously saved events, lets UI display previously saved events
@app.route('/get-events')
def get_events():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
              SELECT e.id, e.title, e.start, e.end, e.allDay, e.notes, e.client_id, e.recurrence,
              c.first_name, c.last_name, e.appointment_type, e.color
        FROM events e
        LEFT JOIN clients c ON e.client_id = c.id
        LEFT JOIN services s ON e.appointment_type = s.name
        ''')
    rows = c.fetchall()
    conn.close()

    events = []
    # print(row)
    for row in rows:
        event_id, title, start, end, all_day, notes, client_id, recurrence, first_name, last_name, appointment_type, color = row
        client_name = f"{first_name or ''} {last_name or ''}".strip()

        fullTitle = title if title else (notes if notes else "Blocked Time")
        
        # Full title shown in calendar
        if client_name and appointment_type:
            fullTitle = f"{client_name} - {appointment_type}"
        elif appointment_type and not title: # fallback if appiontment_type exists but no client
            fullTitle = appointment_type
        elif notes and not title: # use notes if no client or appointment type
            fullTitle = notes
        elif not title:
            fullTitle = "Blocked Time"

        event_color = color if color else "#999999"

        # This was one of the biggest issues I had, and the solution was simple: make sure the columns and indexes match
        events.append({
            'id': event_id,
            'title': fullTitle,
            'start': start,
            'end': end,
            'allDay': all_day,
            'color': color,
            'client_id': client_id,
            'notes': notes,
            'recurrence': recurrence
        })
    print("Events returned:", events) # Debug log
    return jsonify(events)

def create_events_table():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER,
            title TEXT,
            start TEXT,
            end TEXT,
            allDay INTEGER,
            color TEXT,
            notes TEXT,
            appointment_type TEXT
        )
    ''')
    conn.commit()
    conn.close()



# Create settings table
def create_settings_table():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY,
            buffer_time_after INTEGER DEFAULT 0
        )    
    ''')
    # Insert row only if not exists
    cursor.execute('SELECT COUNT(*) FROM settings WHERE id = 1')
    if cursor.fetchone()[0] == 0:
        cursor.execute('INSERT INTO settings (id, buffer_time_after) VALUES (?, ?)', (1, 0))
    conn.commit()
    conn.close()

# Create flask route to fetch and update settings
@app.route('/get-settings', methods=['GET'])
def get_settings():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT buffer_time_after FROM settings WHERE id = 1')
        result = cursor.fetchone()
        conn.close()
        return jsonify({'buffer_time_after': result[0] if result else 0})
    except Exception as e:
        print("Error in /get-settings:", e)
        return jsonify({'error':str(e)}), 500


@app.route('/update-settings', methods=['POST'])
def update_settings():
    data = request.get_json()
    buffer_time_after = data.get('buffer_time_after', 0)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('UPDATE settings SET buffer_time_after = ? WHERE id = 1', (buffer_time_after,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


# Update Event if moved
@app.route('/update-event', methods=['POST'])
def update_event():
    data = request.get_json()
    event_id = data.get('id')
    print(f"Updating event ID: {event_id}, Data: {data}")

    try:
        if not event_id:
            raise ValueError("No event ID provided")
        
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('''
            UPDATE events
            SET title = ?, start = ?, end = ?, allDay = ?, color = ?, notes = ?, client_id = ?, recurrence = ?, appointment_type = ?
            WHERE id = ?
        ''', (
            data.get('title', ""),
            data.get('start'),
            data.get('end'),
            int(bool(data.get('allDay', False))),
            data.get('color', '#999999'),
            data.get('notes', ''),
            data.get('client_id'),
            data.get('recurrence', 'none'),
            data.get('appointment_type', ''),
            event_id
        ))
        if c.rowcount == 0:
            raise ValueError(f"No event found with ID: {event_id}")
        conn.commit()
        conn.close()
        print(f"Event {event_id} updated successfully")
        return jsonify({'status': 'success', 'message': 'Event updated'})
    except Exception as e:
        print("Error updating event:", str(e))
        return jsonify({'status': 'error', 'message': str(e)}), 500


# Delete appointment from client.db's event table
@app.route('/delete-event', methods=['POST'])
def delete_event():
    data = request.get_json()
    event_id = data.get('id')
    send_email = data.get('send_email', False)

    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()

        # Only fetch email if checkbox is checked
        if send_email:
            c.execute('''
                SELECT e.start, c.email
                FROM events e
                JOIN clients c ON e.client_id = c.id
                WHERE e.id = ?
        ''', (event_id,))
            
        row = c.fetchone()

        if row:
            start_time, recipient_email = row

        # result = c.fetchone()

        # if result:
        #     start_time, email = result
            from datetime import datetime
            dt = datetime.fromisoformat(start_time)
            date = dt.strftime("%A, %B, %d, %Y")
            time = dt.strftime("%I:%M %p")

            subject = "Appointment Cancelled"
            body = f"Hi, your appointment on {date} at {time} has been cancelled."
            send_appointment_email(recipient_email, subject, body)


        c.execute('DELETE FROM events WHERE id = ?', (event_id,))
        conn.commit()
        conn.close()
    
        return jsonify({'status': 'deleted'})
    except Exception as e:
        print("Error deleting event:", str(e))
        return jsonify({'status': 'error', 'message': str(e)}), 500


# Get client from DB for appointment
@app.route('/get-clients')
def get_clients():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT id, first_name, last_name FROM clients')
    clients = [{'id': row[0], 'name':f"{row[1]} {row[2]}"} for row in c.fetchall()]
    conn.close()
    return jsonify(clients)


# Settings page
@app.route('/settings')
def settings():
    return render_template('settings.html')


@app.route('/add-service', methods=['POST'])
def add_service():
    data = request.get_json() # Extract JSON data before trying to access data.get
    # name = data['name']
    # color = data.get('color', '#999999')

    name = sanitize_input(data['name'], 50)
    color = sanitize_input(data.get('color'), 7)

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO services (name, color) VALUES (?, ?)", (name, color))
    conn.commit()
    conn.close()
    return jsonify({'status':'success'})

@app.route('/get-services')
def get_services():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, name, color FROM services")
    services = [{'id': row[0], 'name': row[1], 'color': row[2]} for row in c.fetchall()]
    conn.close()
    return jsonify(services)


@app.route('/delete-service', methods=['POST'])
def delete_service():
    service_id = request.json.get('id')
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("DELETE FROM services WHERE id = ?", (service_id,))
        conn.commit()
        conn.close()
        return jsonify({'status':'success'})
    except Exception as e:
        return jsonify({'status':'error', 'message':str(e)}), 500
    

# route for client detail read-only modal in client list page
@app.route('/client/<int:client_id>/details')
def client_details(client_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Get client info
    c.execute('SELECT first_name, last_name, phone, email, notes FROM clients WHERE id = ?', (client_id,))
    client_row = c.fetchone(

    )
    if not client_row:
        conn.close()
        return jsonify({'error': 'Client not found'}), 404

    client_data = {
        'first_name': client_row[0],
        'last_name': client_row[1],
        'phone': client_row[2],
        'email': client_row[3],
        'notes': client_row[4],
        'appointments': []
    }

    # Get appointment history for client
    c.execute('''
        SELECT start, appointment_type
        FROM events
        WHERE client_id = ?
        ORDER BY start DESC
    ''', (client_id,))
    appointments = c.fetchall()

    client_data['appointments'] = []
    for appt in appointments:
        raw_start = appt[0]

        # Fix value format
        if 'T' in raw_start:
            parts = raw_start.split('T')
            if len(parts) >= 3:
                raw_start = f"{parts[0]}T{parts[2]}"

        try:
            # dt = datetime.fromisoformat(appt[0])
            dt = datetime.fromisoformat(raw_start)
            formatted_date = dt.strftime('%A, %B %d, %Y at %I:%M %p')
            print("Raw start value:", appt[0])
        except Exception:
            # formatted_date = appt[0] # fallback to raw string if bad format
            formatted_date = raw_start

        client_data['appointments'].append({
            'date': formatted_date,
            # 'service': appt[1] or 'N/A'
        })

    conn.close()
    return jsonify(client_data)


# Sanitize and validate
def sanitize_input(value, max_length=255):
    if not value:
        return ""
    value = value.strip() # remove leading/trailing whitespace
    value = re.sub(r'[<>]', '', value) # Remove angle brackets to reduce XSS risk
    return value[:max_length]



# End of app
if __name__ == '__main__':
    create_events_table()
    create_settings_table()
    init_db()
    app.run(debug=True) # Runs the app in debug mode



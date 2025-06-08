# venv\Scripts\activate - to activate your virtual environment
# python app.py

from flask import Flask, jsonify, render_template, request, redirect, url_for
import sqlite3
import os


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "client.db")

# Initialize Flask
app = Flask(__name__) # Flask constructor, creates the Flask app


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
    first = request.form['first']
    last = request.form['last']
    phone = request.form['phone']
    email = request.form['email']
    notes = request.form['notes'] # Just added

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

    first = data['first']
    last = data['last']
    phone = data['phone']
    email = data['email']
    notes = data['notes']

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
        c.execute('ALTER TABLE clients ADD COLUMN client_id INTEGER')
    except sqlite3.OperationalError:
        pass # Ignore if already exists

    try:
        c.execute('ALTER TABLE clients ADD COLUMN notes TEXT')
    except sqlite3.OperationalError:
        pass # Ignore if already exists

    conn.commit()
    conn.close()
    return "Database upgraded: client_id and notes columns ensured."


# Save events to the databse - used to persist events (or edited ones) from calendar UI into backend
@app.route('/add-event', methods=['POST'])
def add_event():
    data = request.get_json()
    print("Received data:", data) # For debugging

    try:
        client_id = data.get('client_id') #safely access it
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        # This was a sticking point for me, I need to pay better attention to detail, I didn't have client_id below, and was missing a 7th ?
        c.execute('''
            INSERT INTO events (title, start, end, allDay, color, notes, client_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
        data['title'],
        data['start'],
        data['end'],
        int(data['allDay']),
        data['color'],
        data['notes'],
        client_id
        ))
        conn.commit()
        conn.close()
        return jsonify({'status': 'success'})
    except Exception as e:
        print("Error saving event:", str(e))
        return jsonify({'status': 'error', 'message': str(e)}), 500



# Used to fetch previously saved events, lets UI display previously saved events
@app.route('/get-events')
def get_events():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
              SELECT e.title, e.start, e.end, e.allDay, e.color, e.notes, e.client_id,
              c.first_name, c.last_name
        FROM events e
        LEFT JOIN clients c ON e.client_id = c.id
        ''')
    rows = c.fetchall()
    conn.close()

    events = []
    for row in rows:
        appointment_type = row[0] or ""
        start = row[1]
        end = row[2]
        all_day = bool(row[3])
        color = row[4]
        notes = row[5]
        client_id = row[6]
        first_name = row[7] or ""
        last_name = row[8] or ""
        client_name = f"{first_name} {last_name}".strip()

        # Full title shown in calendar
        full_title = f"{client_name} - {appointment_type}" if client_name else appointment_type


        events.append({
            'title': full_title,
            'start': row[1],
            'end': row[2],
            'allDay': bool(row[3]),
            'color': row[4],
            'extendedProps': {
                'notes': row[5],
                'client_id': client_id,
            }
        })
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
            notes TEXT
        )
    ''')
    conn.commit()
    conn.close()

# Delete appointment from client.db's event table
@app.route('/delete-event', methods=['POST'])
def delete_event():
    data = request.json()
    title = data.get('title')
    start = data.get('start')
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('DELETE FROM events WHERE title = ? and start = ?', (title, start))
    conn.commit()
    conn.close()
    return jsonify({'status': 'deleted'})


# Get client from DB for appointment
@app.route('/get-clients')
def get_clients():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT id, first_name, last_name FROM clients')
    clients = [{'id': row[0], 'name':f"{row[1]} {row[2]}"} for row in c.fetchall()]
    conn.close()
    return jsonify(clients)



# End of app
if __name__ == '__main__':
    create_events_table()
    init_db()
    app.run(debug=True) # Runs the app in debug mode



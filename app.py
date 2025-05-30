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
        c.execute('ALTER TABLE clients ADD COLUMN notes TEXT')
        conn.commit()
        return "Database upgraded successfully!"
    except sqlite3.OperationalError as e:
        return f"Upgrade failed: {e}"
    finally:
        conn.close()


@app.route('/debug-columns')
def debug_columns():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('PRAGMA table_info(clients)')
    columns = c.fetchall()
    conn.close()
    return jsonify([col[1] for col in columns])  # col[1] is the column name



# End of app
if __name__ == '__main__':
    init_db()
    app.run(debug=True) # Runs the app in debug mode



# venv\Scripts\activate - to activate your virtual environment
# python app.py

from flask import Flask, render_template, request, redirect, url_for
import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "client.db")

# Initialize Flask
app = Flask(__name__) # Flask constructor, creates the Flask app


def init_db():
    # conn = sqlite3.connect('client.db')
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

    # conn = sqlite3.connect('client.db')
    conn = sqlite3.connect(DB_PATH)
    
    c = conn.cursor()
    c.execute('SELECT * FROM clients')
    clients = c.fetchall()
    conn.close()
    return render_template('client_list.html', clients=clients)


# Route URL for add-client page
@app.route('/add-client', methods=['POST']) # POST - sends form data to server.
def add_client():
    first = request.form['first']
    last = request.form['last']
    phone = request.form['phone']
    email = request.form['email']

    print("Adding client:", first, last, phone, email)

    # conn = sqlite3.connect('client.db')
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('INSERT INTO clients (first_name, last_name, phone, email) VALUES (?, ?, ?, ?)',
              (first, last, phone, email))
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
    # conn = sqlite3.connect('client.db') # connects to sqlite database file named client.db, conn is the connection object used to talk to db
    conn = sqlite3.connect(DB_PATH)

    c = conn.cursor() # cursor object lets you execute SQL statements (queries) against db
    c.execute('SELECT * FROM clients')
    clients = c.fetchall() # Fetches all rows that query returned, clients is a list of tuples
    conn.close()
    return render_template('client_list.html', clients=clients)



if __name__ == '__main__':
    init_db()
    app.run(debug=True) # Runs the app in debug mode



from flask import Flask, render_template, request, jsonify, send_file
import sys
import os

# Add the parent directory to the system path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.app import app

# This is required for Vercel
app.template_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), '../app/templates'))
app.static_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), '../app/static'))

# Required for Vercel serverless
if __name__ == '__main__':
    app.run()

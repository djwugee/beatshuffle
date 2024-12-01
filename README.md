# Beat Manipulator Flask Application

## Project Structure
```
.
├── api/
│   └── app.py           # Main Flask application (Vercel serverless function)
├── static/
│   └── css/
│       └── styles.css   # Application styles
├── templates/
│   └── index.html       # HTML template
├── beat_manipulator/    # Beat manipulation logic
├── vercel.json         # Vercel configuration
└── requirements.txt    # Python dependencies
```

## Local Development

### Installation

1. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

### Run Locally

Start the Flask development server:
```bash
python api/app.py
```

## Vercel Deployment

### Prerequisites

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

### Deployment Steps

1. Ensure your project structure matches the above layout:
   - Flask application in `api/app.py`
   - Static files in `static/`
   - Templates in `templates/`

2. Deploy to Vercel:
```bash
vercel
```

3. For production deployment:
```bash
vercel --prod
```

### Important Files

- `api/app.py`: Main Flask application (Vercel serverless function)
- `vercel.json`: Configures build settings and routing for both static files and the Python application
- `requirements.txt`: Python package dependencies

### Notes
- The application uses Python runtime on Vercel
- Static files are served directly by Vercel's CDN
- Templates are served through the Flask application
- FFmpeg is required for audio processing
- Temporary files are handled in-memory for Vercel's serverless environment

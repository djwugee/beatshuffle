# Beat Manipulator Flask Application

## Project Structure
```
.
├── index.py            # Main Flask application (Vercel entry point)
├── app/
│   ├── static/        # Static files (CSS, JS)
│   └── templates/     # HTML templates
├── beat_manipulator/   # Beat manipulation logic
├── vercel.json        # Vercel configuration
└── requirements.txt   # Python dependencies
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
python index.py
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

1. Make sure your project structure matches the one described above:
   - `index.py` in the root directory
   - Static files in `app/static/`
   - Templates in `app/templates/`

2. Deploy to Vercel:
```bash
vercel
```

3. For production deployment:
```bash
vercel --prod
```

### Important Files

- `index.py`: Main Flask application and Vercel entry point
- `vercel.json`: Configures build settings and routing
- `requirements.txt`: Python package dependencies

### Notes
- The application uses the Python runtime on Vercel
- Static files and templates are served from the `app` directory
- FFmpeg is required for audio processing
- Temporary files are handled in-memory for Vercel's serverless environment

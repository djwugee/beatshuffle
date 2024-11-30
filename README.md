# Flask Application

## Local Development

### Installation

To install the required dependencies, run:

```bash
pip install -r requirements.txt
```

### Run Locally

To run the application locally:

```bash
python app/app.py
```

## Deploying to Vercel

### Prerequisites

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

### Deployment

1. Deploy to Vercel:
```bash
vercel
```

2. For production deployment:
```bash
vercel --prod
```

### Project Structure

The project is configured for Vercel deployment with:
- `vercel.json` - Defines build and routing configuration
- `requirements.txt` - Python dependencies
- `app/app.py` - Main Flask application

### Notes
- The application uses Python runtime on Vercel
- All routes are automatically handled through the Flask application
- Static files and templates are served from the `app` directory

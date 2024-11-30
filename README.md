# Beat Manipulator Flask Application

## Project Structure
```
.
├── api/
│   └── index.py          # Vercel serverless function entry point
├── app/
│   ├── app.py           # Main Flask application
│   ├── static/          # Static files (CSS, JS)
│   └── templates/       # HTML templates
├── vercel.json          # Vercel configuration
└── requirements.txt     # Python dependencies
```

## Local Development

### Installation

Install the required dependencies:

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

### Deployment Steps

1. Initial deployment:
```bash
vercel
```

2. Production deployment:
```bash
vercel --prod
```

### Configuration Files

The project includes specific configuration for Vercel deployment:

- `vercel.json`: Configures the build and routing
- `api/index.py`: Serverless function entry point
- `requirements.txt`: Python dependencies

### Notes
- The application uses Python runtime on Vercel
- Static files and templates are served from the `app` directory
- All routes are handled through the Flask application in `api/index.py`

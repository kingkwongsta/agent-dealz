# Agent Dealz

AI-powered price research agent that finds the best deals on any product. Uses [smolagents](https://github.com/huggingface/smolagents) to orchestrate web search and scraping via code execution, powered by LLMs through [OpenRouter](https://openrouter.ai/).

## Architecture

- **Backend**: Python (FastAPI + smolagents) on Google Cloud Run
- **Frontend**: Next.js dashboard on Vercel
- **Database**: Cloud Firestore
- **LLM**: OpenRouter (model-agnostic)

## How It Works

1. You enter a product name (e.g. "Sony WH-1000XM5")
2. The agent searches the web for retailers selling the product
3. It scrapes actual prices from each retailer page
4. Results are ranked by price and displayed in a comparison dashboard

## Setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
cp .env.example .env  # fill in your keys
uvicorn app.main:app --reload --port 8080
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local  # fill in backend URL
npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key |
| `GCP_PROJECT_ID` | Google Cloud project ID (for Firestore) |
| `OPENROUTER_MODEL` | LLM model to use (default: `anthropic/claude-sonnet-4`) |

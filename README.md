# NoMoreWaste 🥦

A smart food waste tracker that helps you monitor your groceries and reduce waste. Scan your receipts and let AI extract items automatically!

![No Food Waste App](https://img.shields.io/badge/Status-Active-success)
![React](https://img.shields.io/badge/React-18-blue)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-purple)

## Features

- 📸 **AI Receipt Scanning** - Upload receipt photos and OpenAI extracts items automatically
- 🗓️ **Expiry Tracking** - Monitor food freshness with countdown timers
- 💰 **Waste Analytics** - Track the financial impact of food waste
- 📊 **Smart Categories** - Automatic categorization (Produce, Dairy, Meat, etc.)
- 💾 **Local Storage** - Your data persists across sessions

## Tech Stack

- **Frontend**: React 18 with Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **AI**: OpenAI GPT-4o-mini Vision API
- **Storage**: Browser LocalStorage

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- OpenAI API key with access to GPT-4o-mini

### Installation

1. Clone the repository:
```bash
git clone https://github.com/tylertzm/nomorewaste.git
cd nomorewaste
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file and add your OpenAI API key:
```bash
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser to `http://localhost:5173`

## Usage

1. **Scan Receipt**: Click the "SCAN RECEIPT" button
2. **Upload Photo**: Choose a clear photo of your grocery receipt
3. **Verify Items**: Review and edit the AI-extracted items
4. **Track Food**: Monitor expiry dates and mark items as consumed or wasted
5. **View Analytics**: Switch to the "Wastage" tab to see your waste statistics

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
nomorewaste/
├── src/
│   ├── App.jsx          # Main application component
│   ├── main.jsx         # React entry point
│   └── index.css        # Global styles
├── index.html           # HTML entry point
├── package.json         # Dependencies
├── vite.config.js       # Vite configuration
└── tailwind.config.js   # Tailwind configuration
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_OPENAI_API_KEY` | OpenAI API key for receipt scanning | Yes |

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ to reduce food waste

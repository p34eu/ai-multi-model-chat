# AI Multi-Model Chat

An intelligent tool for comparing responses from multiple AI models in real-time. Allows simultaneous querying of multiple models and visual comparison of results.

[![CI](https://github.com/p34eu/ai-multi-model-chat/actions/workflows/ci.yml/badge.svg)](https://github.com/p34eu/ai-multi-model-chat/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/p34eu/ai-multi-model-chat/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)](https://github.com/p34eu/ai-multi-model-chat/actions/workflows/ci.yml)
[![Performance](https://github.com/p34eu/ai-multi-model-chat/actions/workflows/performance.yml/badge.svg)](https://github.com/p34eu/ai-multi-model-chat/actions/workflows/performance.yml)

## 🚀 Features

- **Multi-Provider Support**: Compare models from Groq, OpenAI, Anthropic, Google AI, Mistral, and Cohere
- **Smart Model Filtering**: Automatically filters out non-chat models (embeddings, audio, vision-only, etc.) to show only chat-capable models
- **Provider Status Indicators**: Visual indicators showing active providers (with API keys) and inactive providers (with setup instructions)
- **Collapsible Provider Groups**: Organize and manage models by provider with expand/collapse functionality and state persistence
- **Multiple AI Models**: Support for 64+ chat-capable models (Llama, Gemma, Qwen, Mixtral, GPT, Claude, Gemini, Mistral, Cohere, etc.)
- **Real-time Comparison**: Simultaneous querying of all models with streaming responses
- **Performance Comparison**: Response time tracking and speed indicators
- **Query History**: Saving and reviewing previous questions
- **Model Caching**: 10-minute cache for model data to improve performance
- **Rate Limiting**: Security protection against excessive requests
- **Markdown Support**: Automatic recognition and rendering of tables
- **Internationalization**: Bulgarian and English language support for UI
- **Responsive Design**: Works on different devices
- **Consistent Icons**: SVG icons for all elements

## 🛠️ Technologies

- **Backend**: Node.js v20+, Express.js
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **AI Integration**: Multi-provider support (Groq, OpenAI, Anthropic, Google AI, Mistral, Cohere) with dynamic API key loading
- **Model Filtering**: Intelligent filtering system to show only chat-capable models
- **Authentication**: Provider-specific auth methods (Bearer tokens, custom headers, query parameters)
- **Images**: Sharp for favicon generation
- **Tests**: Node.js built-in test runner
- **Process Management**: PM2 for production deployment

## 📦 Installation

1. Clone the repository:
```bash
git clone  https://github.com/p34eu/ai-multi-model-chat.git
cd ai-multi-model-chat
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your API keys (at least one provider required):
**Note**: You only need to configure the API keys for the providers you want to use. The application will automatically detect and use all configured providers.
OpenAI and Google almost immediately hit the quota.
   
```env
# Groq (Fast inference, Llama/Gemma models)
GROQ_API_KEY=your_groq_api_key_here

# OpenAI (GPT models) - Optional
OPENAI_API_KEY=your_openai_api_key_here

# Anthropic (Claude models) - Optional
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Google AI (Gemini models) - Optional
GOOGLE_API_KEY=your_google_ai_api_key_here

# Mistral AI - Optional
MISTRAL_API_KEY=your_mistral_api_key_here

# Cohere - Optional
COHERE_API_KEY=your_cohere_api_key_here
```


4. Start the application:
```bash
npm start
```

The application will be available at `http://localhost:3003`

## 🧪 Tests

To run the tests:
```bash
npm test
```

## � CI/CD

This project uses GitHub Actions for continuous integration and deployment:

- **CI Pipeline**: Automated testing on multiple Node.js versions
- **CodeQL**: Security vulnerability scanning
- **Dependency Review**: Automated dependency security checks- **Performance Monitoring**: Lighthouse performance, accessibility, and SEO checks- **Release Automation**: Automated releases on version tags
- **Stale Management**: Automatic cleanup of inactive issues/PRs
- **Dependabot**: Automated dependency updates

## �📁 Project Structure

```
├── public/           # Frontend files
│   ├── index.html    # Main page with provider grouping UI
│   ├── style.css     # Styles with provider group styling
│   ├── app.js        # Client logic with collapse/expand functionality
│   └── favicon.png   # Icon
├── routes/           # API routes
│   ├── models.js     # Models endpoint with smart filtering
│   └── chat.js       # Chat endpoint with streaming support
├── server.js         # Main server file
├── test.js           # Tests
├── SECURITY.md       # Security policy
├── package.json      # Dependencies
└── .gitignore        # Ignored files
```

## 🎯 Usage

1. Open the application in the browser
2. Select models from the sidebar (organized by provider)
3. Enter a question in the top field
4. Click "Compare all models"
5. View the results in the table below

### Provider Management

- **Active Providers**: Show green checkmarks and list available models
- **Inactive Providers**: Show red indicators with setup instructions for missing API keys
- **Model Filtering**: Only chat-capable models are displayed (embeddings, audio, vision-only models are automatically filtered out)
- **Provider Groups**: Collapse/expand provider sections to organize the interface

### Supported Models

The application automatically filters and displays only chat-capable models from all configured providers:

- **Groq**: 13 models (Llama, Qwen, Mixtral variants)
- **OpenAI**: 36 models (GPT-4, GPT-4o, GPT-4o-mini variants)
- **Anthropic**: 7 models (Claude-3 variants)
- **Google AI**: 8 models (Gemini variants)
- **Mistral**: 9 models (inactive - requires API key)
- **Cohere**: 9 models 

## 🤝 Contributing

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please use the provided issue and PR templates when contributing.

## 📋 Community Guidelines

- **Code of Conduct**: See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- **Contributing Guide**: See [CONTRIBUTING.md](CONTRIBUTING.md)
- **Security Policy**: See [SECURITY.md](SECURITY.md)
- **Issue and PR Templates**: Standardized formats for contributions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**JQ** - [ https://github.com/p34eu]( https://github.com/p34eu)

## 🙏 Acknowledgments

- [Groq](https://groq.com/) for AI API
- [Express.js](https://expressjs.com/) for web framework
- [Sharp](https://sharp.pixelplumbing.com/) for image processing

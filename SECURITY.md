# Security Policy

## Supported Versions

We actively support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it to us as follows:

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report security vulnerabilities by emailing:
- [jq@p34.eu](mailto:jq@p34.eu)

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

Please include the following information in your report:
- A clear description of the vulnerability
- Steps to reproduce the issue
- Potential impact of the vulnerability
- Any suggested fixes or mitigations

## Security Best Practices

When using this application, please follow these security best practices:

1. **API Keys**: Never commit API keys to version control
2. **Environment Variables**: Use `.env` files for sensitive configuration
3. **Dependencies**: Keep dependencies updated to latest secure versions
4. **Rate Limiting**: The application includes rate limiting to prevent abuse
5. **HTTPS**: Always use HTTPS in production environments

## Responsible Disclosure

We kindly ask that you:
- Give us reasonable time to fix the issue before public disclosure
- Avoid accessing or modifying user data
- Do not perform DoS attacks or degrade service performance
- Do not spam our systems with automated tools

We will acknowledge your contribution to security and may include you in our Hall of Fame (if we create one) or provide other forms of recognition.

Thank you for helping keep our project and its users safe!
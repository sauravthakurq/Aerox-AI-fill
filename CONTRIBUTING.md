# Contributing to Aerox AI Fill

Thank you for your interest in contributing to Aerox AI Fill! It's people like you that make open source such a powerful community to learn, inspire, and create.

We want to make the contribution process as seamless and straightforward as possible, ensuring developers worldwide can build upon our intelligence layer for web forms.

## How to Contribute

We follow standard GitHub Flow for contributions:

1. **Fork the Repository**: Start by forking the `aerox-ai-fill` repository to your GitHub account.
2. **Clone Locally**: Clone your fork to your local machine.
3. **Create a Branch**: Always create a descriptively named branch from `main`. 
   `git checkout -b feature/awesome-new-capability` or `git checkout -b fix/auth-token-bug`
4. **Make Your Changes**: Write your code, ensuring you follow our style guidelines below.
5. **Commit**: Make small, incremental commits with descriptive messages.
6. **Push and PR**: Push your branch to your fork and submit a Pull Request (PR) to our original repository. Note your PR's intent clearly and link any related issues.

## Code Guidelines

To keep the project lightweight and performant:
- **Zero-Dependency Core**: We rely on Vanilla JavaScript (ES6+), HTML, and CSS. Avoid bringing in external libraries (like React, Tailwind, or jQuery) unless absolutely critical and discussed via an Issue first.
- **Clean File Structure**: Logic separating UI events (`popup.js`) and API calls (`background.js`) must be respected. Do not leak background computations into the front-end popup controller.
- **Variable Naming**: Use standard `camelCase` for JS variables and functions. Use semantic, readable naming (e.g., `extractContextFromPdf`).
- **Styling**: Prefix visual updates with appropriate semantic CSS class names. Ensure the Apple-esque glassmorphism theme (`popup.css`) remains consistent.

## Commit Message Style

We adhere to the [Conventional Commits](https://www.conventionalcommits.org/) format to maintain a readable log.

*   `feat: add Anthropic API support` (New feature)
*   `fix: resolve auto-fill misfire on select tags` (Bug fix)
*   `docs: update API key configuration guide` (Documentation changes)
*   `refactor: clean up PDF slicing logic` (No bug fix, no feature)
*   `chore: remove deprecated unused assets` (Maintenance)

## Reporting Bugs

If you find a bug, please create an Issue using the GitHub issue tracker and include:
1. **Description**: What is the expected behavior vs. the actual behavior?
2. **Steps to Reproduce**: Detailed steps on how our team can reproduce the error.
3. **Environment**: Browser version and the LLM API provider you were using.

## Feature Requests

Have an idea to make Aerox better? We’d love to hear it! Open a new Issue labeled **[Feature Request]** and detail:
- The problem you are trying to solve.
- Your proposed solution or capability.

## Code of Conduct

We are committed to providing a welcoming, inclusive, and professional environment. 
- Use welcoming and inclusive language.
- Be respectful of differing viewpoints and experiences.
- Gracefully accept constructive criticism during code reviews.

Thanks again for helping us build the ultimate auto-fill experience!

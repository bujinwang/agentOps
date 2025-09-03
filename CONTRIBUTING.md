# Contributing to Real Estate CRM

We love your input! We want to make contributing to Real Estate CRM as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

## Pull Requests

Pull requests are the best way to propose changes to the codebase. We actively welcome your pull requests:

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Development Setup

### Prerequisites
- Node.js (>=16)
- React Native development environment
- PostgreSQL database
- n8n instance

### Local Development

1. **Clone your fork**
   ```bash
   git clone https://github.com/yourusername/real-estate-crm.git
   cd real-estate-crm
   ```

2. **Install dependencies**
   ```bash
   cd frontend
   npm install
   cd ios && pod install && cd .. # iOS only
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

4. **Start the database**
   ```bash
   docker-compose up -d postgres
   ```

5. **Run the app**
   ```bash
   npm start
   npm run ios # or npm run android
   ```

## Code Style

### TypeScript
- We use TypeScript for type safety
- All new code should include proper type definitions
- Avoid `any` types - use specific interfaces instead

### React Native
- Follow React Native best practices
- Use functional components with hooks
- Implement proper error boundaries

### Naming Conventions
- Use PascalCase for component names
- Use camelCase for variables and functions
- Use UPPER_SNAKE_CASE for constants
- Use kebab-case for file names (except components)

### Code Organization
```
src/
├── components/     # Reusable UI components
├── contexts/      # React Context providers
├── hooks/         # Custom React hooks
├── navigation/    # Navigation configuration
├── screens/       # Screen components
├── services/      # API and external services
├── types/         # TypeScript type definitions
└── utils/         # Utility functions
```

## Testing

### Unit Tests
- Write unit tests for utility functions
- Test custom hooks with React Testing Library
- Test components with meaningful interactions

### Integration Tests
- Test API integrations
- Test offline sync functionality
- Test navigation flows

### Running Tests
```bash
npm test                 # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

## API Development

### n8n Workflows
- Keep workflows modular and reusable
- Include proper error handling
- Document webhook URLs and parameters
- Test with sample data

### Database Changes
- Update `schema.sql` for schema changes
- Create migration scripts if needed
- Test with seed data
- Consider data validation

## Documentation

### Code Comments
- Write clear, concise comments
- Document complex business logic
- Explain non-obvious code decisions

### API Documentation
- Update `api_contracts_and_workflows.md` for API changes
- Include request/response examples
- Document error scenarios

### README Updates
- Keep installation instructions current
- Update feature lists for new functionality
- Add screenshots for UI changes

## Issue Reporting

### Bug Reports
Please include:
- Device/OS version
- App version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Console logs if available

### Feature Requests
Please include:
- Clear description of the feature
- Use case or problem it solves
- Mockups or examples if helpful
- Any implementation considerations

## Security

### Security Best Practices
- Never commit secrets or API keys
- Use environment variables for configuration
- Validate all user inputs
- Follow JWT best practices for authentication
- Report security vulnerabilities privately

### Reporting Security Issues
Please report security vulnerabilities to [security@yourdomain.com] instead of opening public issues.

## Performance

### Mobile Performance
- Optimize images and assets
- Use lazy loading for large lists
- Implement proper caching
- Monitor bundle size

### Database Performance
- Use appropriate indexes
- Optimize queries
- Consider pagination for large datasets

## Accessibility

- Follow React Native accessibility guidelines
- Provide meaningful labels and hints
- Test with screen readers
- Support high contrast modes

## Commit Messages

Use clear and meaningful commit messages:

```
feat: add lead scoring algorithm
fix: resolve offline sync conflict resolution
docs: update API documentation
style: format code according to style guide
refactor: reorganize settings context
test: add unit tests for validation utils
```

## Review Process

### Before Submitting
- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] Documentation is updated
- [ ] No security vulnerabilities introduced
- [ ] Performance impact considered

### Review Criteria
We look for:
- Code quality and readability
- Test coverage for new features
- Documentation completeness
- Security considerations
- Performance implications

## Community Guidelines

### Be Respectful
- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what is best for the community

### Be Collaborative
- Help newcomers get started
- Share knowledge and best practices
- Provide constructive feedback
- Celebrate others' contributions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Don't hesitate to ask! Open an issue with the "question" label or start a discussion in our GitHub Discussions.

---

Thank you for contributing to Real Estate CRM! 🚀
Run these integration tests with Node's built-in test runner.

Example:

    # ensure server is running (pm2 start p34.eu)
    node --test tests/groq.test.js

Or run all tests (requires Node test runner to discover files):

    node --test tests

Each test will be skipped if the server is not responding or returns a non-OK status.
